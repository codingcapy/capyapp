import { useEffect, useRef, useState } from "react";
import { Message } from "../../../schemas/messages";
import { Friend } from "../lib/api/friend";
import useAuthStore from "../store/AuthStore";
import profilePic from "/capypaul01.jpg";
import { FaReply } from "react-icons/fa";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserByUserIdQueryOptions } from "../lib/api/chat";
import { UserFriend } from "../../../schemas/userfriends";
import { PiSmiley } from "react-icons/pi";
import emojis from "../emojis/emojis";
import {
  useCreateReactionMutation,
  useDeleteReactionMutation,
} from "../lib/api/reaction";
import { Reaction } from "../../../schemas/reactions";
import { Chat } from "../../../schemas/chats";
import { socket } from "../routes/dashboard";
import { ImageMessage } from "../../../schemas/images";

export default function MessageFriend(props: {
  message: Message;
  friends: Friend[];
  setFriend: (state: Friend | null) => void;
  replyMode: boolean;
  setReplyMode: (state: boolean) => void;
  setReplyContent: (state: string) => void;
  participants: Friend[] | undefined;
  userFriends: UserFriend[] | undefined;
  reactions: Reaction[] | undefined;
  chat: Chat | null;
  clickedFriend: (state: Friend) => void;
  handleCreateReaction: (
    e: React.FormEvent<HTMLFormElement>,
    message: Message | null
  ) => void;
  images: ImageMessage[] | undefined;
}) {
  const {
    message,
    friends,
    setReplyMode,
    setFriend,
    setReplyContent,
    participants,
    userFriends,
    reactions,
    chat,
    clickedFriend,
    handleCreateReaction,
    images,
  } = props;
  const friend = friends.find((friend) => friend.userId === message.userId);
  const participantReply = participants?.find(
    (participant) => participant.userId === message.replyUserId
  );
  const participant = participants?.find(
    (participant) => participant.userId === message.userId
  );
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isExternal = !friend && !participant && message.userId !== user?.userId;
  const { data: externalUser, isSuccess: hasExternalUser } = useQuery({
    ...getUserByUserIdQueryOptions(message.userId),
    enabled: isExternal,
  });
  const userFriend =
    userFriends &&
    friend &&
    userFriends?.find((userFriend) => friend?.email == userFriend?.friendEmail);
  const isBlocked = userFriend && userFriend.blocked;
  const [emojiMode, setEmojiMode] = useState(false);
  const emojisRef = useRef<HTMLDivElement>(null);
  const { mutate: createReaction } = useCreateReactionMutation();
  const { mutate: deleteReaction } = useDeleteReactionMutation();
  const ref = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  } | null>(null);

  const handleClickOutsideEmojis = (event: MouseEvent) => {
    if (
      emojisRef.current &&
      !emojisRef.current.contains(event.target as Node)
    ) {
      setEmojiMode(false);
    }
  };

  function handleDeleteReaction(id: number) {
    const reactionId = id;
    deleteReaction(
      {
        chatId: chat!.chatId,
        reactionId,
      },
      {
        onSuccess: (result) => {
          socket.emit("reaction", result);
        },
      }
    );
    setEmojiMode(false);
  }

  useEffect(() => {
    if (friend || participant) {
      queryClient.invalidateQueries({ queryKey: ["users", message.userId] });
    }
  }, [friend, participant, message.userId, queryClient]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEmojiMode(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutsideEmojis);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideEmojis);
    };
  }, []);

  useEffect(() => {
    socket.on("reaction", (data) => {
      queryClient.invalidateQueries({ queryKey: ["reactions", chat?.chatId] });
    });
    return () => {
      socket.off("connect");
      socket.off("reaction");
    };
  }, []);

  function renderMessageContent(content: string) {
    if (!participants) return content;
    // Build a regex dynamically from participant names
    const names = participants.map((p) => p.username).join("|");
    const mentionRegex = new RegExp(`@(${names})`, "g");
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const [fullMatch, name] = match;
      const startIndex = match.index;
      // Push the text before the mention
      if (startIndex > lastIndex) {
        parts.push(content.slice(lastIndex, startIndex));
      }
      // Find the participant object
      const participant = participants.find((p) => p.username === name);
      if (participant) {
        parts.push(
          <span
            key={`${name}-${startIndex}`}
            onClick={() => clickedFriend(participant)}
            className="text-[#06b6d4] hover:cursor-pointer"
          >
            {fullMatch}
          </span>
        );
      } else {
        // If no participant found, render as plain text
        parts.push(fullMatch);
      }
      lastIndex = startIndex + fullMatch.length;
    }
    // Push remaining text after the last mention
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    return parts;
  }

  return (
    <div className={`${isBlocked && "hidden"} hover:bg-zinc-800 group`}>
      {message.replyContent &&
        (message.replyUserId === user?.userId ? (
          <div className="text-gray-400 pt-2 pl-10">
            <div className="flex cursor-pointer">
              <img
                src={user.profilePic || profilePic}
                className="w-[20px] h-[20px]  rounded-full mx-2"
                onClick={() => clickedFriend(user)}
              />
              <span
                className="font-bold pr-2"
                onClick={() => clickedFriend(user)}
              >
                @{user.username}
              </span>{" "}
              {message.replyContent}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 pt-2 pl-10">
            <div className="flex cursor-pointer">
              <img
                src={
                  (participantReply && participantReply.profilePic) ||
                  profilePic
                }
                className="w-[20px] h-[20px] rounded-full mx-2"
                onClick={() =>
                  participantReply && clickedFriend(participantReply)
                }
              />
              <span
                className="font-bold pr-2 hover:cursor-pointer hover:underline"
                onClick={() =>
                  participantReply && clickedFriend(participantReply)
                }
              >
                @{participantReply && participantReply.username}
              </span>{" "}
              {message.replyContent}
            </div>
          </div>
        ))}
      <div
        className={`${message.replyContent ? "px-3 pb-3" : "p-3"} flex transition-all ease duration-300`}
      >
        <img
          src={
            friend?.profilePic ??
            participant?.profilePic ??
            externalUser?.profilePic ??
            profilePic
          }
          className="w-[40px] h-[40px] rounded-full mr-2 cursor-pointer"
          onClick={() =>
            friend
              ? clickedFriend(friend)
              : participant
                ? clickedFriend(participant)
                : externalUser
                  ? clickedFriend(externalUser)
                  : ""
          }
        />
        <div className="w-[100%]">
          <div className="flex justify-between">
            <div className="flex">
              <div
                className="font-bold px-1 hover:cursor-pointer hover:underline"
                onClick={() =>
                  friend
                    ? clickedFriend(friend)
                    : participant
                      ? clickedFriend(participant)
                      : externalUser
                        ? clickedFriend(externalUser)
                        : ""
                }
              >
                {friend !== undefined
                  ? friend.username
                  : participant !== undefined
                    ? participant.username
                    : externalUser
                      ? externalUser.username
                      : ""}
              </div>
              <div className="pl-2 text-gray-400">
                on {message.createdAt.toString().slice(0, 25)}
              </div>
            </div>
            <div className="flex">
              <div className="cursor-pointer mx-2 hidden group-hover:flex opacity-100 transition-opacity">
                <PiSmiley size={22} onClick={() => setEmojiMode(!emojiMode)} />
              </div>
              <div
                onClick={() => {
                  setReplyMode(true);
                  setFriend(friend || null);
                  setReplyContent(message.content.toString());
                }}
                className="cursor-pointer px-2 pr-5 hidden group-hover:flex opacity-100 transition-opacity"
              >
                <FaReply size={20} className="" />
              </div>
            </div>
          </div>
          <div className="overflow-wrap break-word">
            {renderMessageContent(message.content)}
          </div>
          {images &&
            images.map(
              (image) =>
                image.messageId === message.messageId && (
                  <img
                    src={`https://${image.imageUrl}`}
                    className="w-[50%] mt-[10px]"
                    key={image.imageId}
                  />
                )
            )}
          <div className="flex">
            {Object.entries(
              reactions
                ?.filter((reaction) => reaction.messageId === message.messageId)
                .reduce<Record<string, Reaction[]>>((acc, reaction) => {
                  if (!acc[reaction.content]) acc[reaction.content] = [];
                  acc[reaction.content].push(reaction);
                  return acc;
                }, {}) || {}
            ).map(([content, groupedReactions]) => {
              const count = groupedReactions.length;
              const userReaction = groupedReactions.find(
                (r) => r.userId === user?.userId
              );
              return (
                <div
                  key={content}
                  onClick={() => {
                    const messageId = message.messageId;
                    const chatId = chat?.chatId || 0;
                    const userId = user?.userId || "";

                    if (userReaction) {
                      handleDeleteReaction(userReaction.reactionId);
                    } else {
                      createReaction({
                        messageId,
                        chatId,
                        userId,
                        content,
                      });
                    }
                  }}
                  className={`flex items-center px-2 py-[1px] rounded m-1 cursor-pointer ${
                    userReaction
                      ? "bg-[#285684] border border-[#0080ff]"
                      : "bg-[#3b3b3b]"
                  }`}
                  title={
                    userReaction
                      ? "Click to remove your reaction"
                      : "React to this message"
                  }
                >
                  <div className="mr-1">{content}</div>
                  <div className="text-xs">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {emojiMode && (
        <div
          className={`fixed bottom-[250px] right-[13%] md:right-[30%] z-50 grid grid-cols-5 md:grid-cols-9 gap-2 text-xl bg-zinc-800 p-3 rounded`}
          ref={emojisRef}
        >
          {emojis.map((emoji) => (
            <form
              onSubmit={(e) => {
                handleCreateReaction(e, message);
                setEmojiMode(false);
              }}
              key={emoji}
            >
              <input
                type="text"
                defaultValue={emoji}
                name="content"
                className="hidden"
              />
              <button
                type="submit"
                className="cursor-pointer hover:bg-zinc-700"
              >
                {emoji}
              </button>
            </form>
          ))}
        </div>
      )}
      {contextMenu?.visible && (
        <div
          className="absolute bg-[#1A1A1A] p-2 z-[99] border border-[#555555] rounded"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button className="block px-4 py-2 hover:bg-[#373737] w-full text-left ">
            Reply
          </button>
          <button className="block px-4 py-2 hover:bg-[#373737] w-full text-left ">
            Add Reaction
          </button>
          <button className="block px-4 py-2 hover:bg-[#373737] w-full text-left text-red-400">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

import { Message } from "../../../schemas/messages";
import { Friend } from "../lib/api/friend";
import useAuthStore from "../store/AuthStore";
import profilePic from "/capypaul01.jpg";
import { MdModeEditOutline } from "react-icons/md";
import { FaTrashCan } from "react-icons/fa6";
import { FaReply } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import {
  useDeleteMessageMutation,
  useUpdateMessageMutation,
} from "../lib/api/messages";
import { PiSmiley } from "react-icons/pi";
import emojis from "../emojis/emojis";
import { Reaction } from "../../../schemas/reactions";
import { Chat } from "../../../schemas/chats";
import {
  useCreateReactionMutation,
  useDeleteReactionMutation,
} from "../lib/api/reaction";
import { socket } from "../routes/dashboard";
import { useQueryClient } from "@tanstack/react-query";

export default function MessageComponent(props: {
  message: Message;
  friends: Friend[];
  setFriend: (state: Friend | null) => void;
  replyMode: boolean;
  setReplyMode: (state: boolean) => void;
  setReplyContent: (state: string) => void;
  participants: Friend[] | undefined;
  reactions: Reaction[] | undefined;
  chat: Chat | null;
}) {
  const { user } = useAuthStore();
  const {
    message,
    setReplyMode,
    setFriend,
    setReplyContent,
    participants,
    reactions,
    chat,
  } = props;
  const participantReply = participants?.filter(
    (participant) => participant.userId === message.replyUserId
  );
  const participant = participants?.filter(
    (participant) => participant.userId === message.userId
  );
  const username = user && user.username.toString();
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [deleteMode, setDeleteMode] = useState(false);
  const { mutate: deleteMessage } = useDeleteMessageMutation();
  const { mutate: updateMessage } = useUpdateMessageMutation();
  const [emojiMode, setEmojiMode] = useState(false);
  const emojisRef = useRef<HTMLDivElement>(null);
  const { mutate: createReaction } = useCreateReactionMutation();
  const { mutate: deleteReaction } = useDeleteReactionMutation();
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setReplyMode(false);
        setEditMode(false);
        setDeleteMode(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    deleteMessage({ messageId: (message && message.messageId) || 0 });
    setDeleteMode(false);
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const messageContent = (e.target as HTMLFormElement).content.value;
    updateMessage({
      messageId: (message && message.messageId) || 0,
      content: messageContent,
    });
    setEditMode(false);
  }

  function handleCreateReaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const messageId = message.messageId;
    const chatId = (chat && chat.chatId) || 0;
    const userId = (user && user.userId) || "";
    const reactionContent = (e.target as HTMLFormElement).content.value;
    createReaction({
      messageId,
      chatId,
      userId,
      content: reactionContent,
    });
    setEmojiMode(false);
  }

  function handleDeleteReaction(id: number) {
    const reactionId = id;
    deleteReaction({
      chatId: chat!.chatId,
      reactionId,
    });
    setEmojiMode(false);
  }

  const handleClickOutsideEmojis = (event: MouseEvent) => {
    if (
      emojisRef.current &&
      !emojisRef.current.contains(event.target as Node)
    ) {
      setEmojiMode(false);
    }
  };

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

  return (
    <div className="hover:bg-zinc-800 group">
      {message.replyContent &&
        (message.replyUserId === user?.userId ? (
          <div className="text-gray-400 pt-2 pl-10">
            <div className="flex">
              <img
                src={user.profilePic || profilePic}
                className="w-[20px] h-[20px]  rounded-full mx-2"
              />
              <span className="font-bold pr-2">@{user.username}</span>{" "}
              {message.replyContent}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 pt-2 pl-10">
            <div className="flex">
              <img
                src={
                  (participantReply && participantReply[0].profilePic) ||
                  profilePic
                }
                className="w-[20px] h-[20px]  rounded-full mx-2"
              />
              <span className="font-bold pr-2">
                @{participantReply && participantReply[0].username}
              </span>{" "}
              {message.replyContent}
            </div>
          </div>
        ))}
      <div
        className={`${message.replyContent ? "px-3 pb-3" : "p-3"} flex transition-all ease duration-300`}
      >
        {deleteMode && (
          <div>
            <form
              onSubmit={handleDelete}
              className="fixed top-[35%] left-[40%] text-xl z-10 bg-gray-900 p-10 rounded flex flex-col"
            >
              <div className="text-lg font-bold">Delete message</div>
              <div className="text-sm mb-10">
                Are you sure you want to delete this message?
              </div>
              <div className="flex justify-between text-sm">
                <div></div>
                <div>
                  <button
                    onClick={() => setDeleteMode(false)}
                    className="px-3 py-2 bg-gray-800 mr-2 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-red-500 ml-2 text-sm rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </form>
            <div className="fixed top-0 left-0 bg-black opacity-50 w-screen h-screen z-0"></div>
          </div>
        )}
        <img
          src={user?.profilePic ? user.profilePic : profilePic}
          className="w-[40px] h-[40px] rounded-full mr-2"
        />
        <div className="w-[100%]">
          <div className="flex justify-between">
            <div className="flex">
              <div className="font-bold px-1">{username}</div>
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
                  setFriend(user);
                  setReplyContent(message.content.toString());
                }}
                className="cursor-pointer px-2 hidden group-hover:flex opacity-100 transition-opacity"
              >
                <FaReply size={20} className="" />
              </div>
              <div
                onClick={() => setEditMode(true)}
                className="cursor-pointer px-2 hidden group-hover:flex opacity-100 transition-opacity"
              >
                <MdModeEditOutline size={20} className="" />
              </div>
              <div
                onClick={() => setDeleteMode(true)}
                className="cursor-pointer px-2 hidden group-hover:flex opacity-100 transition-opacity"
              >
                <FaTrashCan size={20} className="text-red-400" />
              </div>
            </div>
          </div>
          {editMode ? (
            <form onSubmit={handleUpdate}>
              <input
                type="text"
                name="content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="bg-gray-900 border border-gray-500 rounded w-[98%] px-2"
              />
              <div className="text-xs flex">
                <div className="text-xs mr-1">escape to</div>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="text-cyan-600 cursor-pointer"
                >
                  cancel
                </button>
                <div className="mx-1">• enter to</div>
                <button type="submit" className="text-cyan-600 cursor-pointer">
                  submit
                </button>
              </div>
            </form>
          ) : (
            <div className="overflow-wrap break-word">{message.content}</div>
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
            <form onSubmit={handleCreateReaction} key={emoji}>
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
    </div>
  );
}

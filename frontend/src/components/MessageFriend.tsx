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

export default function MessageFriend(props: {
  message: Message;
  friends: Friend[];
  setFriend: (state: Friend | null) => void;
  replyMode: boolean;
  setReplyMode: (state: boolean) => void;
  setReplyContent: (state: string) => void;
  participants: Friend[] | undefined;
  userFriends: UserFriend[] | undefined;
}) {
  const {
    message,
    friends,
    setReplyMode,
    setFriend,
    setReplyContent,
    participants,
    userFriends,
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
    enabled: isExternal, // Only run this query if the user isn't already known
  });
  const userFriend =
    userFriends &&
    friend &&
    userFriends?.find((userFriend) => friend?.email == userFriend?.friendEmail);
  const isBlocked = userFriend && userFriend.blocked;
  const [emojiMode, setEmojiMode] = useState(false);
  const emojisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (friend || participant) {
      queryClient.invalidateQueries({ queryKey: ["users", message.userId] });
    }
  }, [friend, participant, message.userId, queryClient]);

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
    <div className={`${isBlocked && "hidden"} hover:bg-zinc-800 group`}>
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
                  (participantReply && participantReply.profilePic) ||
                  profilePic
                }
                className="w-[20px] h-[20px]  rounded-full mx-2"
              />
              <span className="font-bold pr-2">
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
          className="w-[40px] h-[40px] rounded-full mr-2"
        />
        <div className="w-[100%]">
          <div className="flex justify-between">
            <div className="flex">
              <div className="font-bold px-1">
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
          <div className="overflow-wrap break-word">{message.content}</div>
        </div>
      </div>
      {emojiMode && (
        <div
          className={`fixed bottom-[250px] right-[13%] md:right-[30%] z-50 grid grid-cols-5 md:grid-cols-9 gap-2 text-xl bg-zinc-800 p-3 rounded`}
          ref={emojisRef}
        >
          {emojis.map((emoji) => (
            <div
              className="cursor-pointer hover:bg-zinc-700"
              // onClick={() =>
              //   setMessageContent(messageContent.toString() + emoji)
              // }
            >
              {emoji}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

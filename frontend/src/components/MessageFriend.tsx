import { Message } from "../../../schemas/messages";
import { Friend } from "../lib/api/friend";
import useAuthStore from "../store/AuthStore";
import profilePic from "/capypaul01.jpg";
import { FaReply } from "react-icons/fa";

export default function MessageFriend(props: {
  message: Message;
  friends: Friend[];
  setFriend: (state: Friend) => void;
  replyMode: boolean;
  setReplyMode: (state: boolean) => void;
  setReplyContent: (state: string) => void;
  participants: Friend[] | undefined;
}) {
  const {
    message,
    friends,
    setReplyMode,
    setFriend,
    setReplyContent,
    participants,
  } = props;
  const friend = friends.filter((friend) => friend.userId === message.userId);
  const participant = participants?.filter(
    (participant) => participant.userId === message.replyUserId
  );
  const { user } = useAuthStore();

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
                src={(participant && participant[0].profilePic) || profilePic}
                className="w-[20px] h-[20px]  rounded-full mx-2"
              />
              <span className="font-bold pr-2">
                @{participant && participant[0].username}
              </span>{" "}
              {message.replyContent}
            </div>
          </div>
        ))}
      <div
        className={`${message.replyContent ? "px-3 pb-3" : "p-3"} flex transition-all ease duration-300`}
      >
        <img
          src={(friend[0] !== undefined && friend[0].profilePic) || profilePic}
          className="w-[40px] h-[40px] rounded-full mr-2"
        />
        <div className="w-[100%]">
          <div className="flex justify-between">
            <div className="flex">
              <div className="font-bold px-1">
                {(friend[0] !== undefined && friend[0].username) || ""}
              </div>
              <div className="pl-2 text-gray-400">
                on {message.createdAt.toString().slice(0, 25)}
              </div>
            </div>
            <div
              onClick={() => {
                setReplyMode(true);
                setFriend(friend[0]);
                setReplyContent(message.content.toString());
              }}
              className="cursor-pointer px-2 pr-5 hidden group-hover:flex opacity-100 transition-opacity"
            >
              <FaReply size={20} className="" />
            </div>
          </div>
          <div className="overflow-wrap break-word">{message.content}</div>
        </div>
      </div>
    </div>
  );
}

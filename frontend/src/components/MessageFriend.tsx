import { Message } from "../../../schemas/messages";
import { Friend } from "../lib/api/friend";
import profilePic from "/capypaul01.jpg";
import { FaReply } from "react-icons/fa";

export default function MessageFriend(props: {
  message: Message;
  friends: Friend[];
  replyMode: boolean;
  setReplyMode: (state: boolean) => void;
}) {
  const { message, friends, setReplyMode } = props;
  const friendname = friends.map((friend) => {
    if (friend.userId === message.userId) return friend.username;
  });

  return (
    <div className="p-3 flex hover:bg-slate-600 transition-all ease duration-300 group">
      <img src={profilePic} className="w-[40px] h-[40px] rounded-full mr-2" />
      <div className="w-[100%]">
        <div className="flex justify-between">
          <div className="flex">
            <div className="font-bold px-1">{friendname}</div>
            <div className="pl-2 text-gray-400">
              on {message.createdAt.toString().slice(0, 25)}
            </div>
          </div>
          <div
            onClick={() => setReplyMode(true)}
            className="cursor-pointer px-2 pr-5 hidden group-hover:flex opacity-100 transition-opacity"
          >
            <FaReply size={20} className="" />
          </div>
        </div>
        <div className="overflow-wrap break-word">{message.content}</div>
      </div>
    </div>
  );
}

import { Message } from "../../../schemas/messages";
import { Friend } from "../lib/api/friend";
import useAuthStore from "../store/AuthStore";
import profilePic from "/capypaul01.jpg";
import { MdModeEditOutline } from "react-icons/md";
import { FaTrashCan } from "react-icons/fa6";
import { FaReply } from "react-icons/fa";
import { useState } from "react";

export default function MessageComponent(props: {
  message: Message;
  friends: Friend[];
  replyMode: boolean;
  setReplyMode: (state: boolean) => void;
}) {
  const { user } = useAuthStore();
  const { message, friends, replyMode, setReplyMode } = props;
  const friendname = friends.map((friend) => {
    if (friend.userId === message.replyUserId) return friend.username;
  });
  const username = user && user.username.toString();
  const [editMode, setEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

  return (
    <div className="p-3 flex hover:bg-slate-600 transition-all ease duration-300 group">
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
            <div
              onClick={() => setReplyMode(true)}
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
        <div className="overflow-wrap break-word">{message.content}</div>
      </div>
    </div>
  );
}

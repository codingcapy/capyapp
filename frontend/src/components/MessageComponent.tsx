import { Message } from "../../../schemas/messages";
import { Friend } from "../lib/api/friend";
import useAuthStore from "../store/AuthStore";
import profilePic from "/capypaul01.jpg";
import { MdModeEditOutline } from "react-icons/md";
import { FaTrashCan } from "react-icons/fa6";
import { FaReply } from "react-icons/fa";
import { useEffect, useState } from "react";

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
  }

  return (
    <div className="p-3 flex hover:bg-slate-800 transition-all ease duration-300 group">
      {deleteMode && (
        <div>
          <form className="absolute top-[35%] left-[40%] text-xl z-10 bg-gray-900 p-10 rounded flex flex-col">
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
                <button className="px-3 py-2 bg-red-500 ml-2 text-sm rounded">
                  Delete
                </button>
              </div>
            </div>
          </form>
          <div className="absolute top-0 left-0 bg-black opacity-50 w-screen h-screen z-0"></div>
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
        {editMode ? (
          <div>
            <input
              type="text"
              className="bg-gray-900 border border-gray-500 rounded w-[98%] px-2"
            />
            <div
              onClick={() => setEditMode(false)}
              className="cursor-pointer text-xs"
            >
              escape to <span className="text-cyan-600">cancel</span> • enter to{" "}
              <span className="text-cyan-600">submit</span>
            </div>
          </div>
        ) : (
          <div className="overflow-wrap break-word">{message.content}</div>
        )}
      </div>
    </div>
  );
}

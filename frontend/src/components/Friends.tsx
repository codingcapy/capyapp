import { FaUserFriends } from "react-icons/fa";
import { Friend } from "../lib/api/friend";
import profilePic from "/capypaul01.jpg";
import { socket } from "../routes/dashboard";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useAuthStore from "../store/AuthStore";
import { UserFriend } from "../../../schemas/userfriends";

export default function Friends(props: {
  clickedAddFriend: () => void;
  clickedFriend: (currentFriend: Friend | null) => void;
  friends: Friend[] | undefined;
  userFriends: UserFriend[] | undefined;
  setFriend: (friend: Friend | null) => void;
  friend: Friend | null;
  handleCreateChat: () => void;
  handleBlock: () => void;
  handleUnblock: () => void;
}) {
  const {
    clickedAddFriend,
    clickedFriend,
    friends,
    userFriends,
    setFriend,
    friend,
    handleCreateChat,
    handleBlock,
    handleUnblock,
  } = props;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const userFriend =
    userFriends &&
    friend &&
    userFriends?.find((userFriend) => friend?.email == userFriend?.friendEmail);
  const isBlocked = userFriend && userFriend.blocked;

  useEffect(() => {
    socket.on("friend", (data) => {
      queryClient.invalidateQueries({ queryKey: ["friends", user?.email] });
    });
    return () => {
      socket.off("connect");
      socket.off("friend");
    };
  }, []);

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY });
  }

  function handleClickOutside(event: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setContextMenu(null);
    }
  }

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="relative md:w-[15%] md:border-r-[1px] border-zinc-700 bg-[#15151a] md:bg-zinc-900 md:h-screen">
      <div
        className="fixed top-0 left-0 bg-[#15151a] md:bg-zinc-900 px-5 pt-5 w-screen md:w-[14%]"
        onClick={clickedAddFriend}
      >
        <div className="flex">
          <FaUserFriends size={25} className="" />
          <div className="ml-2 text-xl">Friends</div>
        </div>
        <div className="py-3 my-2 cursor-pointer hover:bg-slate-600 transition-all ease duration-300">
          + Add a friend
        </div>
      </div>
      <div className="p-5 pt-[120px]">
        {friends?.map((f) => (
          <div
            onClick={() => clickedFriend(f)}
            className="flex py-2 px-1 cursor-pointer hover:bg-slate-600 transition-all ease duration-300"
            onContextMenu={(e) => {
              handleContextMenu(e);
              setFriend(f);
            }}
            key={f.userId}
          >
            <img
              src={f.profilePic ? f.profilePic : profilePic}
              className="w-[40px] rounded-full"
            />
            <div className="ml-2 py-2">{f.username}</div>
          </div>
        ))}
      </div>
      {contextMenu?.visible && (
        <div
          ref={menuRef}
          className="absolute bg-[#1A1A1A] p-2 z-[99] border border-[#555555] rounded"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left"
            onClick={() => {
              clickedFriend(friend);
              setContextMenu(null);
            }}
          >
            Profile
          </button>
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left"
            onClick={() => {
              handleCreateChat();
              setContextMenu(null);
            }}
          >
            Start Chat
          </button>
          {!isBlocked ? (
            <button
              className="block px-4 py-2 hover:bg-[#373737] w-full text-left text-red-400"
              onClick={() => {
                handleBlock();
                setContextMenu(null);
              }}
            >
              Block
            </button>
          ) : (
            <button
              className="block px-4 py-2 hover:bg-[#373737] w-full text-left text-red-400"
              onClick={() => {
                handleUnblock();
                setContextMenu(null);
              }}
            >
              Unblock
            </button>
          )}
        </div>
      )}
    </div>
  );
}

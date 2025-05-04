import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { Chat } from "../../../schemas/chats";
import profilePic from "/capypaul01.jpg";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { socket } from "../routes/dashboard";
import useAuthStore from "../store/AuthStore";
import { Unread } from "../lib/api/messages";

export default function Chats(props: {
  chats: Chat[] | undefined;
  clickedChat: (currentChat: Chat) => void;
  unreads: Unread[] | undefined;
}) {
  const { chats, clickedChat, unreads } = props;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    socket.on("chat", (data) => {
      queryClient.invalidateQueries({ queryKey: ["chats", user?.userId] });
    });
    return () => {
      socket.off("connect");
      socket.off("chat");
    };
  }, []);

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const offset = 8; // Small offset to right and bottom

    setContextMenu({
      visible: true,
      x: event.clientX - container.left + offset,
      y: event.clientY - container.top + offset,
    });
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
    <div
      className="relative md:w-[15%] md:h-screen bg-[#15151a] md:bg-zinc-900"
      ref={containerRef}
    >
      <div className="fixed top-0 left-0 md:left-[15%] flex bg-[#15151a] md:bg-zinc-900 p-5 w-screen md:w-[14%]">
        <IoChatbubbleEllipsesOutline size={25} className="" />
        <div className="ml-2 text-xl">Chats</div>
      </div>
      <div className="p-5 pt-[70px]">
        {chats !== undefined &&
          chats.map((chat) => (
            <div
              key={chat.chatId}
              className="relative flex py-2 px-1 cursor-pointer hover:bg-slate-600 transition-all ease duration-300"
              onClick={() => clickedChat(chat)}
              onContextMenu={(e) => {
                handleContextMenu(e);
              }}
            >
              <img
                src={profilePic}
                className="w-[40px] h-[40px] rounded-full"
              />
              <div className="ml-2 py-2">{chat.title}</div>
              <div className="absolute top-[35px] left-[30px] px-1 bg-[#ac3b3b] rounded-full text-sm">
                {unreads &&
                  unreads?.filter((unread) => unread.chatId === chat.chatId)
                    .length > 0 &&
                  unreads?.filter((unread) => unread.chatId === chat.chatId)
                    .length}
              </div>
            </div>
          ))}
      </div>
      {contextMenu?.visible && (
        <div
          ref={menuRef}
          className="absolute bg-[#1A1A1A] p-2 z-[99] border border-[#555555] rounded"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button className="block px-4 py-2 hover:bg-[#373737] w-full text-left text-red-400">
            Leave
          </button>
        </div>
      )}
    </div>
  );
}

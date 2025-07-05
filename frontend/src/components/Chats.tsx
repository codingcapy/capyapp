import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { Chat } from "../../../schemas/chats";
import profilePic from "/capypaul01.jpg";
import { useQueryClient } from "@tanstack/react-query";
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { socket, UnreadStatus } from "../routes/dashboard";
import useAuthStore from "../store/AuthStore";

export default function Chats(props: {
  chat: Chat | null;
  chats: Chat[] | undefined;
  clickedChat: (currentChat: Chat) => void;
  unreadStatus: UnreadStatus[] | undefined;
  setLeaveMode: Dispatch<SetStateAction<boolean>>;
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
  } | null;
  setContextMenu: Dispatch<
    SetStateAction<{
      visible: boolean;
      x: number;
      y: number;
    } | null>
  >;
  editTitleMode: boolean;
  setEditTitleMode: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    chats,
    clickedChat,
    unreadStatus,
    setLeaveMode,
    contextMenu,
    setContextMenu,
    editTitleMode,
    setEditTitleMode,
    chat,
  } = props;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
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
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left + container.scrollLeft;
    const y = event.clientY - rect.top + container.scrollTop;
    setContextMenu({
      visible: true,
      x,
      y,
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
          chats.map((c) => (
            <div
              key={c.chatId}
              className={`relative flex py-2 px-1 cursor-pointer hover:bg-zinc-800 transition-all ease duration-300 ${chat && chat.chatId === c.chatId && "bg-zinc-700"}`}
              onClick={() => clickedChat(c)}
              onContextMenu={(e) => {
                handleContextMenu(e);
              }}
            >
              <img
                src={profilePic}
                className="w-[40px] h-[40px] rounded-full"
              />
              <div className="ml-2 py-2">{c.title}</div>
              <div className="absolute top-[35px] left-[30px] px-1 bg-[#ac3b3b] rounded-full text-sm">
                {unreadStatus &&
                  unreadStatus?.filter((unread) => unread.chatId === c.chatId)
                    .length > 0 &&
                  unreadStatus?.filter(
                    (unread) => unread.chatId === c.chatId
                  )[0].unreadCount > 0 &&
                  unreadStatus?.filter(
                    (unread) => unread.chatId === c.chatId
                  )[0].unreadCount}
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
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left "
            onClick={() => {
              setEditTitleMode(true);
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left text-red-400"
            onClick={() => setLeaveMode(true)}
          >
            Leave
          </button>
        </div>
      )}
    </div>
  );
}

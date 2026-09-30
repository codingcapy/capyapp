import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { Chat } from "@server/schemas/chats";
import profilePic from "/capypaul01.jpg";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { socket, UnreadStatus } from "../routes/dashboard";
import useAuthStore from "../store/AuthStore";
import { getParticipantsByChatIdQueryOptions } from "../lib/api/chat";

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
  chatsLoading: boolean;
  chatsError: Error | null;
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
    chatsLoading,
    chatsError,
  } = props;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const chatHandler = () => {
      queryClient.invalidateQueries({ queryKey: ["chats", user?.userId] });
    };
    socket.on("chat", chatHandler);
    socket.on("chatUpdate", chatHandler);
    return () => {
      socket.off("chat", chatHandler);
      socket.off("chatUpdate", chatHandler);
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
      className="overflow-auto relative md:w-[15%] md:h-screen bg-[#15151a] md:bg-zinc-900"
      ref={containerRef}
    >
      <div className="fixed top-0 left-0 md:left-[15%] flex bg-[#15151a] md:bg-zinc-900 p-5 w-screen md:w-[14%] z-50">
        <IoChatbubbleEllipsesOutline size={25} className="" />
        <div className="ml-2 text-xl">Chats</div>
      </div>
      <div className="p-5 pt-[70px]">
        {chatsLoading ? (
          <div>Loading...</div>
        ) : chatsError ? (
          <div>Error loading chats</div>
        ) : chats ? (
          chats.map((c) => {
            const unread = unreadStatus?.find(
              (status) => status.chatId === c.chatId,
            );
            return (
              <ChatListItem
                key={c.chatId}
                chat={c}
                selected={!!chat && chat.chatId === c.chatId}
                unreadCount={unread?.unreadCount}
                clickedChat={clickedChat}
                handleContextMenu={handleContextMenu}
              />
            );
          })
        ) : (
          <div>No chats! Start talking with a friend!</div>
        )}
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

function ChatListItem(props: {
  chat: Chat;
  selected: boolean;
  unreadCount: number | undefined;
  clickedChat: (currentChat: Chat) => void;
  handleContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const { chat, selected, unreadCount, clickedChat, handleContextMenu } = props;
  const { user } = useAuthStore();
  const { data: participants } = useQuery({
    ...getParticipantsByChatIdQueryOptions(chat.chatId.toString()),
    enabled: !chat.title,
  });

  const displayTitle =
    chat.title ||
    participants
      ?.filter((participant) => participant.userId !== user?.userId)
      .map((participant) => participant.username)
      .join(", ") ||
    "";

  return (
    <div
      className={`relative flex py-2 px-1 cursor-pointer hover:bg-zinc-800 transition-all ease duration-300 ${selected && "bg-zinc-700"}`}
      onClick={() => clickedChat(chat)}
      onContextMenu={(e) => {
        handleContextMenu(e);
      }}
    >
      <img src={profilePic} className="w-[40px] h-[40px] rounded-full" />
      <div className="ml-2 py-2 truncate">{displayTitle}</div>
      {unreadCount !== undefined && unreadCount > 0 && (
        <div className="absolute top-[35px] left-[30px] px-1 bg-[#ac3b3b] rounded-full text-sm">
          {unreadCount}
        </div>
      )}
    </div>
  );
}

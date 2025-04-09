import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { Chat } from "../../../schemas/chats";
import profilePic from "/capypaul01.jpg";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { socket } from "../routes/dashboard";
import useAuthStore from "../store/AuthStore";

export default function Chats(props: {
  chats: Chat[] | undefined;
  clickedChat: (currentChat: Chat) => void;
}) {
  const { chats, clickedChat } = props;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  useEffect(() => {
    socket.on("chat", (data) => {
      queryClient.invalidateQueries({ queryKey: ["chats", user?.userId] });
    });
    return () => {
      socket.off("connect");
      socket.off("chat");
    };
  }, []);

  return (
    <div className="relative md:w-[15%] md:border-r md:h-screen overflow-auto">
      <div className="fixed top-0 left-0 md:left-[15%] flex bg-[#040406] p-5 w-screen md:w-[14%]">
        <IoChatbubbleEllipsesOutline size={25} className="" />
        <div className="ml-2 text-xl">Chats</div>
      </div>
      <div className="p-5 pt-[70px]">
        {chats !== undefined &&
          chats.map((chat) => (
            <div
              key={chat.chatId}
              className="flex py-2 px-1 cursor-pointer hover:bg-slate-600 transition-all ease duration-300"
              onClick={() => clickedChat(chat)}
            >
              <img src={profilePic} className="w-[40px] rounded-full" />
              <div className="ml-2 py-2">{chat.title}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

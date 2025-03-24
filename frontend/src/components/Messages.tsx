import { IoChatbubbleOutline } from "react-icons/io5";
import { LuSendHorizontal } from "react-icons/lu";
import { Chat } from "../../../schemas/chats";
import { useQuery } from "@tanstack/react-query";
import {
  getMessagesByChatIdQueryOptions,
  useCreateMessageMutation,
} from "../lib/api/messages";
import { User } from "../../../schemas/users";
import { Friend } from "../lib/api/friend";
import { useEffect, useRef, useState } from "react";
import MessageComponent from "./MessageComponent";
import MessageFriend from "./MessageFriend";
import { io } from "socket.io-client";

const socket = io("https://capyapp-production.up.railway.app");

export default function Messages(props: {
  chat: Chat | null;
  user: User | null;
  friends: Friend[] | undefined;
}) {
  const { chat, user, friends } = props;
  const { data: messages } = useQuery(
    getMessagesByChatIdQueryOptions(chat?.chatId.toString() || "")
  );
  const { mutate: createMessage } = useCreateMessageMutation();
  const [notification, setNotification] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const lastMessageRef = useRef<HTMLDivElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = (e.target as HTMLFormElement).messagecontent.value;
    if (content.length > 25000)
      return setNotification("Your message is too long!");
    if (!user || !chat) return;
    createMessage(
      { content, chatId: chat.chatId, userId: user.userId },
      {
        onSuccess: () =>
          socket.emit("message", {
            content,
            chatId: chat.chatId,
            userId: user.userId,
          }),
      }
    );
    setMessageContent("");
  }

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="md:w-[55%] md:border-r md:h-screen overflow-auto">
      <div className="fixed top-0 left-0 md:left-[30%] bg-[#040406] px-5 pt-5 w-screen md:w-[54%]">
        <div className="flex">
          <IoChatbubbleOutline size={25} className="" />
          <div className="ml-2 text-xl">{!chat ? "Messages" : chat.title}</div>
        </div>
        {chat && (
          <div className="py-3 my-2 cursor-pointer hover:bg-slate-600 transition-all ease duration-300">
            + Invite a friend
          </div>
        )}
      </div>
      <div className="pt-[70px] pb-[110px] md:pb-[100px]">
        {messages !== undefined &&
          messages.map((message) => (
            <div className="text-white " key={message.messageId}>
              {user && message.userId === user.userId ? (
                <MessageComponent message={message} friends={friends || []} />
              ) : (
                <MessageFriend message={message} friends={friends || []} />
              )}
            </div>
          ))}
        <div ref={lastMessageRef} />
      </div>
      <div className="fixed bottom-[80px] left-0 w-[100%] md:bottom-0 md:left-[30%] md:w-[55%] h-[70px] md:h-[100px] bg-[#040406] ">
        <form onSubmit={handleSubmit} className="flex m-5 w-[100%]">
          <input
            type="text"
            className="bg-gray-800 rounded p-1 md:p-3 w-[80%] md:w-[95%] outline-none mr-3"
            name="messagecontent"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
          />
          <button>
            <LuSendHorizontal size={25} className="md:hidden text-cyan-600" />
          </button>
        </form>
      </div>
    </div>
  );
}

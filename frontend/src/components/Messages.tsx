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
import { useState } from "react";
import MessageComponent from "./MessageComponent";

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = (e.target as HTMLFormElement).messagecontent.value;
    if (content.length > 25000)
      return setNotification("Your message is too long!");
    if (!user || !chat) return;
    createMessage({ content, chatId: chat.chatId, userId: user.userId });
  }

  return (
    <div className="md:w-[55%] md:border-r md:h-screen overflow-auto">
      <div className="fixed top-0 left-0 md:left-[30%] flex bg-[#040406] p-5 w-screen md:w-[54%]">
        <IoChatbubbleOutline size={25} className="" />
        <div className="ml-2 text-xl">Messages</div>
      </div>
      <div className="pt-[120px]">
        {messages !== undefined &&
          messages.map((message) => (
            <div className="text-white " key={message.messageId}>
              <MessageComponent message={message} friends={friends || []} />
            </div>
          ))}
      </div>
      <div className="p-5"></div>
      <div className="fixed bottom-[80px] left-0 w-[100%] md:bottom-0 md:left-[30%] md:w-[55%] h-[70px] md:h-[100px] bg-[#040406] ">
        <form onSubmit={handleSubmit} className="flex m-5 w-[100%]">
          <input
            type="text"
            className="bg-gray-800 rounded p-1 md:p-3 w-[80%] md:w-[95%] outline-none mr-3"
            name="messagecontent"
          />
          <button>
            <LuSendHorizontal size={25} className="md:hidden text-cyan-600" />
          </button>
        </form>
      </div>
    </div>
  );
}

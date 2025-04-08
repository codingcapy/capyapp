import { IoChatbubbleOutline } from "react-icons/io5";
import { LuSendHorizontal } from "react-icons/lu";
import { Chat } from "../../../schemas/chats";
import { useQuery } from "@tanstack/react-query";
import {
  getMessagesByChatIdQueryOptions,
  mapSerializedMessageToSchema,
  useCreateMessageMutation,
} from "../lib/api/messages";
import { User } from "../../../schemas/users";
import { Friend } from "../lib/api/friend";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import MessageComponent from "./MessageComponent";
import MessageFriend from "./MessageFriend";
import { io } from "socket.io-client";
import { useInviteFriendMutation } from "../lib/api/chat";
import { FaEllipsis } from "react-icons/fa6";
import { socket } from "../routes/dashboard";
import { Message } from "../../../schemas/messages";

export default function Messages(props: {
  chat: Chat | null;
  user: User | null;
  friends: Friend[] | undefined;
  liveMessages: Message[];
  setLiveMessages: Dispatch<
    SetStateAction<
      {
        userId: string;
        createdAt: Date;
        chatId: number;
        messageId: number;
        content: string;
        replyUserId: string | null;
        replyContent: string | null;
      }[]
    >
  >;
}) {
  const { chat, user, friends, liveMessages, setLiveMessages } = props;
  const { data: messages } = useQuery(
    getMessagesByChatIdQueryOptions(chat?.chatId.toString() || "")
  );
  const { mutate: createMessage } = useCreateMessageMutation();
  const { mutate: inviteFriend } = useInviteFriendMutation();
  const [notification, setNotification] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [addFriendMode, setAddFriendMode] = useState(false);
  const [addFriendNotification, setAddFriendNotification] = useState("");
  const [replyMode, setReplyMode] = useState(false);
  const [menuMode, setMenuMode] = useState(false);
  const [leaveMode, setLeaveMode] = useState(false);

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
            createdAt: new Date().toISOString(),
          }),
      }
    );
    setMessageContent("");
  }

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).messagecontent.value;
    if (!chat) return;
    inviteFriend({
      email: email,
      chatId: chat.chatId,
    });
  }

  useEffect(() => {
    socket.on("message", (data) => {
      setLiveMessages((prev) => [
        ...prev,
        mapSerializedMessageToSchema(data.body),
      ]);
    });
    return () => {
      socket.off("connect");
      socket.off("message");
    };
  }, []);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, liveMessages]);

  const allMessages = [...(messages || []), ...liveMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="md:w-[55%] md:border-r md:h-screen overflow-auto relative">
      <div className="fixed top-0 left-0 md:left-[30%] bg-[#040406] px-5 pt-5 w-screen md:w-[53.9%]">
        <div className="flex justify-between">
          <div className="flex">
            <IoChatbubbleOutline size={25} className="" />
            <div className="ml-2 text-xl">
              {!chat ? "Messages" : chat.title}
            </div>
          </div>
          {chat && (
            <FaEllipsis
              className="mt-1"
              onClick={() => setMenuMode(!menuMode)}
            />
          )}
        </div>
        {menuMode && (
          <div className="absolute top-10 right-0 bg-black px-10 pb-5">
            <div
              onClick={() => setLeaveMode(true)}
              className="py-5 text-red-400 cursor-pointer"
            >
              Leave chat
            </div>
            <div className="text-xl">Participants</div>
          </div>
        )}
        {leaveMode && (
          <div>
            <form className="fixed top-[35%] left-[40%] text-xl z-10 bg-gray-900 p-10 rounded flex flex-col">
              <div className="text-lg font-bold">Leave chat</div>
              <div className="text-sm mb-10">
                Are you sure you want to leave this chat?
              </div>
              <div className="flex justify-between text-sm">
                <div></div>
                <div>
                  <button
                    onClick={() => setLeaveMode(false)}
                    className="px-3 py-2 bg-gray-800 mr-2 rounded"
                  >
                    Cancel
                  </button>
                  <button className="px-3 py-2 bg-red-500 ml-2 text-sm rounded">
                    Leave
                  </button>
                </div>
              </div>
            </form>
            <div className="fixed top-0 left-0 bg-black opacity-50 w-screen h-screen z-0"></div>
          </div>
        )}
        {chat && (
          <div
            onClick={() => setAddFriendMode(!addFriendMode)}
            className="py-3 my-2 cursor-pointer hover:bg-slate-600 transition-all ease duration-300"
          >
            + Invite a friend
          </div>
        )}
        {addFriendMode && (
          <form className="p-2 flex flex-col w-[300px]">
            <label htmlFor="email" className="font-bold text-xl">
              Add friend
            </label>
            <input
              className="bg-gray-800 rounded p-1 outline-none my-3"
              type="email"
              name="email"
              placeholder="Type the email of a friend"
              required
            />
            <div className="my-1">
              <button className="border border-cyan-600 text-cyan-600 font-bold px-2 py-2 rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300">
                Add friend
              </button>
              <button onClick={() => setAddFriendMode(false)} className="ml-2">
                Cancel
              </button>
            </div>
          </form>
        )}
        <div className="text-red-400">{addFriendNotification}</div>
      </div>
      <div
        className={`pt-[100px] pb-[150px] ${replyMode ? "md:pb-[120px]" : "md:pb-[100px]"}`}
      >
        {allMessages.map((message, i) => (
          <div className="text-white" key={message.messageId || `live-${i}`}>
            {user && message.userId === user.userId ? (
              <MessageComponent
                message={message}
                friends={friends || []}
                replyMode={replyMode}
                setReplyMode={setReplyMode}
              />
            ) : (
              <MessageFriend
                message={message}
                friends={friends || []}
                replyMode={replyMode}
                setReplyMode={setReplyMode}
              />
            )}
          </div>
        ))}

        <div ref={lastMessageRef} />
      </div>
      <div className="text-red-400">{notification}</div>
      {chat && !replyMode && (
        <div className="fixed bottom-[80px] left-0 w-[100%] md:bottom-0 md:left-[30%] md:w-[54%] h-[70px] md:h-[100px] bg-[#040406] ">
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
      )}
      {chat && replyMode && (
        <div
          className={`fixed ${replyMode ? "bottom-[100px]" : "bottom-[80px]"} left-0 w-[100%] md:bottom-0 md:left-[30%] md:w-[54%] h-[70px] ${replyMode ? "md:h-[132px]" : "md:h-[100px]"} bg-[#040406] `}
        >
          <div className="flex justify-between px-6 pb-2 bg-gray-700">
            <div className="pt-2">Replying to </div>
            <div
              onClick={() => setReplyMode(false)}
              className="cursor-pointer pt-1"
            >
              x
            </div>
          </div>
          <form className={`flex ${replyMode ? "mx-5 mt-3" : "m-5"} w-[100%]`}>
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
      )}
    </div>
  );
}

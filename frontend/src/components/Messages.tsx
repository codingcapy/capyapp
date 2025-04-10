import { IoChatbubbleOutline } from "react-icons/io5";
import { LuSendHorizontal } from "react-icons/lu";
import { Chat } from "../../../schemas/chats";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMessagesByChatIdQueryOptions,
  useCreateMessageMutation,
} from "../lib/api/messages";
import { User } from "../../../schemas/users";
import { Friend } from "../lib/api/friend";
import { useEffect, useRef, useState } from "react";
import MessageComponent from "./MessageComponent";
import MessageFriend from "./MessageFriend";
import {
  getParticipantsByChatIdQueryOptions,
  useInviteFriendMutation,
  useLeaveChatMutation,
  useUpdateTitleMutation,
} from "../lib/api/chat";
import { FaEllipsis } from "react-icons/fa6";
import { socket } from "../routes/dashboard";
import profilePic from "/capypaul01.jpg";
import capyness from "/capyness.png";
import { PiSmiley } from "react-icons/pi";

export default function Messages(props: {
  chat: Chat | null;
  setChat: (state: Chat | null) => void;
  user: User | null;
  friends: Friend[] | undefined;
  friend: Friend | null;
  setFriend: (state: Friend | null) => void;
}) {
  const { chat, user, friends, friend, setFriend, setChat } = props;
  const { data: messages } = useQuery(
    getMessagesByChatIdQueryOptions(chat?.chatId.toString() || "")
  );
  const { data: participants } = useQuery(
    getParticipantsByChatIdQueryOptions(chat?.chatId.toString() || "")
  );
  const { mutate: createMessage } = useCreateMessageMutation();
  const { mutate: inviteFriend } = useInviteFriendMutation();
  const { mutate: updateTitle } = useUpdateTitleMutation();
  const { mutate: leaveChat } = useLeaveChatMutation();
  const [notification, setNotification] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [addFriendMode, setAddFriendMode] = useState(false);
  const [addFriendNotification, setAddFriendNotification] = useState("");
  const [replyMode, setReplyMode] = useState(false);
  const [menuMode, setMenuMode] = useState(false);
  const [leaveMode, setLeaveMode] = useState(false);
  const [editTitleMode, setEditTitleMode] = useState(false);
  const [titleContent, setTitleContent] = useState((chat && chat.title) || "");
  const [replyContent, setReplyContent] = useState("");
  const [emojiMode, setEmojiMode] = useState(false);
  const queryClient = useQueryClient();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const emojisRef = useRef<HTMLDivElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = (e.target as HTMLFormElement).messagecontent.value;
    if (content.length > 25000)
      return setNotification("Your message is too long!");
    if (!user || !chat) return;
    if (replyMode) {
      createMessage(
        {
          content,
          chatId: chat.chatId,
          userId: user.userId,
          replyUserId: friend?.userId || "",
          replyContent: replyContent,
        },
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
      setReplyMode(false);
    } else {
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
    }
    setMessageContent("");
  }

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).email.value;
    if (!chat) return;
    inviteFriend(
      {
        email: email,
        chatId: chat.chatId,
      },
      {
        onSuccess: () =>
          socket.emit("message", {
            content: `user has entered the chat`,
            chatId: chat && chat.chatId,
            userId: user && user.userId,
            createdAt: new Date().toISOString(),
          }),
      }
    );
    setAddFriendMode(false);
    queryClient.invalidateQueries({
      queryKey: ["messages", chat?.chatId.toString()],
    });
  }

  function handleUpdateTitle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newTitle = (e.target as HTMLFormElement).chattitle.value;
    updateTitle({
      chatId: (chat && chat.chatId) || 0,
      title: newTitle,
    });
    setEditTitleMode(false);
  }

  function handleLeaveChat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const userId = (user && user.userId) || "";
    const chatId = (chat && chat.chatId) || 0;
    createMessage(
      {
        userId: "notification",
        chatId: (chat && chat.chatId) || 0,
        content: `${user?.username} has left the chat`,
      },
      {
        onSuccess: () =>
          socket.emit("message", {
            content: `${user?.username} has left the chat`,
            chatId: chat && chat.chatId,
            userId: user && user.userId,
            createdAt: new Date().toISOString(),
          }),
      }
    );
    leaveChat({ userId, chatId });
    setLeaveMode(false);
    setMenuMode(false);
    setChat(null);
  }

  useEffect(() => {
    socket.on("message", (data) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", chat?.chatId.toString()],
      });
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
  }, [messages]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEditTitleMode(false);
        setAddFriendMode(false);
        setMenuMode(false);
        setLeaveMode(false);
        setEmojiMode(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("mousedown", handleClickOutsideEmojis);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("mousedown", handleClickOutsideEmojis);
    };
  }, []);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      titleInputRef.current &&
      !titleInputRef.current.contains(event.target as Node)
    ) {
      setEditTitleMode(false);
    }
  };

  const handleClickOutsideEmojis = (event: MouseEvent) => {
    if (
      emojisRef.current &&
      !emojisRef.current.contains(event.target as Node)
    ) {
      setEmojiMode(false);
    }
  };

  return (
    <div className="md:w-[55%] md:h-screen overflow-auto relative md:bg-[#202020]">
      <div className="fixed top-0 left-0 md:left-[30%] bg-[#040406] md:bg-[#202020] px-5 pt-5 w-screen md:w-[53.9%]">
        <div className="flex justify-between">
          <div className="flex">
            <IoChatbubbleOutline size={25} className="" />
            {!editTitleMode && (
              <div
                onClick={() => {
                  chat && setEditTitleMode(true);
                  chat && setTitleContent(chat.title);
                }}
                className="ml-2 text-xl"
              >
                {!chat ? "Messages" : chat.title}
              </div>
            )}
            {editTitleMode && (
              <form onSubmit={handleUpdateTitle}>
                <input
                  type="text"
                  name="chattitle"
                  ref={titleInputRef}
                  className="px-2 py-1 ml-2 border"
                  value={titleContent}
                  onChange={(e) => setTitleContent(e.target.value)}
                />
                <button type="submit" className="hidden">
                  Submit
                </button>
              </form>
            )}
          </div>
          {chat && (
            <FaEllipsis
              className="mt-1"
              onClick={() => setMenuMode(!menuMode)}
            />
          )}
        </div>
        {!chat && (
          <div className="absolute top-[250px] left-[37%]">
            <img src={capyness} alt="" />
            <div className="text-xl font-bold py-5 text-yellow-200">
              {" "}
              Start chatting with a friend!
            </div>
          </div>
        )}
        {menuMode && (
          <div className="absolute top-10 right-0 bg-[#202020] px-10 pb-5">
            <div
              onClick={() => setLeaveMode(true)}
              className="my-3 py-2 pl-1 text-red-400  hover:bg-zinc-800 cursor-pointer"
            >
              Leave chat
            </div>
            <div className="text-xl pb-2">Participants</div>
            {participants?.map((participant) => (
              <div
                className="flex pl-1 hover:bg-zinc-800 cursor-pointer"
                key={participant.userId}
              >
                <img
                  src={participant.profilePic || profilePic}
                  alt=""
                  className="w-[25px] h-[25px] rounded-full mt-2"
                />
                <div className="p-2">{participant.username}</div>
              </div>
            ))}
          </div>
        )}
        {leaveMode && (
          <div>
            <form
              onSubmit={handleLeaveChat}
              className="fixed top-[35%] left-[40%] text-xl z-10 bg-gray-900 p-10 rounded flex flex-col"
            >
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
                  <button
                    type="submit"
                    className="px-3 py-2 bg-red-500 ml-2 text-sm rounded"
                  >
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
          <form onSubmit={handleInvite} className="p-2 flex flex-col w-[300px]">
            <label htmlFor="email" className="font-bold text-xl">
              Add friend
            </label>
            <input
              className="bg-zinc-900 border border-[#636363] rounded p-1 outline-none my-3"
              type="email"
              name="email"
              placeholder="Type the email of a friend"
              required
            />
            <div className="my-1">
              <button className="border border-cyan-600 text-cyan-600 font-bold px-2 py-2 rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300 cursor-pointer">
                Add friend
              </button>
              <button
                onClick={() => setAddFriendMode(false)}
                className="ml-4 cursor-pointer"
              >
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
        {messages
          ?.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((message, i) => (
            <div className="text-white" key={message.messageId || `live-${i}`}>
              {user && message.userId === user.userId ? (
                <MessageComponent
                  message={message}
                  friends={friends || []}
                  setFriend={setFriend}
                  replyMode={replyMode}
                  setReplyMode={setReplyMode}
                  setReplyContent={setReplyContent}
                />
              ) : message.userId === "notification" ? (
                <div className="p-3 flex hover:bg-slate-800 transition-all ease duration-300 group text-[#b6b6b6]">
                  <div className="w-[100%]">
                    <div className="font-bold px-1">notification</div>
                    <div className="overflow-wrap break-word">
                      {message.content}
                    </div>
                  </div>
                </div>
              ) : (
                <MessageFriend
                  message={message}
                  friends={friends || []}
                  setFriend={setFriend}
                  replyMode={replyMode}
                  setReplyMode={setReplyMode}
                  setReplyContent={setReplyContent}
                />
              )}
            </div>
          ))}

        <div ref={lastMessageRef} />
      </div>
      <div className="text-red-400">{notification}</div>
      {emojiMode && (
        <div
          className={`fixed ${replyMode ? "bottom-[150px]" : "bottom-[100px]"} right-[18%] z-50 grid grid-cols-5 gap-2 text-xl bg-zinc-800 p-3 rounded`}
          ref={emojisRef}
        >
          <div>😀</div>
          <div>😂</div>
          <div>🤣</div>
          <div>😅</div>
          <div>😥</div>
          <div>😮</div>
          <div>😛</div>
          <div>😎</div>
          <div>😆</div>
          <div>👍</div>
          <div>🔥</div>
          <div>🎉</div>
          <div>👀</div>
          <div>🙌</div>
          <div>👏</div>
          <div>🙏</div>
          <div>❤</div>
          <div>✔</div>
          <div>🏝</div>
          <div>😍</div>
          <div>🥰</div>
          <div>😡</div>
          <div>🤬</div>
          <div>💀</div>
          <div>☠</div>
        </div>
      )}
      {chat && !replyMode && (
        <div className="fixed bottom-[80px] left-0 w-[100%] md:bottom-0 md:left-[30%] md:w-[54%] h-[70px] md:h-[100px] bg-[#040406] md:bg-[#202020] ">
          <form onSubmit={handleSubmit} className="flex m-5 w-[100%]">
            <div className="bg-[#1b1b1b] border border-[#636363] rounded p-1 md:p-3 w-[80%] md:w-[95%] mr-3 flex">
              <input
                type="text"
                className="w-[100%] outline-none "
                name="messagecontent"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
              <PiSmiley
                size={25}
                onClick={() => setEmojiMode(true)}
                className="cursor-pointer"
              />
              <button>
                <LuSendHorizontal
                  size={25}
                  className="md:hidden text-cyan-600"
                />
              </button>
            </div>
          </form>
        </div>
      )}
      {chat && replyMode && (
        <div
          className={`fixed ${replyMode ? "bottom-[100px]" : "bottom-[80px]"} left-0 w-[100%] md:bottom-0 md:left-[30%] md:w-[54%] h-[70px] ${replyMode ? "md:h-[132px]" : "md:h-[100px]"} bg-[#040406] md:bg-[#202020] `}
        >
          <div className="flex justify-between px-6 pb-2 bg-gray-700">
            <div className="pt-2">
              Replying to{" "}
              <span className="font-bold">{friend && friend.username}</span>
            </div>
            <div
              onClick={() => setReplyMode(false)}
              className="cursor-pointer pt-1"
            >
              x
            </div>
          </div>
          <form onSubmit={handleSubmit} className={`flex mx-5 mt-3 w-[100%]`}>
            <input
              type="text"
              className="bg-[#1b1b1b] border border-[#636363] rounded p-1 md:p-3 w-[80%] md:w-[95%] outline-none mr-3"
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

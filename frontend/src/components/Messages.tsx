import { IoChatbubbleOutline } from "react-icons/io5";
import { LuSendHorizontal } from "react-icons/lu";
import { Chat } from "../../../schemas/chats";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMessagesByChatIdQueryOptions,
  getreadMessagesByUserIdQueryOptions,
  useCreateMessageMutation,
  useCreateMessageReadMutation,
  useDeleteMessageMutation,
} from "../lib/api/messages";
import { User } from "../../../schemas/users";
import { Friend } from "../lib/api/friend";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import MessageComponent from "./MessageComponent";
import MessageFriend from "./MessageFriend";
import {
  getParticipantsByChatIdQueryOptions,
  useInviteFriendMutation,
  useUpdateTitleMutation,
} from "../lib/api/chat";
import { FaEllipsis } from "react-icons/fa6";
import { socket } from "../routes/dashboard";
import profilePic from "/capypaul01.jpg";
import capyness from "/capyness.png";
import { PiSmiley } from "react-icons/pi";
import emojis from "../emojis/emojis";
import useParticipantStore from "../store/ParticipantStore";
import { UserFriend } from "../../../schemas/userfriends";
import {
  getReactionsByChatIdQueryOptions,
  useCreateReactionMutation,
} from "../lib/api/reaction";
import Notification from "./Notification";
import { Message } from "../../../schemas/messages";
import { FaPlusCircle } from "react-icons/fa";
import { FaImage } from "react-icons/fa6";
import { useUploadImageMutation } from "../lib/api/images";

export type ContextMode = "user" | "friend";

export function useOnScreen(
  ref: React.RefObject<HTMLElement | null>,
  onVisible: () => void,
  options?: IntersectionObserverInit
) {
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        onVisible();
        observer.disconnect(); // Only observe once
      }
    }, options);

    const el = ref.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [ref]);
}

export default function Messages(props: {
  chat: Chat | null;
  setChat: (state: Chat | null) => void;
  user: User | null;
  friends: Friend[] | undefined;
  friend: Friend | null;
  setFriend: (state: Friend | null) => void;
  clickedFriend: (state: Friend) => void;
  userFriends: UserFriend[] | undefined;
  setLeaveMode: Dispatch<SetStateAction<boolean>>;
  menuMode: boolean;
  setMenuMode: Dispatch<SetStateAction<boolean>>;
  editTitleMode: boolean;
  setEditTitleMode: React.Dispatch<React.SetStateAction<boolean>>;
  currentMessage: Message | null;
  setCurrentMessage: (state: Message | null) => void;
}) {
  const {
    chat,
    user,
    friends,
    friend,
    setFriend,
    clickedFriend,
    userFriends,
    setLeaveMode,
    menuMode,
    setMenuMode,
    editTitleMode,
    setEditTitleMode,
    currentMessage,
    setCurrentMessage,
  } = props;
  const { data: messages } = useQuery(
    getMessagesByChatIdQueryOptions(chat?.chatId.toString() || "")
  );
  const { data: participants } = useQuery(
    getParticipantsByChatIdQueryOptions(chat?.chatId.toString() || "")
  );
  const { data: reactions } = useQuery(
    getReactionsByChatIdQueryOptions(chat?.chatId || 0)
  );
  const { mutate: createMessage } = useCreateMessageMutation();
  const { mutate: inviteFriend } = useInviteFriendMutation();
  const { mutate: updateTitle } = useUpdateTitleMutation();
  const [notification, setNotification] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [addFriendMode, setAddFriendMode] = useState(false);
  const [addFriendNotification, setAddFriendNotification] = useState("");
  const [replyMode, setReplyMode] = useState(false);
  const [titleContent, setTitleContent] = useState((chat && chat.title) || "");
  const [replyContent, setReplyContent] = useState("");
  const [emojiMode, setEmojiMode] = useState(false);
  const queryClient = useQueryClient();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const emojisRef = useRef<HTMLDivElement>(null);
  const { setParticipants } = useParticipantStore();
  const { mutate: createMessageRead } = useCreateMessageReadMutation();
  const { data: reads } = useQuery(
    getreadMessagesByUserIdQueryOptions((user && user.userId) || "")
  );
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [contextMode, setContextMode] = useState<ContextMode>("user");
  const [deleteMode, setDeleteMode] = useState(false);
  const { mutate: deleteMessage } = useDeleteMessageMutation();
  const { mutate: createReaction } = useCreateReactionMutation();
  const [reactionMode, setReactionMode] = useState(false);
  const [editMessageId, setEditMessageId] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState(false);
  const {
    mutate: uploadImage,
    isPending: isUploading,
    error: uploadError,
  } = useUploadImageMutation();
  const [preview, setPreview] = useState<string | null>(null);

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
    const validEmail = friends?.filter((friend) => friend.email === email);
    if (!validEmail || validEmail.length < 1)
      return setAddFriendNotification("Invalid email address");
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

  function handleCreateMessageRead(id: number) {
    const userId = (user && user.userId) || "";
    const messageId = id;
    if (
      reads &&
      reads.some(
        (unread) => unread.userId === userId && unread.messageId === messageId
      )
    )
      return;
    createMessageRead({ userId, messageId });
  }

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
        setReactionMode(false);
        setDeleteMode(false);
        setEditMessageId(null);
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
    document.addEventListener("mousedown", handleClickOutsideContextMenu);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("mousedown", handleClickOutsideEmojis);
      document.addEventListener("mousedown", handleClickOutsideContextMenu);
    };
  }, []);

  useEffect(() => {
    if (participants) {
      setParticipants(participants);
    }
  }, [participants]);

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
      setReactionMode(false);
    }
  };

  function handleClickOutsideContextMenu(event: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setContextMenu(null);
    }
  }

  function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    deleteMessage({
      messageId: (currentMessage && currentMessage.messageId) || 0,
    });
    setDeleteMode(false);
  }

  function handleCreateReaction(
    e: React.FormEvent<HTMLFormElement>,
    message: Message | null
  ) {
    e.preventDefault();
    if (message === null) return;
    const messageId = message.messageId;
    const chatId = (chat && chat.chatId) || 0;
    const userId = (user && user.userId) || "";
    const reactionContent = (e.target as HTMLFormElement).content.value;
    createReaction(
      {
        messageId,
        chatId,
        userId,
        content: reactionContent,
      },
      {
        onSuccess: (result) => {
          socket.emit("reaction", result);
        },
      }
    );
    setReactionMode(false);
  }

  useEffect(() => {
    document.addEventListener("click", handleClickOutsideContextMenu);
    return () =>
      document.removeEventListener("click", handleClickOutsideContextMenu);
  }, []);

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };

      uploadImage({ userId: user!.userId, file });

      // Clear the input value to ensure onChange fires even with same file
      event.target.value = "";
    },
    [user!.userId, uploadImage]
  );

  return (
    <div
      className="md:w-[55%] md:h-screen overflow-auto relative bg-[#15151a] md:bg-[#202020]"
      ref={containerRef}
    >
      {deleteMode && (
        <div>
          <form
            onSubmit={handleDelete}
            className="fixed top-[35%] left-[40%] text-xl z-10 bg-gray-900 p-10 rounded flex flex-col"
          >
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
                <button
                  type="submit"
                  className="px-3 py-2 bg-red-500 ml-2 text-sm rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </form>
          <div className="fixed top-0 left-0 bg-black opacity-50 w-screen h-screen z-0"></div>
        </div>
      )}
      <div className="fixed top-0 left-0 md:left-[30%] bg-[#15151a] md:bg-[#202020] px-5 pt-5 w-screen md:w-[53.9%]">
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
                  className="bg-zinc-900 border border-[#636363] rounded p-1 outline-none ml-2"
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
              className="my-3 p-2 text-red-400  hover:bg-zinc-800 cursor-pointer"
            >
              Leave chat
            </div>
            <div className="md:hidden text-xl pb-2">Participants</div>
            {participants?.map((participant) => (
              <div
                onClick={() => clickedFriend(participant)}
                className="md:hidden flex pl-1 hover:bg-zinc-800 cursor-pointer"
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
                <div
                  onContextMenu={(e) => {
                    setCurrentMessage(message);
                    setFriend(user || null);
                    handleContextMenu(e);
                    setReplyContent(message.content.toString());
                    setContextMode("user");
                  }}
                >
                  <MessageComponent
                    message={message}
                    friends={friends || []}
                    setFriend={setFriend}
                    replyMode={replyMode}
                    setReplyMode={setReplyMode}
                    setReplyContent={setReplyContent}
                    participants={participants}
                    reactions={reactions}
                    chat={chat}
                    handleCreateMessageRead={handleCreateMessageRead}
                    clickedFriend={clickedFriend}
                    handleCreateReaction={handleCreateReaction}
                    editMessageId={editMessageId}
                    setEditMessageId={setEditMessageId}
                  />
                </div>
              ) : message.userId === "notification" ? (
                <Notification
                  message={message}
                  handleCreateMessageRead={handleCreateMessageRead}
                />
              ) : (
                <div
                  onContextMenu={(e) => {
                    setCurrentMessage(message);
                    const friend =
                      friends?.find(
                        (friend) => message.userId === friend.userId
                      ) ??
                      participants?.find(
                        (participant) => message.userId === participant.userId
                      ) ??
                      null;
                    setFriend(friend);
                    handleContextMenu(e);
                    setReplyContent(message.content.toString());
                    setContextMode("friend");
                  }}
                >
                  <MessageFriend
                    message={message}
                    friends={friends || []}
                    setFriend={setFriend}
                    replyMode={replyMode}
                    setReplyMode={setReplyMode}
                    setReplyContent={setReplyContent}
                    participants={participants}
                    userFriends={userFriends}
                    reactions={reactions}
                    chat={chat}
                    handleCreateMessageRead={handleCreateMessageRead}
                    clickedFriend={clickedFriend}
                    handleCreateReaction={handleCreateReaction}
                  />
                </div>
              )}
            </div>
          ))}
        <div ref={lastMessageRef} />
      </div>
      <div className="text-red-400">{notification}</div>
      {emojiMode && (
        <div
          className={`fixed ${replyMode ? "bottom-[170px] md:bottom-[150px]" : "bottom-[150px] md:bottom-[100px]"} right-[13%] md:right-[18%] z-50 grid grid-cols-5 md:grid-cols-9 gap-2 text-xl bg-zinc-800 p-3 rounded`}
          ref={emojisRef}
        >
          {emojis.map((emoji) => (
            <div
              className="cursor-pointer hover:bg-zinc-700"
              onClick={() =>
                setMessageContent(messageContent.toString() + emoji)
              }
            >
              {emoji}
            </div>
          ))}
        </div>
      )}
      {uploadMode && (
        <div
          className={`fixed ${replyMode ? "bottom-[170px] md:bottom-[150px]" : "bottom-[150px] md:bottom-[100px]"} left-[13%] md:left-[31%] w-[15%] z-50 bg-zinc-800 p-3 rounded`}
        >
          <label className="flex cursor-pointer hover:bg-zinc-700 p-3">
            <FaImage size={25} />
            <div className="pl-4">Upload image</div>
            <input
              id="imageUpload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              // disabled={isUploading}
            />
          </label>
        </div>
      )}
      {chat && replyMode && (
        <div className="fixed bottom-[150px] md:bottom-[100px] left-0 w-[100%] md:left-[30%] md:w-[54%] flex justify-between px-6 pb-2 bg-gray-700">
          <div className="pt-2 block">
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
      )}
      {chat && (
        <div
          className={`fixed bottom-[80px] left-0 w-[100%] md:bottom-0 md:left-[30%] md:w-[54%] h-[70px] md:h-[100px] bg-[#15151a] md:bg-[#202020] `}
        >
          <form onSubmit={handleSubmit} className="flex m-5 w-[100%]">
            <div className="bg-[#1b1b1b] border border-[#636363] rounded p-1 md:p-3 w-[80%] md:w-[95%] mr-3 flex">
              <FaPlusCircle
                size={27}
                onClick={() => setUploadMode(!uploadMode)}
                className="cursor-pointer pb-1"
              />
              <input
                type="text"
                className="w-[100%] outline-none pl-2"
                name="messagecontent"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
              <PiSmiley
                size={27}
                onClick={() => setEmojiMode(!emojiMode)}
                className="cursor-pointer pb-1"
              />
            </div>
            <button>
              <LuSendHorizontal size={25} className="md:hidden text-cyan-600" />
            </button>
          </form>
          {preview && <img src={preview} className="w-[50px]" />}
        </div>
      )}
      {contextMenu?.visible && contextMode === "user" && (
        <div
          className="absolute bg-[#1A1A1A] p-2 z-[99] border border-[#555555] rounded"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          ref={menuRef}
        >
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left"
            onClick={() => {
              setReplyMode(true);
              setFriend(friend || null);
              setContextMenu(null);
            }}
          >
            Reply
          </button>
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left "
            onClick={() => {
              setEditMessageId(currentMessage?.messageId || null);
              setContextMenu(null);
            }}
          >
            Edit
          </button>
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left"
            onClick={() => {
              setReactionMode(true);
              setContextMenu(null);
            }}
          >
            Add Reaction
          </button>
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left text-red-400"
            onClick={() => {
              setDeleteMode(true);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
      {contextMenu?.visible && contextMode === "friend" && (
        <div
          className="absolute bg-[#1A1A1A] p-2 z-[99] border border-[#555555] rounded"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          ref={menuRef}
        >
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left"
            onClick={() => {
              setReplyMode(true);
              setFriend(friend || null);
              setContextMenu(null);
            }}
          >
            Reply
          </button>
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left"
            onClick={() => {
              setReactionMode(true);
              setContextMenu(null);
            }}
          >
            Add Reaction
          </button>
        </div>
      )}
      {reactionMode && (
        <div
          className={`fixed bottom-[250px] right-[13%] md:right-[30%] z-50 grid grid-cols-5 md:grid-cols-9 gap-2 text-xl bg-zinc-800 p-3 rounded`}
          ref={emojisRef}
        >
          {emojis.map((emoji) => (
            <form
              onSubmit={(e) => handleCreateReaction(e, currentMessage)}
              key={emoji}
            >
              <input
                type="text"
                defaultValue={emoji}
                name="content"
                className="hidden"
              />
              <button
                type="submit"
                className="cursor-pointer hover:bg-zinc-700"
              >
                {emoji}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

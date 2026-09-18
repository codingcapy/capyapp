import { IoArrowBack, IoChatbubbleOutline } from "react-icons/io5";
import { LuSendHorizontal } from "react-icons/lu";
import { Chat } from "@server/schemas/chats";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  appendMessageToChatCache,
  mapSerializedMessageToSchema,
  useCreateMessageMutation,
  useDeleteMessageMutation,
  useMarkMessageReadMutation,
  useMessagesQuery,
  type SerializedMessage,
} from "../lib/api/messages";
import { SafeUser } from "../store/AuthStore";
import { Friend } from "../lib/api/friend";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useMemo,
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
import { MobileViewMode, socket } from "../routes/dashboard";
import profilePic from "/capypaul01.jpg";
import capyness from "/capyness.png";
import { PiSmiley } from "react-icons/pi";
import emojis from "../emojis/emojis";
import useParticipantStore from "../store/ParticipantStore";
import { UserFriend } from "@server/schemas/userfriends";
import {
  getReactionsByChatIdQueryOptions,
  useCreateReactionMutation,
} from "../lib/api/reaction";
import Notification from "./Notification";
import { Message } from "@server/schemas/messages";
import { FaPlusCircle } from "react-icons/fa";
import { FaImage } from "react-icons/fa6";
import {
  getImagesByChatIdQueryOptions,
  useDeleteImageMutation,
  useUpdateImageMutation,
  useUploadImageMutation,
} from "../lib/api/images";
import { FaTrashCan } from "react-icons/fa6";

export type ContextMode = "user" | "friend";

// export function useOnScreen(
//   ref: React.RefObject<HTMLElement | null>,
//   onVisible: () => void,
//   options?: IntersectionObserverInit
// ) {
//   useEffect(() => {
//     const observer = new IntersectionObserver(([entry]) => {
//       if (entry.isIntersecting) {
//         onVisible();
//         observer.disconnect(); // Only observe once
//       }
//     }, options);

//     const el = ref.current;
//     if (el) observer.observe(el);

//     return () => {
//       if (el) observer.unobserve(el);
//     };
//   }, [ref]);
// }

export default function Messages(props: {
  chat: Chat | null;
  setChat: (state: Chat | null) => void;
  user: SafeUser | null;
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
  mobileViewMode: MobileViewMode;
  friendsLoading: boolean;
  friendsError: Error | null;
  onBack?: () => void;
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
    mobileViewMode,
    friendsLoading,
    friendsError,
    onBack,
  } = props;
  const {
    data,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    isPending: messagesLoading,
    error: messagesError,
  } = useMessagesQuery(chat?.chatId ?? -1, { enabled: chat != null });
  const { data: participants } = useQuery(
    getParticipantsByChatIdQueryOptions(chat?.chatId.toString() || ""),
  );
  const { data: reactions } = useQuery(
    getReactionsByChatIdQueryOptions(chat?.chatId || 0),
  );
  const { data: images } = useQuery(
    getImagesByChatIdQueryOptions(chat?.chatId.toString() || ""),
  );
  const { mutate: createMessage } = useCreateMessageMutation();
  const { mutate: inviteFriend } = useInviteFriendMutation();
  const { mutate: updateTitle } = useUpdateTitleMutation();
  const { mutate: deleteImage } = useDeleteImageMutation();
  const [notification, setNotification] = useState("");
  const [messageContent, setMessageContent] = useState("");
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
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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
  const { mutate: markMessageRead } = useMarkMessageReadMutation();
  const { mutateAsync: updateImageAsync } = useUpdateImageMutation();
  const [preview, setPreview] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messageHtml, setMessageHtml] = useState("");

  const messages = useMemo(() => {
    const flat = data?.pages.flatMap((page) => page.messages) ?? [];
    // Defensive dedupe: page windows shouldn't overlap in normal operation,
    // but a stale refetch or cache race could momentarily produce the same
    // messageId in two pages. Keep the first occurrence so ordering stays
    // stable.
    const seen = new Set<number>();
    return flat.filter((message) => {
      if (seen.has(message.messageId)) return false;
      seen.add(message.messageId);
      return true;
    });
  }, [data]);
  // anchorId only comes back on the initial/anchor-centered page, i.e. the
  // first page ever fetched for this chat — later before/after pages don't
  // carry one, so this stays stable once set.
  const anchorId = data?.pages[0]?.anchorId ?? null;

  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const messageElementRefs = useRef(new Map<number, HTMLDivElement>());
  const hasDoneInitialScrollRef = useRef(false);
  const lastMarkedReadIdRef = useRef<number | null>(null);
  // Set to true when we've decided a new message should scroll the view
  // down, but haven't actually scrolled yet. Cache updates don't commit
  // synchronously, so a layout effect does the scroll after React paints.
  const pendingScrollToBottomRef = useRef(false);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    // scrollIntoView (rather than containerRef.scrollTo) so this still works
    // regardless of which ancestor actually ends up scrollable at the
    // current viewport width (containerRef only gets a bounded height at
    // the md: breakpoint).
    bottomSentinelRef.current?.scrollIntoView({ behavior, block: "end" });
  }

  // Synchronous check (rather than relying on the IntersectionObserver's
  // last-known state, which updates asynchronously and can lag behind a
  // socket message that just arrived) for whether the user is already
  // close enough to the bottom that a new message should be revealed.
  function isNearBottom(threshold = 150) {
    const container = scrollContainerRef.current;
    if (!container) return false;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  }

  function setMessageElementRef(messageId: number) {
    return (el: HTMLDivElement | null) => {
      if (el) {
        messageElementRefs.current.set(messageId, el);
      } else {
        messageElementRefs.current.delete(messageId);
      }
    };
  }

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
          onSuccess: async (args) => {
            const pendingImages =
              images?.filter(
                (image) => image.userId === user.userId && !image.posted,
              ) ?? [];
            await Promise.all(
              pendingImages.map((image) =>
                updateImageAsync({
                  imageId: image.imageId,
                  messageId: args.messageId,
                }),
              ),
            );
            appendMessageToChatCache(queryClient, chat.chatId, args);
            pendingScrollToBottomRef.current = true;
            lastMarkedReadIdRef.current = args.messageId;
            // Broadcast the real persisted row (with its messageId) so every
            // recipient can dedupe and append it reliably.
            socket.emit("message", args);
          },
        },
      );
      setReplyMode(false);
    } else {
      createMessage(
        { content, chatId: chat.chatId, userId: user.userId },
        {
          onSuccess: async (args) => {
            const pendingImages =
              images?.filter(
                (image) => image.userId === user.userId && !image.posted,
              ) ?? [];
            await Promise.all(
              pendingImages.map((image) =>
                updateImageAsync({
                  imageId: image.imageId,
                  messageId: args.messageId,
                }),
              ),
            );
            appendMessageToChatCache(queryClient, chat.chatId, args);
            pendingScrollToBottomRef.current = true;
            lastMarkedReadIdRef.current = args.messageId;
            socket.emit("message", args);
          },
        },
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
        onSuccess: () => {
          socket.emit("message", {
            content: `user has entered the chat`,
            chatId: chat && chat.chatId,
            userId: user && user.userId,
            createdAt: new Date().toISOString(),
          });
          const invitedFriend = friends?.find((f) => f.email === email);
          if (invitedFriend) {
            socket.emit("chat", {
              title: chat.title,
              userId: user?.userId,
              friendId: invitedFriend.userId,
            });
          }
        },
      },
    );
    setAddFriendMode(false);
    if (chat) {
      queryClient.invalidateQueries({
        queryKey: ["messages", chat.chatId],
      });
    }
  }

  function handleUpdateTitle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newTitle = (e.target as HTMLFormElement).chattitle.value;
    updateTitle(
      {
        chatId: (chat && chat.chatId) || 0,
        title: newTitle,
      },
      {
        onSuccess: () => {
          socket.emit("chatUpdate", { chatId: chat?.chatId });
        },
      },
    );
    setEditTitleMode(false);
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

  // Runs after every commit that changed the message list. Only acts when
  // something upstream actually asked for a scroll (via the pending flag),
  // so this doesn't interfere with e.g. loading older pages.
  useLayoutEffect(() => {
    if (pendingScrollToBottomRef.current) {
      pendingScrollToBottomRef.current = false;
      scrollToBottom();
    }
  }, [messages]);

  // Reset per-chat state when switching chats, so stale refs/flags from the
  // previous chat don't leak into the new one.
  useEffect(() => {
    hasDoneInitialScrollRef.current = false;
    lastMarkedReadIdRef.current = null;
    pendingScrollToBottomRef.current = false;
    messageElementRefs.current.clear();
  }, [chat?.chatId]);

  // Live updates over the socket. The message payload is the actual
  // persisted row (with its messageId) — see the emit in handleSubmit above
  // — so every recipient, including a sender that gets its own message
  // echoed back, can dedupe against it reliably.
  useEffect(() => {
    if (chat == null) return;
    const chatId = chat.chatId;

    function handleIncomingMessage(raw: SerializedMessage) {
      if (raw.chatId !== chatId) return;
      // Some socket "message" events only carry { chatId, userId } as a
      // "something changed, go refetch" ping (e.g. edit/delete broadcasts) —
      // they aren't a real message row, so don't cache/render them.
      if (raw.content == null) return;
      queryClient.invalidateQueries({
        queryKey: ["images", chatId.toString()],
      });
      const wasNearBottom = isNearBottom();
      const message = mapSerializedMessageToSchema(raw);
      appendMessageToChatCache(queryClient, chatId, message);

      const isOwnMessage = user != null && message.userId === user.userId;
      if (isOwnMessage || wasNearBottom) {
        // Either it's something we just sent ourselves, or we're already
        // viewing the newest message — reveal it once the DOM catches up
        // with the cache update above.
        pendingScrollToBottomRef.current = true;
        if (!isOwnMessage) {
          lastMarkedReadIdRef.current = message.messageId;
          markMessageRead({ chatId, messageId: message.messageId });
        }
      }
    }

    socket.on("message", handleIncomingMessage);
    return () => {
      socket.off("message", handleIncomingMessage);
    };
  }, [chat, queryClient, user, markMessageRead]);

  // Initial positioning: jump to the anchor message (the user's last read
  // position) if one came back, otherwise land at the bottom (newest
  // messages, or a brand-new chat with nothing read yet).
  useLayoutEffect(() => {
    if (hasDoneInitialScrollRef.current) return;
    if (messagesLoading || messages.length === 0) return;

    if (anchorId != null) {
      const anchorEl = messageElementRefs.current.get(anchorId);
      anchorEl?.scrollIntoView({ block: "center" });
    } else {
      scrollToBottom("auto");
    }
    hasDoneInitialScrollRef.current = true;
  }, [messagesLoading, messages.length, anchorId]);

  // Preserve scroll position when older messages are prepended above the
  // current view — without this, prepending content shoves the viewport
  // down and the user loses their place.
  const prependAdjustmentRef = useRef<{ scrollHeight: number } | null>(null);
  useLayoutEffect(() => {
    if (isFetchingPreviousPage) {
      prependAdjustmentRef.current = {
        scrollHeight: scrollContainerRef.current?.scrollHeight ?? 0,
      };
    } else if (prependAdjustmentRef.current) {
      const container = scrollContainerRef.current;
      const prevHeight = prependAdjustmentRef.current.scrollHeight;
      prependAdjustmentRef.current = null;
      if (container) {
        container.scrollTop += container.scrollHeight - prevHeight;
      }
    }
  }, [isFetchingPreviousPage]);

  // Scroll-triggered pagination: watch top/bottom sentinels rather than
  // computing scroll math by hand on every scroll event. Also records the
  // read position once the user actually reaches the bottom.
  useEffect(() => {
    const container = scrollContainerRef.current;
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;
    if (!container || !topSentinel || !bottomSentinel || !chat) return;
    const chatId = chat.chatId;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === topSentinel) {
            if (
              entry.isIntersecting &&
              hasPreviousPage &&
              !isFetchingPreviousPage
            ) {
              fetchPreviousPage();
            }
          } else if (entry.target === bottomSentinel) {
            const atBottom = entry.isIntersecting && !hasNextPage;

            if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            } else if (atBottom) {
              const latest = messages[messages.length - 1];
              if (latest && latest.messageId !== lastMarkedReadIdRef.current) {
                lastMarkedReadIdRef.current = latest.messageId;
                markMessageRead({ chatId, messageId: latest.messageId });
              }
            }
          }
        }
      },
      { root: container, threshold: 0 },
    );
    observer.observe(topSentinel);
    observer.observe(bottomSentinel);
    return () => observer.disconnect();
  }, [
    chat,
    hasPreviousPage,
    hasNextPage,
    isFetchingPreviousPage,
    isFetchingNextPage,
    fetchPreviousPage,
    fetchNextPage,
    messages,
    markMessageRead,
  ]);

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
    deleteMessage(
      { messageId: (currentMessage && currentMessage.messageId) || 0 },
      {
        onSuccess: () => {
          socket.emit("message", {
            chatId: chat?.chatId,
            userId: user?.userId,
          });
        },
      },
    );
    images?.map(
      (image) =>
        currentMessage &&
        image.messageId === currentMessage.messageId &&
        deleteImage({ imageId: image.imageId }),
    );
    setDeleteMode(false);
  }

  function handleCreateReaction(
    e: React.FormEvent<HTMLFormElement>,
    message: Message | null,
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
      },
    );
    setReactionMode(false);
  }

  useEffect(() => {
    document.addEventListener("click", handleClickOutsideContextMenu);
    return () =>
      document.removeEventListener("click", handleClickOutsideContextMenu);
  }, []);

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    console.log((chat && chat.chatId) || "no chat");
    uploadImage(
      {
        userId: user!.userId,
        file,
        chatId: chat?.chatId.toString() || "",
        messageId:
          (currentMessage && currentMessage.messageId.toString()) || "",
      },
      { onSuccess: () => setUploadMode(false) },
    );

    // Clear the input value to ensure onChange fires even with same file
    event.target.value = "";
  }

  function handleDeleteImage(imageId: number) {
    deleteImage(
      { imageId: imageId },
      {
        onSuccess: () => {
          socket.emit("message", {
            chatId: chat?.chatId,
            userId: user?.userId,
          });
        },
      },
    );
  }

  useEffect(() => {
    const lastWord = messageContent.slice(0, cursorPosition).split(" ").pop();
    setShowSuggestions(lastWord?.startsWith("@") ?? false);
  }, [messageContent, cursorPosition]);

  function handleSelect(username: string) {
    const input = inputRef.current;
    if (!input) return;
    const beforeCursor = messageContent.slice(0, cursorPosition);
    const afterCursor = messageContent.slice(cursorPosition);
    const lastAt = beforeCursor.lastIndexOf("@");
    const newText =
      beforeCursor.slice(0, lastAt) + "@" + username + " " + afterCursor;
    setMessageContent(newText);
    setShowSuggestions(false);
    // Set caret position after inserted username
    setTimeout(() => {
      const pos = lastAt + username.length + 2;
      input.setSelectionRange(pos, pos);
      input.focus();
      setCursorPosition(pos);
    }, 0);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessageContent(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  }

  const handleInput = () => {
    const div = inputRef.current;
    if (!div) return;
    const raw = div.innerHTML;
    const parsed = raw.replace(/@(\w+)/g, (match, p1) => {
      const exists =
        participants && participants.find((p) => p.username === p1);
      return exists
        ? `<span class="text-blue-500 underline cursor-pointer" data-mention="${p1}">@${p1}</span>`
        : match;
    });
    setMessageHtml(parsed);
  };

  return (
    <div
      className="w-full h-screen md:w-[55%] flex flex-col relative bg-[#15151a] md:bg-[#202020]"
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
      <div className="shrink-0 relative px-5 pt-5">
        <div className="flex justify-between">
          <div className="flex items-center">
            {chat && (
              <IoArrowBack
                size={22}
                className="md:hidden mr-2 cursor-pointer"
                onClick={() => onBack?.()}
              />
            )}
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
        {(!chat || mobileViewMode === "default") && (
          <div className="absolute top-[250px] left-[37%]">
            <img src={capyness} alt="" />
            <div className="text-xl font-bold py-5 text-yellow-200">
              {" "}
              Start chatting with a friend!
            </div>
          </div>
        )}
        {menuMode && (
          <div className="absolute top-10 right-0 bg-[#202020] px-10 pb-5 z-40">
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
      <div className="relative flex-1 min-h-0">
        <div ref={scrollContainerRef} className="h-full overflow-auto px-5">
          <div ref={topSentinelRef} />
          {chat && messagesLoading ? (
            <div className="p-10">Loading...</div>
          ) : chat && messagesError ? (
            <div>Error loading messages</div>
          ) : (
            messages.map((message, i) => (
              <div
                className="text-white"
                key={message.messageId || `live-${i}`}
                ref={setMessageElementRef(message.messageId)}
              >
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
                      clickedFriend={clickedFriend}
                      handleCreateReaction={handleCreateReaction}
                      editMessageId={editMessageId}
                      setEditMessageId={setEditMessageId}
                      images={images}
                    />
                  </div>
                ) : message.userId === "notification" ? (
                  <Notification message={message} />
                ) : (
                  <div
                    onContextMenu={(e) => {
                      setCurrentMessage(message);
                      const friend =
                        friends?.find(
                          (friend) => message.userId === friend.userId,
                        ) ??
                        participants?.find(
                          (participant) =>
                            message.userId === participant.userId,
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
                      clickedFriend={clickedFriend}
                      handleCreateReaction={handleCreateReaction}
                      images={images}
                    />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomSentinelRef} />
        </div>
      </div>
      <div className="text-red-400 px-5">{notification}</div>
      {chat && (
        <div className="shrink-0 relative bg-[#15151a] md:bg-[#202020]">
          {replyMode && (
            <div className="flex justify-between px-6 py-2 bg-gray-700">
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
          {images && (
            <div className="flex px-[20px] pt-[10px]">
              {images.map(
                (image) =>
                  !image.posted &&
                  image.userId === user!.userId && (
                    <div className="relative" key={image.imageId}>
                      <FaTrashCan
                        size={20}
                        className="text-red-400 absolute top-0 right-0 bg-zinc-700 p-[3px] rounded"
                        onClick={() => handleDeleteImage(image.imageId)}
                      />
                      <img
                        src={`https://${image.imageUrl}`}
                        className="h-[100px] px-[10px]"
                      />
                    </div>
                  ),
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex m-5">
            <div className="bg-[#1b1b1b] border border-[#636363] rounded p-1 md:p-3 w-full mr-3 md:mr-0 flex">
              <FaPlusCircle
                size={27}
                onClick={() => setUploadMode(!uploadMode)}
                className="cursor-pointer pb-1"
              />
              <input
                type="text"
                ref={inputRef}
                className="w-[100%] outline-none pl-2"
                name="messagecontent"
                value={messageContent}
                onChange={handleChange}
                onClick={(e) =>
                  setCursorPosition(
                    (e.target as HTMLInputElement).selectionStart || 0,
                  )
                }
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
          {emojiMode && (
            <div
              className="absolute bottom-full right-4 mb-2 z-50 grid grid-cols-5 md:grid-cols-9 gap-2 text-xl bg-zinc-800 p-3 rounded"
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
            <div className="absolute bottom-full left-4 mb-2 z-50 w-[220px] bg-zinc-800 p-3 rounded">
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
          {showSuggestions && (
            <ul className="absolute bottom-full left-4 mb-2 z-50 bg-zinc-800 p-3 rounded">
              {participants &&
                participants.map((p) => (
                  <li
                    key={p.username}
                    className="flex pl-1 hover:bg-zinc-700 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      handleSelect(p.username);
                    }}
                  >
                    <img
                      src={p.profilePic || profilePic}
                      className="w-[25px] h-[25px] rounded-full mt-2"
                    />
                    <div className="p-2">{p.username}</div>
                  </li>
                ))}
            </ul>
          )}
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CgProfile } from "react-icons/cg";
import { IoExitOutline, IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { FaUserFriends } from "react-icons/fa";
import useAuthStore from "../store/AuthStore";
import { useEffect, useState } from "react";
import Friends from "../components/Friends";
import Chats from "../components/Chats";
import Messages from "../components/Messages";
import Profile from "../components/Profile";
import AddFriend from "../components/AddFriend";
import {
  getFriendsByEmailQueryOptions,
  getUserFriendsByEmailQueryOptions,
  useBlockUserMutation,
  useUnblockUserMutation,
} from "../lib/api/friend";
import { useQuery } from "@tanstack/react-query";
import io from "socket.io-client";
import { Friend } from "../lib/api/friend";
import FriendProfile from "../components/FriendProfile";
import {
  getChatsByUserIdQueryOptions,
  useCreateChatMutation,
  useLeaveChatMutation,
} from "../lib/api/chat";
import { Chat } from "../../../schemas/chats";
import profilePic from "/capypaul01.jpg";
import useParticipantStore from "../store/ParticipantStore";
import { queryClient } from "../main";
import {
  getUnreadMessagesByUserIdQueryOptions,
  useCreateMessageMutation,
} from "../lib/api/messages";
import Participants from "../components/Participants";

export const socket = io("https://capyapp-production.up.railway.app", {
  path: "/ws",
  transports: ["websocket", "polling"],
});

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { user, logoutService } = useAuthStore((state) => state);
  const [showChats, setShowChats] = useState(true);
  const [showFriends, setShowFriends] = useState(
    window.innerWidth > 760 ? true : false
  );
  const [showMessages, setShowMessages] = useState(
    window.innerWidth > 760 ? true : false
  );
  const [showProfile, setShowProfile] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friend, setFriend] = useState<Friend | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [showFriend, setShowFriend] = useState(false);
  const { data: friends } = useQuery(
    getFriendsByEmailQueryOptions(user?.email || "")
  );
  const { data: userFriends } = useQuery(
    getUserFriendsByEmailQueryOptions(user?.email || "")
  );
  const {
    data: chats,
    isLoading,
    error,
  } = useQuery(getChatsByUserIdQueryOptions(user?.userId || ""));
  const { data: unreads } = useQuery(
    getUnreadMessagesByUserIdQueryOptions(user?.userId || "")
  );
  const { participants } = useParticipantStore();
  const { mutate: createChat } = useCreateChatMutation();
  const { mutate: blockUser } = useBlockUserMutation();
  const { mutate: unblockUser } = useUnblockUserMutation();
  const { mutate: createMessage } = useCreateMessageMutation();
  const { mutate: leaveChat } = useLeaveChatMutation();
  const [leaveMode, setLeaveMode] = useState(false);
  const [menuMode, setMenuMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  } | null>(null);
  const [editTitleMode, setEditTitleMode] = useState(false);

  useEffect(() => {
    if (!user) navigate({ to: "/" });
  }, []);

  function handleCreateChat() {
    const title = `${user && user.username}, ${friend && friend.username}`;
    const userId = user!.userId;
    const friendId = friend!.userId;
    createChat(
      { title, userId, friendId },
      {
        onSuccess: (result) => {
          const targetChatId = result.chatId ?? result.chatId;
          setTimeout(() => {
            const updatedChats = queryClient.getQueryData<Chat[]>([
              "chats",
              userId,
            ]);
            const newChat = updatedChats?.find(
              (chat) => chat.chatId === targetChatId
            );
            if (newChat) clickedChat(newChat);
          }, 150);
          socket.emit("chat", { title, userId, friendId });
        },
      }
    );
  }

  function handleBlock() {
    const userEmail = user!.email;
    const friendEmail = friend!.email;
    blockUser({ userEmail, friendEmail });
  }

  function handleUnblock() {
    const userEmail = user!.email;
    const friendEmail = friend!.email;
    unblockUser({ userEmail, friendEmail });
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
    setChat(null);
    setContextMenu(null);
    setMenuMode(false);
  }

  function handleLogout() {
    logoutService();
    navigate({ to: "/login" });
  }

  function tappedFriends() {
    setShowFriends(true);
    setShowMessages(false);
    setShowChats(false);
    setShowProfile(false);
    setShowFriend(false);
    setShowAddFriend(false);
  }
  function tappedChats() {
    setShowFriends(false);
    setShowMessages(false);
    setShowChats(true);
    setShowProfile(false);
    setShowFriend(false);
    setShowAddFriend(false);
  }
  function tappedProfile() {
    setShowFriends(false);
    setShowMessages(false);
    setShowChats(false);
    setShowProfile(true);
    setShowFriend(false);
    setShowAddFriend(false);
  }

  function clickedProfile() {
    setShowMessages(false);
    setShowProfile(true);
    setShowAddFriend(false);
    setShowFriend(false);
    setChat(null);
  }

  function clickedAddFriend() {
    setShowMessages(false);
    setShowProfile(false);
    setShowAddFriend(true);
    setShowFriend(false);
    setShowProfile(false);
    setShowFriends(window.innerWidth < 760 ? false : true);
    setShowChats(window.innerWidth < 760 ? false : true);
  }

  function clickedFriend(currentFriend: Friend | null) {
    setFriend(currentFriend);
    setShowMessages(false);
    setShowAddFriend(false);
    setShowFriend(true);
    setShowProfile(false);
    setShowFriends(window.innerWidth < 760 ? false : true);
    setShowChats(window.innerWidth < 760 ? false : true);
    setChat(null);
  }

  function clickedChat(currentChat: Chat) {
    setChat(currentChat);
    setShowMessages(true);
    setShowAddFriend(false);
    setShowFriend(false);
    setShowProfile(false);
    setShowFriends(window.innerWidth < 760 ? false : true);
    setShowChats(window.innerWidth < 760 ? false : true);
  }

  return (
    <div className="flex flex-col bg-[#15151a] text-white min-h-screen">
      {leaveMode && (
        <div>
          <form
            onSubmit={handleLeaveChat}
            className="fixed top-[35%] left-[40%] text-xl z-50 bg-gray-900 p-10 rounded flex flex-col"
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
          <div className="fixed top-0 left-0 bg-black opacity-50 w-screen h-screen z-10"></div>
        </div>
      )}
      <main className="flex-1 relative z-0">
        <div className="md:flex">
          {showFriends && (
            <Friends
              clickedAddFriend={clickedAddFriend}
              clickedFriend={clickedFriend}
              friends={friends}
              userFriends={userFriends}
              setFriend={setFriend}
              friend={friend}
              handleCreateChat={handleCreateChat}
              handleBlock={handleBlock}
              handleUnblock={handleUnblock}
            />
          )}
          <div
            className="hidden md:flex fixed bottom-0 left-0 cursor-pointer p-10 bg-[#040406] md:bg-zinc-900 w-[14%]"
            onClick={handleLogout}
          >
            <IoExitOutline size={25} />
            <div className="ml-3">Logout</div>
          </div>
          {showChats && (
            <Chats
              chats={chats}
              clickedChat={clickedChat}
              unreads={unreads}
              setLeaveMode={setLeaveMode}
              contextMenu={contextMenu}
              setContextMenu={setContextMenu}
              editTitleMode={editTitleMode}
              setEditTitleMode={setEditTitleMode}
            />
          )}
          {showMessages && (
            <Messages
              chat={chat}
              setChat={setChat}
              user={user}
              friends={friends}
              friend={friend}
              setFriend={setFriend}
              clickedFriend={clickedFriend}
              userFriends={userFriends}
              setLeaveMode={setLeaveMode}
              menuMode={menuMode}
              setMenuMode={setMenuMode}
              editTitleMode={editTitleMode}
              setEditTitleMode={setEditTitleMode}
            />
          )}
          {showProfile && <Profile />}
          {showAddFriend && <AddFriend friends={friends} />}
          {showFriend && (
            <FriendProfile
              friend={friend}
              friends={friends}
              chats={chats}
              clickedChat={clickedChat}
              userFriends={userFriends}
              handleCreateChat={handleCreateChat}
              handleBlock={handleBlock}
              handleUnblock={handleUnblock}
            />
          )}
          <div className="hidden md:block md:w-[15%] md:h-screen overflow-auto md:bg-zinc-900">
            <div
              className="flex p-10 md:p-3 md:my-2 md:mx-4 cursor-pointer hover:bg-slate-600 transition-all ease duration-300"
              onClick={clickedProfile}
            >
              <CgProfile size={25} className="" />
              <div className="ml-2 text-xl">{user && user.username}</div>
            </div>
            {chat && (
              <Participants
                participants={participants}
                clickedAddFriend={clickedAddFriend}
                clickedFriend={clickedFriend}
                friends={friends}
                userFriends={userFriends}
                setFriend={setFriend}
                friend={friend}
                handleCreateChat={handleCreateChat}
                handleBlock={handleBlock}
                handleUnblock={handleUnblock}
              />
            )}
          </div>
        </div>
      </main>
      <div className="md:hidden fixed flex justify-between py-5 px-5 z-90  bottom-0 w-screen bg-[#27272c]">
        <div className="" onClick={() => tappedFriends()}>
          <FaUserFriends size={25} className="text-center mx-2" />
          <p className="text-center text-xs">Friends</p>
        </div>
        <div className="" onClick={tappedChats}>
          <IoChatbubbleEllipsesOutline size={25} className="text-center mx-2" />
          <p className="text-center text-xs">Chats</p>
        </div>
        <div onClick={tappedProfile} className="">
          <CgProfile size={25} className="text-center mx-2" />
          <p className="text-center text-xs">You</p>
        </div>
        <div onClick={handleLogout} className="text-xs">
          <IoExitOutline size={25} className="text-center mx-2" />
          Logout
        </div>
      </div>
    </div>
  );
}

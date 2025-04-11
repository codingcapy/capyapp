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
import { getFriendsByEmailQueryOptions } from "../lib/api/friend";
import { useQuery } from "@tanstack/react-query";
import io from "socket.io-client";
import { Friend } from "../lib/api/friend";
import FriendProfile from "../components/FriendProfile";
import { getChatsByUserIdQueryOptions } from "../lib/api/chat";
import { Chat } from "../../../schemas/chats";
import profilePic from "/capypaul01.jpg";
import useParticipantStore from "../store/ParticipantStore";

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
  const {
    data: chats,
    isLoading,
    error,
  } = useQuery(getChatsByUserIdQueryOptions(user?.userId || ""));
  const { participants } = useParticipantStore();

  useEffect(() => {
    if (!user) navigate({ to: "/" });
  }, []);

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

  function clickedFriend(currentFriend: Friend) {
    setFriend(currentFriend);
    setShowMessages(false);
    setShowAddFriend(false);
    setShowFriend(true);
    setShowProfile(false);
    setShowFriends(window.innerWidth < 760 ? false : true);
    setShowChats(window.innerWidth < 760 ? false : true);
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
    <div className="flex flex-col bg-[#040406] text-white min-h-screen">
      <main className="flex-1 relative z-0">
        <div className="md:flex">
          {showFriends && (
            <Friends
              clickedAddFriend={clickedAddFriend}
              clickedFriend={clickedFriend}
              friends={friends}
            />
          )}
          <div
            className="hidden md:flex fixed bottom-0 left-0 cursor-pointer p-10 bg-[#040406] md:bg-zinc-900 w-[14%]"
            onClick={handleLogout}
          >
            <IoExitOutline size={25} />
            <div className="ml-3">Logout</div>
          </div>
          {showChats && <Chats chats={chats} clickedChat={clickedChat} />}
          {showMessages && (
            <Messages
              chat={chat}
              setChat={setChat}
              user={user}
              friends={friends}
              friend={friend}
              setFriend={setFriend}
            />
          )}
          {showProfile && <Profile />}
          {showAddFriend && <AddFriend friends={friends} />}
          {showFriend && <FriendProfile friend={friend} />}
          <div className="hidden md:block md:w-[15%] md:h-screen overflow-auto md:bg-zinc-900">
            <div
              className="flex p-10 md:p-3 md:my-2 md:mx-4 cursor-pointer hover:bg-slate-600 transition-all ease duration-300"
              onClick={clickedProfile}
            >
              <CgProfile size={25} className="" />
              <div className="ml-2 text-xl">{user && user.username}</div>
            </div>
            {chat && (
              <div className="pl-[30px] pt-[20px]">
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
          </div>
        </div>
      </main>
      <div className="md:hidden fixed flex justify-between py-5 px-5 z-90  bottom-0 w-screen bg-[#040406]">
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

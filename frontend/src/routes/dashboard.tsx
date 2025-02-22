import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CgProfile } from "react-icons/cg";
import {
  IoExitOutline,
  IoChatbubbleOutline,
  IoChatbubbleEllipsesOutline,
} from "react-icons/io5";
import { FaUserFriends } from "react-icons/fa";
import useAuthStore from "../store/AuthStore";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { user, logoutService } = useAuthStore((state) => state);
  const [logoutMode, setLogoutMode] = useState(false);
  const [showChats, setShowChats] = useState(true);
  const [showFriends, setShowFriends] = useState(
    window.innerWidth > 760 ? true : false
  );
  const [showMessages, setShowMessages] = useState(
    window.innerWidth > 760 ? true : false
  );
  const [showProfile, setShowProfile] = useState(false);

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
  }
  function tappedChats() {
    setShowFriends(false);
    setShowMessages(false);
    setShowChats(true);
    setShowProfile(false);
  }
  function tappedProfile() {
    setShowFriends(false);
    setShowMessages(false);
    setShowChats(false);
    setShowProfile(true);
  }

  return (
    <div className="flex flex-col bg-[#040406] text-white min-h-screen">
      <main className="flex-1 relative z-0">
        <div className="md:flex">
          {showFriends && (
            <div className="md:w-[15%] md:border-r md:h-screen overflow-auto">
              <div className="flex p-10 md:py-5 md:px-7">
                <FaUserFriends size={25} className="" />
                <div className="ml-2 text-xl">Friends</div>
              </div>
              <div></div>
              <div
                className="hidden md:flex absolute bottom-0 left-0 cursor-pointer p-10 bg-[#040406] w-[14%]"
                onClick={handleLogout}
              >
                <IoExitOutline size={25} />
                <div className="ml-3">Logout</div>
              </div>
            </div>
          )}
          {showChats && (
            <div className="md:w-[15%] md:border-r md:h-screen overflow-auto">
              <div className="flex p-10 md:py-5 md:px-7">
                <IoChatbubbleEllipsesOutline size={25} className="" />
                <div className="ml-2 text-xl">Chats</div>
              </div>
            </div>
          )}
          {showMessages && (
            <div className="md:w-[55%] md:border-r md:h-screen overflow-auto">
              <div className="flex p-10 md:py-5 md:px-7">
                <IoChatbubbleOutline size={25} className="" />
                <div className="ml-2 text-xl">Messages</div>
              </div>
            </div>
          )}
          {showProfile && (
            <div className="md:hidden">
              <div className="flex p-10">
                <CgProfile size={25} className="" />
                <div className="ml-2 text-xl">Your Profile</div>
              </div>
            </div>
          )}
          <div className="hidden md:block md:w-[15%] md:h-screen overflow-auto">
            <div className="flex p-10 md:py-5 md:px-7">
              <CgProfile size={25} className="" />
              <div className="ml-2 text-xl">Your Profile</div>
            </div>
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

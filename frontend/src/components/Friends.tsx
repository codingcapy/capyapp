import { FaUserFriends } from "react-icons/fa";
import { Friend } from "../lib/api/friend";
import profilePic from "/capypaul01.jpg";
import { socket } from "../routes/dashboard";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useAuthStore from "../store/AuthStore";

export default function Friends(props: {
  clickedAddFriend: () => void;
  clickedFriend: (currentFriend: Friend) => void;
  friends: Friend[] | undefined;
}) {
  const { clickedAddFriend, clickedFriend, friends } = props;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  useEffect(() => {
    socket.on("friend", (data) => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ["friends", user?.email] });
    });
    return () => {
      socket.off("connect");
      socket.off("friend");
    };
  }, []);

  return (
    <div className="relative md:w-[15%] md:border-r md:h-screen overflow-auto">
      <div
        className="fixed top-0 left-0 bg-[#040406] px-5 pt-5 w-screen md:w-[14%]"
        onClick={clickedAddFriend}
      >
        <div className="flex">
          <FaUserFriends size={25} className="" />
          <div className="ml-2 text-xl">Friends</div>
        </div>
        <div className="py-3 my-2 cursor-pointer hover:bg-slate-600 transition-all ease duration-300">
          + Add a friend
        </div>
      </div>
      <div className="p-5 pt-[120px]">
        {friends?.map((friend) => (
          <div
            onClick={() => clickedFriend(friend)}
            className="flex py-2 px-1 cursor-pointer hover:bg-slate-600 transition-all ease duration-300"
            key={friend.userId}
          >
            <img
              src={friend.profilePic ? friend.profilePic : profilePic}
              className="w-[40px] rounded-full"
            />
            <div className="ml-2 py-2">{friend.username}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

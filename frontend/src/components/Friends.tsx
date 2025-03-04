import { FaUserFriends } from "react-icons/fa";
import { Friend } from "../lib/api/friend";
import profilePic from "/capypaul01.jpg";

export default function Friends(props: {
  clickedAddFriend: () => void;
  clickedFriend: (currentFriend: Friend) => void;
  friends: Friend[] | undefined;
}) {
  const { clickedAddFriend, clickedFriend, friends } = props;

  return (
    <div className="relative md:w-[15%] md:border-r md:h-screen overflow-auto">
      <div
        className="fixed top-0 left-0 bg-[#040406] p-5 w-screen md:w-[14%]"
        onClick={clickedAddFriend}
      >
        <div className="flex">
          <FaUserFriends size={25} className="" />
          <div className="ml-2 text-xl">Friends</div>
        </div>
        <div className="pt-5 cursor-pointer">+ Add a friend</div>
      </div>
      <div className="p-5 pt-[120px]">
        {friends?.map((friend) => (
          <div
            onClick={() => clickedFriend(friend)}
            className="flex py-2 px-1 cursor-pointer hover:bg-slate-600 transition-all ease duration-300"
            key={friend.userId}
          >
            <img src={profilePic} className="w-[40px] rounded-full" />
            <div className="ml-2 py-2">{friend.username}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { FaUserFriends } from "react-icons/fa";
import { Friend } from "../lib/api/friend";

export default function Friends(props: {
  clickedAddFriend: () => void;
  friends: Friend[] | undefined;
}) {
  const { clickedAddFriend, friends } = props;

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
        {friends?.map((friend) => <div>{friend.username}</div>)}
      </div>
    </div>
  );
}

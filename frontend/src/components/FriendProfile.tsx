import { Friend, useCreateFriendMutation } from "../lib/api/friend";
import { CgProfile } from "react-icons/cg";
import profilePic from "/capypaul01.jpg";
import useAuthStore from "../store/AuthStore";
import { socket } from "../routes/dashboard";
import { Chat } from "../../../schemas/chats";
import { useState } from "react";
import { UserFriend } from "../../../schemas/userfriends";

export default function FriendProfile(props: {
  friend: Friend | null;
  friends: Friend[] | undefined;
  chats: Chat[] | undefined;
  clickedChat: (currentChat: Chat) => void;
  userFriends: UserFriend[] | undefined;
  handleCreateChat: () => void;
  handleBlock: () => void;
  handleUnblock: () => void;
}) {
  const {
    friend,
    friends,
    userFriends,
    handleCreateChat,
    handleBlock,
    handleUnblock,
  } = props;
  const { user } = useAuthStore();
  const { mutate: createFriend } = useCreateFriendMutation();
  const isFriend =
    friends && friends.find((x) => friend && x.userId == friend.userId);
  const isUser = friend && friend.userId === user?.userId;
  const [notification, setNotification] = useState("");
  const [successNotification, setSuccessNotification] = useState("");
  const userFriend =
    userFriends &&
    friend &&
    userFriends?.find((userFriend) => friend?.email == userFriend?.friendEmail);
  const isBlocked = userFriend && userFriend.blocked;

  function handleAddFriend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    createFriend(
      { userEmail: user!.email, friendEmail: (friend && friend.email) || "" },
      {
        onSuccess: (result) => {
          setSuccessNotification("Friend added successfully!");
          socket.emit("friend", result);
        },
        onError: (errorMessage) => {
          setNotification("");
          setNotification(errorMessage.toString());
        },
      }
    );
  }

  return (
    <div className="md:w-[55%] bg-[#15151a] md:bg-[#202020] md:h-screen overflow-auto">
      <div className="fixed top-0 left-0 md:left-[30%] flex bg-[#15151a] md:bg-[#202020] p-5 w-screen md:w-[54%]">
        <CgProfile size={25} className="" />
        <div className="ml-2 text-xl">{friend && friend.username}</div>
      </div>
      <div className="p-5 pt-[100px]">
        <img
          src={friend?.profilePic ? friend.profilePic : profilePic}
          className="max-w-30 md:max-w-xs rounded-full mx-auto pb-2"
        />
        {isFriend && !isUser && !isBlocked && (
          <button
            className="border-2 border-cyan-600 text-cyan-600 font-bold px-5 py-2 my-5 w-[300px] mx-auto rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300"
            onClick={handleCreateChat}
          >
            Start chat
          </button>
        )}
        {!isFriend && !isUser && (
          <form onSubmit={handleAddFriend}>
            <button className="border-2 border-cyan-600 text-cyan-600 font-bold px-5 py-2 my-5 w-[300px] mx-auto rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300">
              Add friend
            </button>
          </form>
        )}
        {notification}
        {successNotification}
        <div>
          <div>
            Username: <span className="font-bold">{friend?.username}</span>
          </div>
          <div>
            Member since:{" "}
            <span className="font-bold">
              {friend?.createdAt.toString().slice(4, 16)}
            </span>
          </div>
        </div>
        {isFriend && !isUser && !isBlocked && (
          <button
            onClick={handleBlock}
            className="text-red-400 p-3 mt-5 hover:bg-[#2e2e2e] ease-in-out duration-300 rounded"
          >
            Block
          </button>
        )}
        {isFriend && !isUser && isBlocked && (
          <button
            onClick={handleUnblock}
            className="text-red-400 p-3 mt-5 hover:bg-[#2e2e2e] ease-in-out duration-300 rounded"
          >
            Blocked
          </button>
        )}
      </div>
    </div>
  );
}

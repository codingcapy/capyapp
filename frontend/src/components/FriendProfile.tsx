import { Friend, useCreateFriendMutation } from "../lib/api/friend";
import { CgProfile } from "react-icons/cg";
import profilePic from "/capypaul01.jpg";
import useAuthStore from "../store/AuthStore";
import { useCreateChatMutation } from "../lib/api/chat";
import { socket } from "../routes/dashboard";
import { Chat } from "../../../schemas/chats";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function FriendProfile(props: {
  friend: Friend | null;
  friends: Friend[] | undefined;
  chats: Chat[] | undefined;
  clickedChat: (currentChat: Chat) => void;
}) {
  const { friend, friends, chats, clickedChat } = props;
  const { user } = useAuthStore();
  const { mutate: createChat } = useCreateChatMutation();
  const { mutate: createFriend } = useCreateFriendMutation();
  const queryClient = useQueryClient();
  const isFriend =
    friends && friends.find((x) => friend && x.userId == friend.userId);
  const isUser = friend && friend.userId === user?.userId;
  const [notification, setNotification] = useState("");
  const [successNotification, setSuccessNotification] = useState("");

  function handleSubmit() {
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
        {isFriend && !isUser && (
          <button
            className="border-2 border-cyan-600 text-cyan-600 font-bold px-5 py-2 my-5 w-[300px] mx-auto rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300"
            onClick={handleSubmit}
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
      </div>
    </div>
  );
}

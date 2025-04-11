import { Friend } from "../lib/api/friend";
import { CgProfile } from "react-icons/cg";
import profilePic from "/capypaul01.jpg";
import useAuthStore from "../store/AuthStore";
import { useCreateChatMutation } from "../lib/api/chat";
import { socket } from "../routes/dashboard";
import { Chat } from "../../../schemas/chats";
import { useQueryClient } from "@tanstack/react-query";

export default function FriendProfile(props: {
  friend: Friend | null;
  chats: Chat[] | undefined;
  clickedChat: (currentChat: Chat) => void;
}) {
  const { friend, chats, clickedChat } = props;
  const { user } = useAuthStore();
  const { mutate: createChat } = useCreateChatMutation();
  const queryClient = useQueryClient();

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
        <button
          className="border-2 border-cyan-600 text-cyan-600 font-bold px-5 py-2 my-5 w-[300px] mx-auto rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300"
          onClick={handleSubmit}
        >
          Start chat
        </button>
      </div>
    </div>
  );
}

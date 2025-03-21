import { Message } from "../../../schemas/messages";
import { Friend } from "../lib/api/friend";
import useAuthStore from "../store/AuthStore";
import profilePic from "/capypaul01.jpg";

export default function MessageComponent(props: {
  message: Message;
  friends: Friend[];
}) {
  const { user } = useAuthStore();
  const { message, friends } = props;
  const friendname = friends.map((friend) => {
    if (friend.userId === message.replyUserId) return friend.username;
  });
  const username = user && user.username.toString();

  return (
    <div className="p-3 flex hover:bg-slate-600 transition-all ease duration-300">
      <img src={profilePic} className="w-[40px] h-[40px] rounded-full mr-2" />
      <div>
        <div className="flex">
          <div className="font-bold px-1">{username}</div>
          <div className="pl-2 text-gray-400">
            on {message.createdAt.toString().slice(0, 25)}
          </div>
        </div>
        <div className="overflow-wrap break-word">{message.content}</div>
      </div>
    </div>
  );
}

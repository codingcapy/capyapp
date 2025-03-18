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
    if (friend.userId === message.userId) return friend.username;
  });
  const username = user && user.username.toString();

  return (
    <div>
      <img src={profilePic} className="w-[40px] h-[40px] rounded-full mr-2" />
      <div>
        {friendname} {username}
      </div>
      <div>{message.content}</div>
    </div>
  );
}

import { UserFriend } from "../../../schemas/userfriends";
import { Friend } from "../lib/api/friend";
import profilePic from "/capypaul01.jpg";

export default function Participants(props: {
  participants: Friend[] | undefined;
  clickedAddFriend: () => void;
  clickedFriend: (currentFriend: Friend | null) => void;
  friends: Friend[] | undefined;
  userFriends: UserFriend[] | undefined;
  setFriend: (friend: Friend | null) => void;
  friend: Friend | null;
  handleCreateChat: () => void;
  handleBlock: () => void;
  handleUnblock: () => void;
}) {
  const {
    participants,
    clickedAddFriend,
    clickedFriend,
    friends,
    userFriends,
    setFriend,
    friend,
    handleCreateChat,
    handleBlock,
    handleUnblock,
  } = props;

  return (
    <div className="pl-[30px] pt-[20px]">
      <div className="text-xl pb-2">Participants</div>
      {participants?.map((participant) => (
        <div
          onClick={() => clickedFriend(participant)}
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
  );
}

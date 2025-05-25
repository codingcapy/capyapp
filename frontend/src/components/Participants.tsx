import { useEffect, useRef, useState } from "react";
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
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left + container.scrollLeft;
    const y = event.clientY - rect.top + container.scrollTop;
    setContextMenu({
      visible: true,
      x,
      y,
    });
  }

  function handleClickOutside(event: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setContextMenu(null);
    }
  }

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="pl-[30px] pt-[20px] relative" ref={containerRef}>
      <div className="text-xl pb-2">Participants</div>
      {participants?.map((participant) => (
        <div
          onClick={() => clickedFriend(participant)}
          className="flex pl-1 hover:bg-zinc-800 cursor-pointer"
          key={participant.userId}
          onContextMenu={(e) => {
            handleContextMenu(e);
            setFriend(participant);
          }}
        >
          <img
            src={participant.profilePic || profilePic}
            alt=""
            className="w-[25px] h-[25px] rounded-full mt-2"
          />
          <div className="p-2">{participant.username}</div>
        </div>
      ))}
      {contextMenu?.visible && (
        <div
          ref={menuRef}
          className="absolute bg-[#1A1A1A] p-2 z-[99] border border-[#555555] rounded"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left"
            onClick={() => {
              clickedFriend(friend);
              setContextMenu(null);
            }}
          >
            Profile
          </button>
          <button
            className="block px-4 py-2 hover:bg-[#373737] w-full text-left"
            onClick={() => {
              handleCreateChat();
              setContextMenu(null);
            }}
          >
            Start Chat
          </button>
        </div>
      )}
    </div>
  );
}

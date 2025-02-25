import { FaUserFriends } from "react-icons/fa";
import { useCreateFriendMutation } from "../lib/api/friend";
import useAuthStore from "../store/AuthStore";

export default function AddFriend() {
  const { mutate: createFriend } = useCreateFriendMutation();
  const { user } = useAuthStore();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).email.value;
    createFriend({ userEmail: user!.email, friendEmail: email });
    createFriend({ userEmail: email, friendEmail: user!.email });
  }

  return (
    <div className="md:w-[55%] md:border-r md:h-screen overflow-auto">
      <div className="fixed top-0 left-0 md:left-[30%] flex bg-[#040406] p-5 w-screen md:w-[54%]">
        <FaUserFriends size={25} className="" />
        <div className="ml-2 text-xl">Add Friend</div>
      </div>
      <form onSubmit={handleSubmit} className="pt-[100px] p-5 flex flex-col">
        <input
          type="email"
          placeholder="Enter friend's email address"
          className="border p-2"
          id="email"
          name="email"
        />
        <button className="border-2 border-cyan-600 text-cyan-600 font-bold px-5 py-2 my-5 w-[300px] mx-auto rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300">
          Add
        </button>
      </form>
    </div>
  );
}

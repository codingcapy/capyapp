import { CgProfile } from "react-icons/cg";
import profilePic from "/capypaul01.jpg";
import useAuthStore from "../store/AuthStore";

export default function Profile() {
  const { user } = useAuthStore();

  return (
    <div className="md:w-[55%] md:border-r md:h-screen overflow-auto">
      <div className="fixed top-0 left-0 md:left-[30%] flex bg-[#040406] p-5 w-screen md:w-[54%]">
        <CgProfile size={25} className="" />
        <div className="ml-2 text-xl">Your Profile</div>
      </div>
      <div className="p-5 pt-[70px]">
        <img
          src={profilePic}
          className="max-w-30 md:max-w-xs rounded-full mx-auto pb-2"
        />
        <p className="my-1 md:my-3">Username: {user && user.username}</p>
        <p className="my-1 md:my-3">
          Member Since: {user && user.createdAt.toString().slice(0, 10)}
        </p>
      </div>
    </div>
  );
}

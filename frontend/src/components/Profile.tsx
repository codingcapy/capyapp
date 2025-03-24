import { CgProfile } from "react-icons/cg";
import profilePic from "/capypaul01.jpg";
import useAuthStore from "../store/AuthStore";
import { useState } from "react";
import { useUpdateProfilePicMutation } from "../lib/api/user";

export default function Profile() {
  const { user } = useAuthStore();
  const [preview, setPreview] = useState<string | null>(null);
  const { mutate: updateProfilePic } = useUpdateProfilePicMutation();

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        updateProfilePic({
          profilePic: (reader.result as string) || "",
          userId: (user && user.userId) || "",
        });
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="md:w-[55%] md:border-r md:h-screen overflow-auto">
      <div className="fixed top-0 left-0 md:left-[30%] flex bg-[#040406] p-5 w-screen md:w-[54%]">
        <CgProfile size={25} className="" />
        <div className="ml-2 text-xl">Your Profile</div>
      </div>
      <div className="p-5 pt-[70px]">
        <img
          src={preview ? preview : profilePic}
          className="max-w-30 md:max-w-xs rounded-full mx-auto pb-2"
        />
        <div className="mb-5">
          <label className="border-2 border-cyan-600 text-cyan-600 font-bold px-5 py-2 my-5 w-[300px] mx-auto rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300">
            Edit Profile Pic
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        </div>
        <p className="my-1 md:my-3">Username: {user && user.username}</p>
        <p className="my-1 md:my-3">
          Member Since: {user && user.createdAt.toString().slice(0, 10)}
        </p>
      </div>
    </div>
  );
}

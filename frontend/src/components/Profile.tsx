import { CgProfile } from "react-icons/cg";
import profilePic from "/capypaul01.jpg";
import useAuthStore from "../store/AuthStore";
import { useEffect, useRef, useState } from "react";
import {
  useUpdatePasswordMutation,
  useUpdateProfilePicMutation,
  useUpdateUsernameMutation,
} from "../lib/api/user";

export default function Profile() {
  const { user } = useAuthStore();
  const [preview, setPreview] = useState<string | null>(null);
  const { mutate: updateProfilePic } = useUpdateProfilePicMutation();
  const { mutate: updatePassword } = useUpdatePasswordMutation();
  const { mutate: updateUsername } = useUpdateUsernameMutation();
  const [editUsernameMode, setEditUsernameMode] = useState(false);
  const [editPasswordMode, setEditPasswordMode] = useState(false);
  const [usernameContent, setUsernameContent] = useState(
    (user && user.username) || ""
  );
  const [successNotification, setSuccessNotification] = useState("");
  const usernameInputRef = useRef<HTMLInputElement | null>(null);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 150 * 1024) {
        alert("File size exceeds 150KB. Please upload a smaller file.");
        return;
      }
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

  function handleUpdatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newPassword = (e.target as HTMLFormElement).password.value;
    updatePassword({
      userId: (user && user.userId) || "",
      password: newPassword,
    });
    setSuccessNotification("Password updated successfully!");
    setEditPasswordMode(false);
  }

  function handleUpdateUsername(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newUsername = (e.target as HTMLFormElement).username.value;
    updateUsername({
      userId: (user && user.userId) || "",
      username: newUsername,
    });
    setSuccessNotification("Password updated successfully!");
    setEditUsernameMode(false);
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (
      usernameInputRef.current &&
      !usernameInputRef.current.contains(event.target as Node)
    ) {
      setEditUsernameMode(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="md:w-[55%] md:border-r md:h-screen overflow-auto">
      <div className="fixed top-0 left-0 md:left-[30%] flex bg-[#040406] p-5 w-screen md:w-[54%]">
        <CgProfile size={25} className="" />
        <div className="ml-2 text-xl">Your Profile</div>
      </div>
      <div className="p-5 pt-[70px]">
        <img
          src={
            user && user.profilePic
              ? user.profilePic
              : preview
                ? preview
                : profilePic
          }
          className="max-w-30 md:max-w-xs rounded-full mx-auto pb-2 mb-5"
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
        <div className="my-10">
          <div className="text-2xl font-bold">Your Account</div>
          {!editUsernameMode && (
            <p
              onClick={() => setEditUsernameMode(true)}
              className="my-1 md:my-3 cursor-pointer"
            >
              Username: {user && user.username}
            </p>
          )}
          {editUsernameMode && (
            <form onSubmit={handleUpdateUsername}>
              <input
                type="text"
                name="username"
                ref={usernameInputRef}
                className="px-2 py-1 mt-2 border"
                value={usernameContent}
                onChange={(e) => setUsernameContent(e.target.value)}
              />
              <button type="submit" className="hidden">
                Submit
              </button>
            </form>
          )}
          <p className="my-1 md:my-3">
            Member Since: {user && user.createdAt.toString().slice(0, 10)}
          </p>
        </div>
        <div className="my-10">
          <div className="text-2xl font-bold mt-5">Authentication</div>
          {!editPasswordMode && (
            <div>
              <div
                onClick={() => setEditPasswordMode(true)}
                className="border-2 border-cyan-600 text-cyan-600 font-bold px-5 py-2 my-5 w-[185px] rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300 cursor-pointer"
              >
                Change Password
              </div>
              <div className="text-green-400 text-center">
                {successNotification}
              </div>
            </div>
          )}
          {editPasswordMode && (
            <form onSubmit={handleUpdatePassword} className="flex flex-col">
              <label htmlFor="" className="pt-5">
                Enter new password
              </label>
              <input
                type="password"
                name="password"
                className="px-2 py-1 mt-2 border max-w-[300px]"
              />
              <div className="flex">
                <button
                  type="button"
                  className="w-[100px] text-cyan-500 cursor-pointer"
                  onClick={() => setEditPasswordMode(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-2 border-cyan-600 text-cyan-600 font-bold px-5 py-2 my-5 w-[100px] rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

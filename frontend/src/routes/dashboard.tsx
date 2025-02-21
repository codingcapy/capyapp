import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CgProfile } from "react-icons/cg";
import {
  IoExitOutline,
  IoChatbubbleOutline,
  IoChatbubbleEllipsesOutline,
} from "react-icons/io5";
import { FaUserFriends } from "react-icons/fa";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  function handleLogout() {
    navigate({ to: "/" });
  }

  return (
    <div className="flex flex-col fixed min-h-full min-w-full mx-auto bg-[#040406] text-white">
      <main className="flex-1">
        <div className="flex cursor-pointer p-10" onClick={handleLogout}>
          <IoExitOutline size={25} />
          <div className="ml-3">Logout</div>
        </div>
      </main>
    </div>
  );
}

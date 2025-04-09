import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import useAuthStore from "../store/AuthStore";

export const Route = createFileRoute("/_header/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [loadingNotification, setLoadingNotification] = useState("");
  const [notification, setNotification] = useState("");
  const { loginService, authLoading, user } = useAuthStore((state) => state);

  useEffect(() => {
    if (!!user) {
      navigate({ to: "/dashboard" });
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).email.value;
    const password = (e.target as HTMLFormElement).password.value;
    loginService(email, password);
    if (authLoading) setLoadingNotification("Loading...");
    if (!user) {
      setTimeout(() => {
        setNotification("Invalid login credentials");
      }, 700);
    }
  }

  return (
    <main className="flex-1 bg-[#040406] text-white">
      <div className="relative bg-gradient-to-b from-cyan-600 to-[#040406] w-[320px] md:w-[500px] mx-auto h-[80vh]">
        <div className="bg-[#040406] absolute top-0 left-[2px] w-[316px] md:w-[496px] h-[80vh]">
          <h1 className=" relative z-2 pt-20 pb-10 text-center text-4xl md:text-6xl font-bold">
            Login
          </h1>
          <form
            onSubmit={handleSubmit}
            className="relative z-2 flex flex-col mx-auto"
          >
            <input
              type="email"
              placeholder="Email"
              className="mx-auto border p-2 my-2 md:w-[300px]"
              id="email"
              name="email"
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="mx-auto border p-2 my-2 md:w-[300px]"
              id="password"
              name="password"
              required
            />
            <button className="py-2 px-5 my-5 text-2xl tracking-widest bg-cyan-600 w-[200px] md:w-[300px] mx-auto cursor-pointer">
              LOGIN
            </button>
            <div className="mx-auto">
              Don't have an accountt?{" "}
              <Link to="/signup" className="font-bold">
                Sign up
              </Link>
            </div>
          </form>
          <div className="text-red-400 text-center">{notification}</div>
          <div className="text-center">{loadingNotification}</div>
        </div>
      </div>
    </main>
  );
}

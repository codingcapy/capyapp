import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCreateUserMutation } from "../lib/api/user";
import { useState } from "react";

export const Route = createFileRoute("/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { mutate: createUser } = useCreateUserMutation();
  const [notification, setNotification] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const username = (e.target as HTMLFormElement).username.value;
    const email = (e.target as HTMLFormElement).email.value;
    const password = (e.target as HTMLFormElement).password.value;
    console.log(username);
    console.log(email);
    console.log(password);
    if (username.length > 32)
      return setNotification("Username too long! Max character limit is 32");
    if (email.length > 255) return setNotification("Email too long!");
    if (password.length > 80)
      return setNotification("Password too long! Max character limit is 80");
    createUser(
      { username, email, password },
      {
        onSuccess: () => navigate({ to: "/dashboard" }),
        onError: (errorMessage) => setNotification(errorMessage.toString()),
      }
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-[#040406] text-white">
        <div className="relative bg-gradient-to-b from-cyan-600 to-[#040406] w-[320px] md:w-[500px] mx-auto h-[80vh]">
          <div className="bg-[#040406] absolute top-0 left-[2px] w-[316px] md:w-[496px] h-[80vh]">
            <h1 className=" relative z-2 pt-20 pb-10 text-center text-4xl md:text-6xl font-bold">
              Sign Up
            </h1>
            <form
              onSubmit={handleSubmit}
              className="relative z-2 flex flex-col mx-auto"
            >
              <input
                type="text"
                placeholder="Username"
                className="mx-auto border p-2 my-2 md:w-[300px]"
                id="username"
                name="username"
                required
              />
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
                SIGNUP
              </button>
              <div className="mx-auto">
                Already have an account?{" "}
                <Link to="/login" className="font-bold">
                  Login
                </Link>
              </div>
              <div className="text-red-400 text-center">{notification}</div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

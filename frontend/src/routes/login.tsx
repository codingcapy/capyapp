import { createFileRoute, Link } from "@tanstack/react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-[#040406] text-white">
        <div className="relative bg-gradient-to-b from-cyan-600 to-[#040406] w-[320px] md:w-[500px] mx-auto h-[80vh]">
          <div className="bg-[#040406] absolute top-0 left-[2px] w-[316px] md:w-[496px] h-[80vh]">
            <h1 className=" relative z-2 pt-20 pb-10 text-center text-4xl md:text-6xl font-bold">
              Login
            </h1>
            <form action="" className="relative z-2 flex flex-col mx-auto">
              <input
                type="text"
                placeholder="Email"
                className="mx-auto border p-2 my-2 md:w-[300px]"
              />
              <input
                type="text"
                placeholder="Password"
                className="mx-auto border p-2 my-2 md:w-[300px]"
              />
              <button className="py-2 px-5 my-3 text-2xl tracking-widest bg-cyan-600 w-[200px] md:w-[300px] mx-auto">
                LOGIN
              </button>
              <div className="mx-auto">
                Don't have an accountt?{" "}
                <Link to="/signup" className="font-bold">
                  Sign up
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

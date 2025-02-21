import { createFileRoute, Link } from "@tanstack/react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-[#040406] text-white">
        <h1 className="pt-20 pb-10 text-center text-4xl md:text-6xl font-bold">
          CapyApp
        </h1>
        <h2 className="text-center text-2xl md:text-3xl">
          Get chatty like the capys do.
        </h2>
        <h2 className="text-center text-2xl md:text-3xl">
          Connect with friends and family all around the world.
        </h2>
        <Link to="/signup">
          <div className="text-2xl md:text-4xl pt-2 pb-3 px-5 my-10 border rounded mx-auto w-[300px] text-center hover:bg-white hover:text-black ease-in-out duration-300">
            Start chatting
          </div>
        </Link>
      </main>
      <Footer />
    </div>
  );
}

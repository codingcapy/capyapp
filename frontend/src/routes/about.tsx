import { createFileRoute } from "@tanstack/react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const Route = createFileRoute("/about")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col min-h-screen bg-[#040406]">
      <Header />
      <main className="flex-1 text-white max-w-[800px] mx-auto p-3">
        <h1 className=" relative z-2 pt-20 pb-10 text-center text-4xl md:text-6xl font-bold">
          About
        </h1>
        <p className="text-center mb-10 text-xl">
          CapyApp is a chat app that allows you to be as chatty as capybaras.
        </p>
        <p className="text-center text-xl mb-10">
          Capybaras are semi-aquatic mammals native to South America. They are
          the largest rodents in the world and are extremely social and
          friendly.
        </p>
        <p className="text-center text-xl mb-10">
          With CapyApp, you can connect with friends and family all around the
          world.
        </p>
      </main>
      <Footer />
    </div>
  );
}

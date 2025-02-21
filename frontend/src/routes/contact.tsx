import { createFileRoute } from "@tanstack/react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const Route = createFileRoute("/contact")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col min-h-screen bg-[#040406]">
      <Header />
      <main className="flex-1 text-white max-w-[800px] mx-auto">
        <h1 className=" relative z-2 pt-20 pb-5 text-center text-4xl md:text-6xl font-bold">
          Contact
        </h1>
        <h2 className="text-center pb-10">Lettuce know what you need</h2>
        <form action="" className="relative z-2 flex flex-col mx-auto">
          <input
            type="text"
            placeholder="Email"
            className="mx-auto border p-2 my-2 w-[300px] md:w-[400px]"
          />
          <textarea
            placeholder="Your message"
            className="mx-auto border p-2 my-2 w-[300px] md:w-[400px]"
            rows={10}
          />
          <button className="py-2 px-5 my-3 text-2xl tracking-widest bg-cyan-600 w-[200px] md:w-[300px] mx-auto">
            SEND
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}

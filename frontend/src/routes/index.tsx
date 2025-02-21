import { createFileRoute } from "@tanstack/react-router";
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
      </main>
      <Footer />
    </div>
  );
}

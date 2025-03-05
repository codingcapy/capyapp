import { createFileRoute, Outlet } from "@tanstack/react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const Route = createFileRoute("/_header")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col min-h-screen bg-[#040406]">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}

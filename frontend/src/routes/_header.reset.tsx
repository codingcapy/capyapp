import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_header/reset")({
  component: RouteComponent,
});

function RouteComponent() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <main className="flex-1 bg-[#040406] text-white">
      <div className="relative bg-gradient-to-b from-cyan-600 to-[#040406] w-[320px] md:w-[500px] mx-auto h-[80vh]">
        <div className="bg-[#040406] absolute top-0 left-[2px] w-[316px] md:w-[496px] h-[80vh]">
          <h1 className=" relative z-2 pt-20 pb-10 text-center text-4xl md:text-6xl font-bold">
            Reset Password
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
            <button className="py-2 px-5 my-5 text-2xl tracking-widest bg-cyan-600 w-[200px] md:w-[300px] mx-auto cursor-pointer">
              RESET
            </button>
          </form>
          <div className="flex flex-col">
            <div className="mx-auto">
              Don't have an account?{" "}
              <Link to="/signup" className="font-bold">
                Sign up
              </Link>
            </div>
            <div className="mx-auto">
              Returning user?{" "}
              <Link to="/login" className="font-bold">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

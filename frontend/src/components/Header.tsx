import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import useAuthStore from "../store/AuthStore";
import { CgProfile } from "react-icons/cg";

export default function Header() {
  const [navVisible, setNavVisible] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 760) {
        setNavVisible(true);
      } else {
        setNavVisible(false);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function slideToggle() {
    if (window.innerWidth < 760) setNavVisible(!navVisible);
  }
  return (
    <header className="fixed top-0 left-0 z-[99] w-screen bg-[#040406] text-white py-5 px-7">
      <div className="md:flex justify-between">
        <div className="md:flex">
          <div className="flex justify-between">
            <Link to="/">
              <div className="flex">
                <img src="/capyness.png" alt="" className="w-[30px] h-auto" />
                <div className="hidden md:block ml-5 mr-2 text-center py-2 md:py-1">
                  Home
                </div>
              </div>
            </Link>
            <button
              id="hamburger-menu"
              className="text-3xl md:hidden text-[#8778D7]"
              onClick={slideToggle}
            >
              &#x2630;
            </button>
          </div>
          <div
            className={`${navVisible ? "visible" : ""} md:flex`}
            id="main-nav"
          >
            <Link to="/about">
              <div className="mx-2 text-center py-2 md:py-1">About</div>
            </Link>
            <Link to="/contact">
              <div className="mx-2 text-center py-2 md:py-1">Contact</div>
            </Link>
            {!user && (
              <Link to="/login">
                <div className="md:hidden mx-2 text-center py-2">Login</div>
              </Link>
            )}
            {!user && (
              <Link to="/signup">
                <div className="md:hidden mx-2 text-center py-2">Signup</div>
              </Link>
            )}
            {user && (
              <Link to="/signup">
                <div className="md:hidden flex flex-col">
                  <div className="flex mx-auto">
                    <CgProfile size={25} className="" />
                    <div className="ml-2 text-xl">{user && user.username}</div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
        <div className="md:flex">
          {!user && (
            <Link to="/login">
              <div className="hidden md:block mx-2 text-center py-2 md:py-1">
                Login
              </div>
            </Link>
          )}
          {!user && (
            <Link to="/signup">
              <div className="hidden md:block mx-2 text-center py-1 px-3 border rounded hover:bg-white hover:text-black ease-in-out duration-300">
                Signup
              </div>
            </Link>
          )}

          {user && (
            <Link to="/dashboard">
              {" "}
              <div className="hidden md:flex">
                <CgProfile size={25} className="" />
                <div className="ml-2 text-xl">{user && user.username}</div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export default function Header() {
  const [navVisible, setNavVisible] = useState(false);

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
                <div className="ml-5 mr-2 text-center py-2 md:py-1">Home</div>
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
            <div className="mx-2 text-center py-2 md:py-1">About</div>
            <div className="mx-2 text-center py-2 md:py-1">Contact</div>
            <div className="md:hidden mx-2 text-center py-2">Login</div>
            <div className="md:hidden mx-2 text-center py-2">Signup</div>
          </div>
        </div>
        <div className="md:flex">
          <div className="hidden md:block mx-2 text-center py-2 md:py-1">
            Login
          </div>
          <div className="hidden md:block mx-2 text-center py-1 px-3 border rounded">
            Signup
          </div>
        </div>
      </div>
    </header>
  );
}

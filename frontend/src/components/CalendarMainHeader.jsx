import React, { useContext, useState, useEffect } from "react";
import Context from "../context/Context";
import { AuthContext } from "../context/AuthContext";
import CreateEventButton from "./CreateEventButton";
import logoutIcon from "../assets/log-out.svg";

const CalendarHeader = ({ onOpenAIModal }) => {
  const { currentUser, logout } = useContext(AuthContext);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 540);
    };

    checkScreenSize();

    // Set up event listener for resize events
    window.addEventListener("resize", checkScreenSize);

    // Clean up
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <header className="pb-2 flex gap-2 justify-between items-center">
      <h1 className="header-font text-4xl font-bold text-black">
        {isSmallScreen ? "IQ" : "CalendarIQ"}
      </h1>
      <div className="flex items-center gap-2">
        <CreateEventButton />
        <div className="flex gap-2 items-center bg-white h-10 border border-gray-200 rounded-full px-1 shadow-custom">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-medium">
              {currentUser?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="text-center">
              <h3 className="font-medium">{currentUser?.name}</h3>
              <p className="text-xs text-gray-500">{currentUser?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="cursor-pointer text-sm shrink-0">
            <img
              src={logoutIcon}
              width="30"
              height="30"
              className="hover:opacity-50 transition-opacity "
              alt="Logout"
            />
          </button>
        </div>
      </div>
    </header>
  );
};

export default CalendarHeader;

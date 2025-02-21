import React, { useContext } from "react";
import Context from "../context/Context";

const Sidebar = () => {
  const { setIsMonthView, setIsWeekView } = useContext(Context);

  return (
    <aside className="w-50 border-gray-200 border-r flex flex-col items-center gap-2">
      <h1 className="text-center my-3 font-bold text-2xl">CalendarApp</h1>
      <button
        onClick={() => {
          setIsWeekView(false);
          setIsMonthView(true);
        }}
        className="hover:bg-gray-100 bg-white cursor-pointer border w-[90%] h-10 border-gray-200 rounded-lg"
      >
        Month
      </button>
      <button
        onClick={() => {
          setIsMonthView(false);
          setIsWeekView(true);
        }}
        className=" hover:bg-gray-100 bg-white cursor-pointer border  w-[90%] h-10 border-gray-200 rounded-lg"
      >
        Week
      </button>
    </aside>
  );
};

export default Sidebar;

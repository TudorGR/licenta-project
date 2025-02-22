import React, { useContext, useState } from "react";
import Context from "../context/Context";

const Sidebar = () => {
  const {
    setIsMonthView,
    setIsWeekView,
    setIsDayView,
    isMonthView,
    isWeekView,
    isDayView,
  } = useContext(Context);

  return (
    <aside className=" w-50 border-gray-200 border-r flex flex-col items-center gap-2">
      <h1 className="text-center my-3 font-bold text-2xl">CalendarApp</h1>
      <button
        onClick={() => {
          setIsMonthView(true);
          setIsWeekView(false);
          setIsDayView(false);
        }}
        className={`transition-all cursor-pointer border w-[90%] h-10 border-gray-200 rounded-md ${
          isMonthView ? "bg-black text-white" : "bg-white hover:bg-gray-100"
        }`}
      >
        Month
      </button>
      <button
        onClick={() => {
          setIsMonthView(false);
          setIsWeekView(true);
          setIsDayView(false);
        }}
        className={`transition-all cursor-pointer border w-[90%] h-10 border-gray-200 rounded-md ${
          isWeekView ? "bg-black text-white" : "bg-white hover:bg-gray-100"
        }`}
      >
        Week
      </button>
      <button
        onClick={() => {
          setIsMonthView(false);
          setIsWeekView(false);
          setIsDayView(true);
        }}
        className={`transition-all cursor-pointer border w-[90%] h-10 border-gray-200 rounded-md ${
          isDayView ? "bg-black text-white" : "bg-white hover:bg-gray-100"
        }`}
      >
        Day
      </button>
    </aside>
  );
};

export default Sidebar;

import React, { useContext } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";
import CreateEventButton from "./CreateEventButton";
import left from "../assets/chevron-left.svg";
import right from "../assets/chevron-right.svg";

const CalendarHeader = () => {
  const {
    monthIndex,
    setMonthIndex,
    setSelectedDay,
    isMonthView,
    setSelectedWeek,
    selectedWeek,
  } = useContext(Context);

  const getCurrentWeekIndex = () => {
    const today = dayjs();
    const firstDayOfMonth = today.startOf("month");
    const firstDayOfFirstWeek = firstDayOfMonth.startOf("week");
    const diff = today.diff(firstDayOfFirstWeek, "day");
    return Math.floor(diff / 7);
  };

  const handlePrevMonth = () => {
    if (isMonthView) {
      setMonthIndex(monthIndex - 1);
    } else {
      setSelectedWeek(Math.max(0, selectedWeek - 1));
    }
  };
  const handleNextMonth = () => {
    if (isMonthView) {
      setMonthIndex(monthIndex + 1);
    } else {
      setSelectedWeek(Math.min(4, selectedWeek + 1));
    }
  };
  const handleToday = () => {
    setMonthIndex(dayjs().month());
    setSelectedWeek(getCurrentWeekIndex());
    setSelectedDay(dayjs());
  };
  return (
    <header className="px-4 py-2 flex justify-between items-center">
      <div className="flex">
        <div className="flex items-center justify-between w-54">
          <button
            className="cursor-pointer hover:bg-gray-100 rounded-full border-gray-200 border-1 p-1.5"
            onClick={handlePrevMonth}
          >
            <img src={left} className="w-6" />
          </button>
          <div className="flex items-center">
            <h2 className="text-base">
              {dayjs(new Date(dayjs().year(), monthIndex)).format("MMMM")}
            </h2>
            <h2 className="text-lg text-gray-400">
              , {dayjs(new Date(dayjs().year(), monthIndex)).format("YYYY")}
            </h2>
          </div>
          <button
            className="cursor-pointer hover:bg-gray-100 rounded-full border-gray-200 border-1 p-1.5"
            onClick={handleNextMonth}
          >
            <img src={right} className="w-6" />
          </button>
        </div>
        <button
          onClick={handleToday}
          className="hover:bg-gray-100 cursor-pointer border w-28 h-10 border-gray-200 rounded-md ml-4"
        >
          Today
        </button>
      </div>
      <CreateEventButton />
    </header>
  );
};

export default CalendarHeader;

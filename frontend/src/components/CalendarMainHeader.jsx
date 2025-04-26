import React, { useContext } from "react";
import Context from "../context/Context";
import { AuthContext } from "../context/AuthContext";
import dayjs from "dayjs";
import CreateEventButton from "./CreateEventButton";
import left from "../assets/chevron-left.svg";
import right from "../assets/chevron-right.svg";
import logoutIcon from "../assets/log-out.svg";

const CalendarHeader = ({ onOpenAIModal }) => {
  const {
    monthIndex,
    setMonthIndex,
    setSelectedDay,
    isMonthView,
    setSelectedWeek,
    selectedWeek,
    isDayView,
    selectedDay,
    isWeekView,
  } = useContext(Context);
  const { currentUser, logout } = useContext(AuthContext);

  const getCurrentWeekIndex = () => {
    const today = dayjs();
    const firstDayOfMonth = today.startOf("month");
    const firstDayOfWeek = firstDayOfMonth.startOf("week").add(1, "day");
    const weekIndex = Math.floor(today.diff(firstDayOfWeek, "day") / 7);

    // Clamp the weekIndex to the valid range for the current month
    const lastDayOfMonth = firstDayOfMonth.endOf("month");
    const totalWeeksInMonth = Math.ceil(lastDayOfMonth.date() / 7);
    return Math.min(Math.max(0, weekIndex), totalWeeksInMonth - 1);
  };

  const handlePrev = () => {
    if (isMonthView) {
      setMonthIndex(monthIndex - 1);
    } else if (isDayView) {
      setSelectedDay(selectedDay.subtract(1, "day"));
    } else {
      const firstDayOfMonth = dayjs(new Date(dayjs().year(), monthIndex, 1));
      const weekStart = firstDayOfMonth
        .startOf("week")
        .add(1, "day")
        .add(selectedWeek, "week");

      if (selectedWeek === 0) {
        const prevMonth = firstDayOfMonth.subtract(1, "month");
        const weeksInPrevMonth = Math.ceil(prevMonth.daysInMonth() / 7);
        setMonthIndex(monthIndex - 1);
        setSelectedWeek(weeksInPrevMonth - 1);
      } else {
        setSelectedWeek(selectedWeek - 1);
      }
    }
  };

  const handleNext = () => {
    if (isMonthView) {
      setMonthIndex(monthIndex + 1);
    } else if (isDayView) {
      setSelectedDay(selectedDay.add(1, "day"));
    } else {
      const firstDayOfMonth = dayjs(new Date(dayjs().year(), monthIndex, 1));
      const lastDayOfMonth = firstDayOfMonth.endOf("month");
      const weeksInMonth = Math.ceil(lastDayOfMonth.date() / 7);

      if (selectedWeek >= weeksInMonth - 1) {
        setMonthIndex(monthIndex + 1);
        setSelectedWeek(0);
      } else {
        setSelectedWeek(selectedWeek + 1);
      }
    }
  };

  return (
    <header className="pb-2 flex justify-between items-center">
      <h1 className="header-font text-4xl font-bold text-black">CalendarIQ</h1>
      <div className="flex items-center gap-2">
        <CreateEventButton />
        <div className="flex gap-2 items-center bg-white border border-gray-200 rounded-full px-1 shadow-custom">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-medium">
              {currentUser?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="text-center">
              <h3 className="font-medium">{currentUser?.name}</h3>
              <p className="text-xs text-gray-500">{currentUser?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="cursor-pointer text-sm">
            <img
              src={logoutIcon}
              width="30"
              height="30"
              className="hover:opacity-50 transition-opacity"
            />
          </button>
        </div>
      </div>
    </header>
  );
};

export default CalendarHeader;

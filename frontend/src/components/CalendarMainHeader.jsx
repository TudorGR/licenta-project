import React, { useContext } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";
import CreateEventButton from "./CreateEventButton";
import left from "../assets/chevron-left.svg";
import right from "../assets/chevron-right.svg";

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
    <header className="pb-2 flex justify-between items-center ">
      <h1 className="text-4xl font-bold text-white">CalendarIQ</h1>
      <div className="flex">
        <button
          onClick={onOpenAIModal}
          className="px-4 transition-all shadow-custom active:bg-gray-700 cursor-pointer h-10 text-black bg-white rounded-full ml-2 flex items-center justify-center gap-2"
        >
          <span className="text-nowrap">Quick Add</span>
          <kbd className="text-xs bg-black text-white px-2 py-0.5 rounded-full">
            Ctrl+Space
          </kbd>
        </button>
        <CreateEventButton />
      </div>
    </header>
  );
};

export default CalendarHeader;

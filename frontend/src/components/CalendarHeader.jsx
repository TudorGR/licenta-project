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
    setIsMonthView,
    setIsWeekView,
    setIsDayView,
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

  const handleToday = () => {
    setMonthIndex(dayjs().month());
    setSelectedWeek(getCurrentWeekIndex());
    setSelectedDay(dayjs());
  };

  const getHeaderText = () => {
    if (isDayView) {
      return (
        <div className="flex flex-nowrap text-nowrap">
          <h2 className="text-sm">{selectedDay.format("DD, MMMM")}</h2>
          <h2 className="text-sm text-gray-400">
            {selectedDay.format(", YYYY")}
          </h2>
        </div>
      );
    }

    if (isWeekView) {
      const firstDayOfMonth = dayjs(new Date(dayjs().year(), monthIndex, 1));
      const weekStart = firstDayOfMonth
        .startOf("week")
        .add(1, "day")
        .add(selectedWeek, "week");
      const weekEnd = weekStart.add(6, "day");

      if (weekStart.month() !== weekEnd.month()) {
        return (
          <div className="flex flex-nowrap text-nowrap">
            <h2 className="text-sm">
              {weekStart.format("MMMM")}-{weekEnd.format("MMMM")}
            </h2>
            <h2 className="text-sm text-gray-400">
              , {weekStart.format("YYYY")}
            </h2>
          </div>
        );
      }

      return (
        <div className="flex flex-nowrap text-nowrap">
          <h2 className="text-sm">{weekStart.format("MMMM")}</h2>
          <h2 className="text-sm text-gray-400">
            , {weekStart.format("YYYY")}
          </h2>
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap text-nowrap">
        <h2 className="text-sm">
          {dayjs(new Date(dayjs().year(), monthIndex)).format("MMMM")}
        </h2>
        <h2 className="text-sm text-gray-400">
          , {dayjs(new Date(dayjs().year(), monthIndex)).format("YYYY")}
        </h2>
      </div>
    );
  };

  return (
    <header className="px-2 py-2 flex justify-between items-center border-gray-200 border-b">
      <div className="flex">
        <button
          onClick={handleToday}
          className="transition-all shadow-custom text-sm cursor-pointer border-1 w-20 h-10 border-gray-200 rounded-full mr-2 active:bg-gray-50"
        >
          Today
        </button>
        <div className={`flex items-center justify-between gap-1`}>
          <button
            className="transition-all  cursor-pointer  w-10 h-10 shadow-custom rounded-full active:bg-gray-50 border-1 border-gray-200"
            onClick={handlePrev}
          >
            <img src={left} className="w-5 mx-auto" />
          </button>
          <button
            className="transition-all  cursor-pointer w-10 h-10 shadow-custom rounded-full active:bg-gray-50 border-1 border-gray-200"
            onClick={handleNext}
          >
            <img src={right} className="w-5 mx-auto" />
          </button>
          <div className="mx-2 flex items-center">{getHeaderText()}</div>
        </div>
      </div>
      <div className="flex items-center rounded-full shadow-custom">
        <button
          onClick={() => {
            setIsMonthView(true);
            setIsWeekView(false);
            setIsDayView(false);
          }}
          className={`active:bg-gray-50 text-sm transition-all border-1 border-gray-200 cursor-pointer h-10 px-4 rounded-l-full ${
            isMonthView ? "text-black " : "text-gray-400"
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
          className={`active:bg-gray-50 text-sm transition-all border-1 border-gray-200 border-x-0 cursor-pointer h-10 px-4 ${
            isWeekView ? "text-black " : "text-gray-400"
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
          className={`active:bg-gray-50 text-sm transition-all border-1 border-gray-200 cursor-pointer h-10 px-4 rounded-r-full ${
            isDayView ? "text-black " : "text-gray-400"
          }`}
        >
          Day
        </button>
      </div>
    </header>
  );
};

export default CalendarHeader;

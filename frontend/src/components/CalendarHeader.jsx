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
    return Math.max(0, weekIndex);
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
        <>
          <h2 className="text-base">{selectedDay.format("DD, MMMM")}</h2>
          <h2 className="text-base text-gray-400">
            {selectedDay.format(", YY")}
          </h2>
        </>
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
          <>
            <h2 className="text-base">
              {weekStart.format("MMMM")}-{weekEnd.format("MMMM")}
            </h2>
            <h2 className="text-base text-gray-400">
              , {weekStart.format("YYYY")}
            </h2>
          </>
        );
      }

      return (
        <>
          <h2 className="text-base">{weekStart.format("MMMM")}</h2>
          <h2 className="text-base text-gray-400">
            , {weekStart.format("YYYY")}
          </h2>
        </>
      );
    }

    return (
      <>
        <h2 className="text-base">
          {dayjs(new Date(dayjs().year(), monthIndex)).format("MMMM")}
        </h2>
        <h2 className="text-base text-gray-400">
          , {dayjs(new Date(dayjs().year(), monthIndex)).format("YYYY")}
        </h2>
      </>
    );
  };

  return (
    <header className="px-2 py-2 flex justify-between items-center border-gray-200 border-b">
      <div className="flex">
        <button
          onClick={handleToday}
          className="transition-all  hover:bg-gray-100 cursor-pointer border w-20 h-8 border-gray-200 rounded-md mr-2"
        >
          Today
        </button>
        <div className={`flex items-center justify-between`}>
          <button
            className="transition-all  cursor-pointer  p-1.5"
            onClick={handlePrev}
          >
            <img src={left} className="w-5" />
          </button>
          <button
            className="transition-all  cursor-pointer  p-1.5"
            onClick={handleNext}
          >
            <img src={right} className="w-5" />
          </button>
          <div className="ml-2 flex items-center">{getHeaderText()}</div>
        </div>
      </div>
      <div className="flex">
        <button
          onClick={onOpenAIModal}
          className="px-2 transition-all hover:bg-gray-700 cursor-pointer h-8 text-white bg-black rounded-md ml-2 flex items-center justify-center gap-2"
        >
          <span className="text-nowrap">Quick Add</span>
          <kbd className="text-xs bg-gray-700 px-1 py-0.5 rounded">
            Ctrl+Space
          </kbd>
        </button>
        <CreateEventButton />
      </div>
    </header>
  );
};

export default CalendarHeader;

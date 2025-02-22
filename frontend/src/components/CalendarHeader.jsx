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
  } = useContext(Context);

  const getCurrentWeekIndex = () => {
    const today = dayjs();
    const firstDayOfMonth = today.startOf("month");
    const firstDayOfFirstWeek = firstDayOfMonth.startOf("week");
    const diff = today.diff(firstDayOfFirstWeek, "day");
    return Math.floor(diff / 7);
  };

  const handlePrev = () => {
    if (isMonthView) {
      setMonthIndex(monthIndex - 1);
    } else if (isDayView) {
      setSelectedDay(selectedDay.subtract(1, "day"));
    } else {
      if (selectedWeek === 0) {
        setMonthIndex(monthIndex - 1);
        setSelectedWeek(4);
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
      if (selectedWeek === 4) {
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

  return (
    <header className="px-4 py-2 flex justify-between items-center border-gray-200 border-b">
      <div className="flex">
        <div className=" flex items-center justify-between w-54">
          <button
            className="transition-all  cursor-pointer hover:bg-gray-100 rounded-full border-gray-200 border-1 p-1.5"
            onClick={handlePrev}
          >
            <img src={left} className="w-6" />
          </button>
          <div className="flex items-center">
            {isDayView ? (
              <>
                <h2 className="text-base">{selectedDay.format("DD, MMMM")}</h2>
                <h2 className="text-base text-gray-400">
                  {selectedDay.format(", YY")}
                </h2>
              </>
            ) : (
              <>
                <h2 className="text-base">
                  {dayjs(new Date(dayjs().year(), monthIndex)).format("MMMM")}
                </h2>
                <h2 className="text-base text-gray-400">
                  , {dayjs(new Date(dayjs().year(), monthIndex)).format("YYYY")}
                </h2>
              </>
            )}
          </div>
          <button
            className="transition-all  cursor-pointer hover:bg-gray-100 rounded-full border-gray-200 border-1 p-1.5"
            onClick={handleNext}
          >
            <img src={right} className="w-6" />
          </button>
        </div>
        <button
          onClick={handleToday}
          className="transition-all  hover:bg-gray-100 cursor-pointer border w-28 h-10 border-gray-200 rounded-md ml-4"
        >
          Today
        </button>
      </div>
      <div className="flex">
        <button
          onClick={onOpenAIModal}
          className="px-2 transition-all hover:bg-gray-700 cursor-pointer border h-10 text-white bg-black rounded-md ml-4 flex items-center justify-center gap-2"
        >
          <span className="text-nowrap">Quick Add</span>
          <kbd className="text-xs bg-gray-700 px-2 py-0.5 rounded">
            Ctrl+Space
          </kbd>
        </button>
        <CreateEventButton />
      </div>
    </header>
  );
};

export default CalendarHeader;

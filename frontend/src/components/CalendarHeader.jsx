import React, { useContext, useState, useRef, useEffect } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";
import CreateEventButton from "./CreateEventButton";
import left from "../assets/chevron-left.svg";
import right from "../assets/chevron-right.svg";
import chatIcon from "../assets/message-circle.svg";
import menuIcon from "../assets/menu.svg";
import chevronDown from "../assets/chevron-down.svg";

const CalendarHeader = ({
  showChat,
  onOpenAIChat,
  showSidebar,
  onOpenSidebar,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

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
    <header className="px-2 py-2 flex justify-between items-center border-gray-200 border-b ">
      <div className="flex">
        {!showSidebar && (
          <button
            onClick={onOpenSidebar}
            className="shrink-0 shadow-custom transition-all max-[768px]:w-10 active:bg-gray-50 cursor-pointer border-gray-200 rounded-full flex gap-1 items-center justify-center mr-2 border h-10 px-2 md:px-4"
          >
            <img src={menuIcon} className="w-4" />
            <span className="ml-1 text-sm hidden md:inline">Menu</span>
          </button>
        )}
        <button
          onClick={handleToday}
          className="shrink-0 transition-all shadow-custom text-sm cursor-pointer border-1 border-gray-200 rounded-full mr-2 active:bg-gray-50 h-10 max-[768px]:w-10 w-20 px-2"
        >
          <span className="hidden md:inline">Today</span>
          <span className="md:hidden">{dayjs().format("D")}</span>
        </button>
        <div className={`flex items-center justify-between gap-2`}>
          <button
            className="transition-all cursor-pointer w-10 h-10 shadow-custom rounded-full active:bg-gray-50 border-1 border-gray-200"
            onClick={handlePrev}
          >
            <img src={left} className="w-5 mx-auto" />
          </button>
          <button
            className="transition-all cursor-pointer w-10 h-10 shadow-custom rounded-full active:bg-gray-50 border-1 border-gray-200"
            onClick={handleNext}
          >
            <img src={right} className="w-5 mx-auto" />
          </button>
          <div className="mx-2 flex items-center max-[768px]:hidden ">
            {getHeaderText()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* View toggle buttons */}
        <div className="relative">
          {/* Desktop view - regular buttons */}
          <div className="hidden md:flex items-center rounded-full shadow-custom">
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

          {/* Mobile view - dropdown */}
          <div className="md:hidden" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex gap-1 items-center shadow-custom border-1 border-gray-200 transition-all rounded-full px-4 h-10 active:bg-gray-50"
            >
              <span className="text-sm">
                {isMonthView ? "Month" : isWeekView ? "Week" : "Day"}
              </span>
              <img src={chevronDown} className="w-4 h-4" alt="Select view" />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-20 w-32">
                <button
                  onClick={() => {
                    setIsMonthView(true);
                    setIsWeekView(false);
                    setIsDayView(false);
                    setDropdownOpen(false);
                  }}
                  className={`transition-all w-full text-left px-4 py-2 text-sm hover:opacity-50 ${
                    isMonthView ? "font-medium " : "text-gray-500"
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => {
                    setIsMonthView(false);
                    setIsWeekView(true);
                    setIsDayView(false);
                    setDropdownOpen(false);
                  }}
                  className={`transition-all w-full text-left px-4 py-2 text-sm hover:opacity-50 ${
                    isWeekView ? "font-medium" : "text-gray-500"
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => {
                    setIsMonthView(false);
                    setIsWeekView(false);
                    setIsDayView(true);
                    setDropdownOpen(false);
                  }}
                  className={`transition-all w-full text-left px-4 py-2 text-sm hover:opacity-50 ${
                    isDayView ? "font-medium" : "text-gray-500"
                  }`}
                >
                  Day
                </button>
              </div>
            )}
          </div>
        </div>
        {!showChat && (
          <button
            onClick={onOpenAIChat}
            className="shadow-custom shrink-0 active:bg-gray-700 cursor-pointer text-white bg-black rounded-full flex gap-1 items-center transition-all justify-center max-[768px]:w-10 h-10 px-2 md:px-4"
          >
            <img src={chatIcon} className="w-4 h-4 md:mr-1 invert" alt="Chat" />
            <span className="text-sm hidden md:inline">Assistant</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default CalendarHeader;

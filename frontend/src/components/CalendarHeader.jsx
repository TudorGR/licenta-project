import React, { useContext, useState, useRef, useEffect } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";
import CreateEventButton from "./CreateEventButton";
import left from "../assets/chevron-left.svg";
import right from "../assets/chevron-right.svg";
import chatIcon from "../assets/message-circle.svg";
import menuIcon from "../assets/menu.svg";
import chevronDown from "../assets/chevron-down.svg";
import analyticsIcon from "../assets/bar-chart-2.svg";

import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);

const CalendarHeader = ({
  showChat,
  onOpenAIChat,
  showSidebar,
  onOpenSidebar,
  onOpenAnalytics,
  showAnalyticsDashboard,
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
    selectedDate,
    setSelectedDate,
    setMonthIndex,
    selectedDay,
    setSelectedDay,
    isMonthView,
    isWeekView,
    isDayView,
    setIsMonthView,
    setIsWeekView,
    setIsDayView,
  } = useContext(Context);

  // Simplified navigation handlers using selectedDate
  const handlePrev = () => {
    if (isMonthView) {
      const newDate = selectedDate.subtract(1, "month");
      setSelectedDate(newDate);
      setMonthIndex(newDate.month());
    } else if (isDayView) {
      const newDate = selectedDate.subtract(1, "day");
      setSelectedDate(newDate);
      setSelectedDay(newDate);
    } else if (isWeekView) {
      setSelectedDate(selectedDate.subtract(1, "week"));
    }
  };

  const handleNext = () => {
    if (isMonthView) {
      const newDate = selectedDate.add(1, "month");
      setSelectedDate(newDate);
      setMonthIndex(newDate.month());
    } else if (isDayView) {
      const newDate = selectedDate.add(1, "day");
      setSelectedDate(newDate);
      setSelectedDay(newDate);
    } else if (isWeekView) {
      setSelectedDate(selectedDate.add(1, "week"));
    }
  };

  const handleToday = () => {
    const today = dayjs();
    setSelectedDate(today);
    setMonthIndex(today.month()); // Update monthIndex for compatibility
    setSelectedDay(today);
  };

  const getHeaderText = () => {
    if (isDayView) {
      return (
        <div className="flex flex-nowrap text-nowrap">
          <h2 className="text-sm">{selectedDate.format("DD, MMMM")}</h2>
          <h2 className="text-sm text-gray-400">
            {selectedDate.format(", YYYY")}
          </h2>
        </div>
      );
    }

    if (isWeekView) {
      const weekStart = selectedDate.startOf("isoWeek").add(1, "day");
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
        <h2 className="text-sm">{selectedDate.format("MMMM")}</h2>
        <h2 className="text-sm text-gray-400">
          , {selectedDate.format("YYYY")}
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
        <div className="relative">
          <div className="hidden sm:flex items-center rounded-full shadow-custom">
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

          <div className="sm:hidden" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex gap-1 items-center shadow-custom border-1 border-gray-200 transition-all rounded-full px-4 h-10 active:bg-gray-50"
            >
              <span className="text-sm">
                {isMonthView ? "Month" : isWeekView ? "Week" : "Day"}
              </span>
              <img src={chevronDown} className="w-4 h-4" alt="Select view" />
            </button>

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
        <button
          onClick={onOpenAnalytics}
          className="shadow-custom shrink-0 active:bg-gray-700 cursor-pointer text-white bg-black rounded-full flex gap-1 items-center transition-all justify-center max-[768px]:w-10 h-10 px-2 md:px-4"
        >
          <img
            src={analyticsIcon}
            className={`w-4 h-4 md:mr-1`}
            alt="Analytics"
          />
          <span className="text-sm hidden md:inline">Analytics</span>
        </button>
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

import dayjs from "dayjs";
import React, { useContext, useEffect, useState } from "react";
import { getCalendarMonth } from "../util";
import Context from "../context/Context";
import left from "../assets/chevron-left.svg";
import right from "../assets/chevron-right.svg";

export default function SmallCalendar() {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(dayjs().month());
  const [currentMonth, setCurrentMonth] = useState(getCalendarMonth());
  const { monthIndex, setSmallCalendarMonth, selectedDay, setSelectedDay } =
    useContext(Context);

  useEffect(() => {
    setCurrentMonth(getCalendarMonth(currentMonthIndex));
  }, [currentMonthIndex]);

  useEffect(() => {
    setCurrentMonthIndex(monthIndex);
  }, [monthIndex]);

  function handlePrevMonth() {
    setCurrentMonthIndex(currentMonthIndex - 1);
  }
  function handleNextMonth() {
    setCurrentMonthIndex(currentMonthIndex + 1);
  }
  function getDay(day) {
    const nowDay = dayjs().format("DD-MM-YY");
    const currentDay = day.format("DD-MM-YY");
    const sDay = selectedDay && selectedDay.format("DD-MM-YY");
    if (nowDay === currentDay) return "bg-black rounded-full text-white";
    else if (sDay === currentDay)
      return "bg-blue-100 rounded-full text-blue-600";
    else return "hover:bg-gray-200";
  }
  function isSameMonth(day) {
    return day.month() === currentMonthIndex;
  }
  return (
    <div className="z-20 bg-white rounded-md absolute top-1/2 left-1/3 shadow-2xl p-4 w-60">
      <header className="flex justify-between">
        <p className="font-bold">
          {dayjs(new Date(dayjs().year(), currentMonthIndex)).format(
            "MMMM YYYY"
          )}
        </p>
        <div>
          <button className="cursor-pointer" onClick={handlePrevMonth}>
            <img src={left} className="w-6" />
          </button>
          <button className="cursor-pointer" onClick={handleNextMonth}>
            <img src={right} className="w-6" />
          </button>
        </div>
      </header>
      <div className="grid grid-cols-7 grid-rows-6">
        {currentMonth[0].map((day, index) => (
          <span key={index} className="text-sm py-1 text-center">
            {day.format("dd").charAt(0)}
          </span>
        ))}
        {currentMonth.map((row, index) => (
          <React.Fragment key={index}>
            {row.map((day, index) => (
              <button
                key={index}
                className={`${
                  isSameMonth(day) ? "" : "text-gray-300"
                } rounded-full cursor-pointer py-1 w-full text-sm ${getDay(
                  day
                )}`}
                onClick={() => {
                  setSmallCalendarMonth(currentMonthIndex);
                  setSelectedDay(day);
                }}
              >
                {day.format("D")}
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

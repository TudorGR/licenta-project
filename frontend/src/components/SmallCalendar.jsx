import React, { useContext, useEffect, useState } from "react";
import dayjs from "dayjs";
import { getCalendarMonth } from "../util";
import Context from "../context/Context";
import left from "../assets/chevron-left.svg";
import right from "../assets/chevron-right.svg";
import { categoryColors } from "../utils/categoryColors";

const getTimeSlot = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export default function SmallCalendar() {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(dayjs().month());
  const [currentMonth, setCurrentMonth] = useState(getCalendarMonth());
  const {
    monthIndex,
    setSmallCalendarMonth,
    selectedDay,
    setSelectedDay,
    savedEvents,
    workingHoursStart,
    workingHoursEnd,
  } = useContext(Context);

  useEffect(() => {
    setCurrentMonth(getCalendarMonth(currentMonthIndex));
  }, [currentMonthIndex]);

  useEffect(() => {
    setCurrentMonthIndex(monthIndex);
  }, [monthIndex]);

  const getDayEventsCount = (day) => {
    return savedEvents.filter(
      (event) =>
        dayjs(event.day).format("YYYY-MM-DD") === day.format("YYYY-MM-DD")
    ).length;
  };

  const getProgress = (day) => {
    const eventCount = getDayEventsCount(day);
    const maxEvents = 10; // Adjust this value based on your app's logic
    return Math.min(eventCount / maxEvents, 1); // Cap the progress at 1 (full circle)
  };

  const getDayClass = (day) => {
    const nowDay = dayjs().format("DD-MM-YY");
    const currentDay = day.format("DD-MM-YY");
    const sDay = selectedDay && selectedDay.format("DD-MM-YY");
    if (nowDay === currentDay) return "bg-black rounded-full text-white";
    else if (sDay === currentDay)
      return "bg-blue-100 rounded-full text-blue-600";
    else return "hover:bg-blue-100 rounded-full";
  };

  const getCategoryData = (day) => {
    const eventsForDay = savedEvents.filter(
      (event) =>
        dayjs(event.day).format("YYYY-MM-DD") === day.format("YYYY-MM-DD")
    );

    const categoryData = {};
    eventsForDay.forEach((event) => {
      const duration =
        getTimeSlot(event.timeEnd) - getTimeSlot(event.timeStart);
      if (!categoryData[event.category]) {
        categoryData[event.category] = 0;
      }
      categoryData[event.category] += duration;
    });

    return Object.entries(categoryData)
      .map(([category, minutes]) => ({ category, minutes }))
      .sort((a, b) => b.minutes - a.minutes); // Sort by time spent
  };

  return (
    <div className="bg-white rounded-md p-0 w-[90%]">
      <header className="flex justify-between">
        <p className="font-medium">
          {dayjs(new Date(dayjs().year(), currentMonthIndex)).format(
            "MMMM YYYY"
          )}
        </p>
        <div>
          <button
            className="cursor-pointer"
            onClick={() => setCurrentMonthIndex(currentMonthIndex - 1)}
          >
            <img src={left} className="w-6" />
          </button>
          <button
            className="cursor-pointer"
            onClick={() => setCurrentMonthIndex(currentMonthIndex + 1)}
          >
            <img src={right} className="w-6" />
          </button>
        </div>
      </header>
      <div className="grid grid-cols-7 grid-rows-6 ">
        {currentMonth[0].map((day, index) => (
          <span key={index} className="text-sm p-1 my-auto text-center">
            {day.format("dd").charAt(0)}
          </span>
        ))}
        {currentMonth.map((row, index) => (
          <React.Fragment key={index}>
            {row.map((day, index) => {
              const categoryData = getCategoryData(day); // Function to calculate category time proportions
              const totalMinutes = categoryData.reduce(
                (sum, { minutes }) => sum + minutes,
                0
              );
              let offset = 0;

              return (
                <button
                  key={index}
                  className={`mx-auto relative flex items-center justify-center ${getDayClass(
                    day
                  )} my-1 h-8 w-8 text-sm`}
                  onClick={() => {
                    setSmallCalendarMonth(currentMonthIndex);
                    setSelectedDay(day);
                  }}
                >
                  <svg className="absolute w-8 h-8" viewBox="0 0 36 36">
                    {categoryData.map(({ category, minutes }, i) => {
                      const percentage =
                        (minutes /
                          (getTimeSlot(workingHoursEnd) -
                            getTimeSlot(workingHoursStart))) *
                        100; // Total minutes in a day is 1440
                      const dasharray = `${percentage} ${100 - percentage}`;
                      const strokeColor =
                        categoryColors[category] || categoryColors.None;

                      const circle = (
                        <circle
                          key={i}
                          className="text-blue-500 transition-all"
                          strokeWidth="4"
                          fill="none"
                          cx="18"
                          cy="18"
                          r="16"
                          stroke={strokeColor}
                          strokeLinecap="round"
                          strokeDasharray={dasharray}
                          strokeDashoffset={-offset}
                          style={{
                            transform: "rotate(-90deg)",
                            transformOrigin: "center",
                            // opacity: "80%",
                          }}
                        />
                      );

                      offset += percentage;
                      return circle;
                    })}
                  </svg>
                  <span className="z-10">{day.format("D")}</span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

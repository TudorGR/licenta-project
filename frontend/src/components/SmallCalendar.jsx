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
  const [currentMonth, setCurrentMonth] = useState(getCalendarMonth());

  const {
    monthIndex,
    setMonthIndex,
    selectedDay,
    setSelectedDay,
    savedEvents,
    workingHoursStart,
    workingHoursEnd,
    selectedDate,
    setSelectedDate,
  } = useContext(Context);

  // Get both month and year from selectedDate
  const currentMonthIndex = selectedDate.month();
  const currentYear = selectedDate.year();

  useEffect(() => {
    // Pass both month and year to getCalendarMonth
    setCurrentMonth(getModifiedCalendarMonth(currentMonthIndex, currentYear));
  }, [currentMonthIndex, currentYear]);

  // Custom function to get calendar with specific year
  const getModifiedCalendarMonth = (month, year) => {
    month = Math.floor(month);
    const firstDayOfMonth = dayjs(new Date(year, month, 0)).day();
    let monthCount = 0 - firstDayOfMonth;
    const matrix = new Array(5).fill([]).map(() => {
      return new Array(7).fill(null).map(() => {
        monthCount = monthCount + 1;
        return dayjs(new Date(year, month, monthCount));
      });
    });
    return matrix;
  };

  // Handle previous month navigation with year awareness
  const handlePrevMonth = () => {
    // Using subtract(1, "month") properly handles year transitions
    const newDate = selectedDate.subtract(1, "month");
    setSelectedDate(newDate);
    setMonthIndex(newDate.month()); // Update monthIndex for compatibility
  };

  // Handle next month navigation with year awareness
  const handleNextMonth = () => {
    // Using add(1, "month") properly handles year transitions
    const newDate = selectedDate.add(1, "month");
    setSelectedDate(newDate);
    setMonthIndex(newDate.month()); // Update monthIndex for compatibility
  };

  const getDayClass = (day) => {
    const nowDay = dayjs().format("DD-MM-YY");
    const currentDay = day.format("DD-MM-YY");
    const sDay = selectedDay && selectedDay.format("DD-MM-YY");

    // Check if the day is in the current month *and* year
    if (day.month() !== currentMonthIndex || day.year() !== currentYear) {
      return "text-gray-300"; // Gray out days outside the current month/year
    } else if (nowDay === currentDay) {
      return "bg-black rounded-full text-white";
    } else if (sDay === currentDay) {
      return "bg-gray-100 rounded-full text-black";
    } else {
      return "rounded-full";
    }
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
    <div className="bg-white rounded-sm p-0 w-[90%]">
      <header className="flex justify-between">
        <p className="text-lg font-medium my-auto">
          {selectedDate.format("MMMM YYYY")}
        </p>
        <div className="flex flex-row gap-1 mr-9">
          <button
            className="transition-all cursor-pointer w-10 h-10 shadow-custom rounded-full active:bg-gray-50 border-1 border-gray-200"
            onClick={handlePrevMonth}
          >
            <img src={left} className="w-5 mx-auto" alt="Previous month" />
          </button>
          <button
            className="transition-all cursor-pointer w-10 h-10 shadow-custom rounded-full active:bg-gray-50 border-1 border-gray-200"
            onClick={handleNextMonth}
          >
            <img src={right} className="w-5 mx-auto" alt="Next month" />
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
              const categoryData = getCategoryData(day);
              const totalMinutes = categoryData.reduce(
                (sum, { minutes }) => sum + minutes,
                0
              );
              let offset = 0;

              return (
                <button
                  key={index}
                  className={`mx-auto relative flex items-center justify-center transition-all ${getDayClass(
                    day
                  )} my-1 h-8 w-8 text-sm`}
                  onClick={() => {
                    // Update both selectedDate and selectedDay when a day is clicked
                    setSelectedDate(day);
                    setSelectedDay(day);
                    // Set monthIndex for backwards compatibility
                    setMonthIndex(day.month());
                  }}
                >
                  <svg className="absolute w-8 h-8" viewBox="0 0 36 36">
                    {categoryData.map(({ category, minutes }, i) => {
                      const percentage =
                        (minutes /
                          (getTimeSlot(workingHoursEnd) -
                            getTimeSlot(workingHoursStart))) *
                        100;
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

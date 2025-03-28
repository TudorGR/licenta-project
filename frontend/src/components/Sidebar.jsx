import React, { useContext, useState } from "react";
import Context from "../context/Context";
import checkIcon from "../assets/check.svg";
import heatmapIcon from "../assets/heatmapIcon.png";
import CategoryStats from "./CategoryStats";
import CategoryAnalysis from "./CategoryAnalysis";
import dayjs from "dayjs";
import upIcon from "../assets/chevron-up.svg";
import downIcon from "../assets/chevron-down.svg";
import weekday from "dayjs/plugin/weekday.js";
import isoWeek from "dayjs/plugin/isoWeek";
import { categoryColors } from "../utils/categoryColors";

dayjs.extend(weekday);
dayjs.extend(isoWeek);

const Sidebar = () => {
  const {
    setIsMonthView,
    setIsWeekView,
    setIsDayView,
    isMonthView,
    isWeekView,
    isDayView,
    showHeatmap,
    setShowHeatmap,
    categories,
    selectedHeatmapCategories,
    setSelectedHeatmapCategories,
    workingHoursStart,
    workingHoursEnd,
    setWorkingHoursStart,
    setWorkingHoursEnd,
    savedEvents,
    dispatchEvent,
    selectedDay,
    monthIndex,
    selectedWeek,
  } = useContext(Context);
  const [dropdown, setDropdown] = useState(true);
  const [showCategoryAdjust, setShowCategoryAdjust] = useState(false);

  const handleCategoryToggle = (category) => {
    setSelectedHeatmapCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const adjustEvents = (category, minutes = 15) => {
    const startOfWeek = dayjs().isoWeekday(1);
    const endOfWeek = dayjs().isoWeekday(7);

    const weekEvents = savedEvents.filter((event) => {
      const eventDay = dayjs(parseInt(event.day));
      return (
        eventDay.isBetween(startOfWeek, endOfWeek, "day", "[]") &&
        event.category === category
      );
    });

    weekEvents.sort((a, b) => {
      const dayA = dayjs(parseInt(a.day));
      const dayB = dayjs(parseInt(b.day));
      if (dayA.isSame(dayB, "day")) {
        return a.timeStart.localeCompare(b.timeStart);
      }
      return dayA.diff(dayB);
    });

    if (weekEvents.length > 0) {
      const lastEvent = weekEvents[weekEvents.length - 1];

      const [hours, mins] = lastEvent.timeEnd.split(":").map(Number);
      const totalMinutes = hours * 60 + mins + minutes;
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;

      const newEndTime = `${newHours.toString().padStart(2, "0")}:${newMinutes
        .toString()
        .padStart(2, "0")}`;

      dispatchEvent({
        type: "update",
        payload: {
          ...lastEvent,
          timeEnd: newEndTime,
        },
      });
    }
  };

  const isCurrentWeekSelected = () => {
    if (!isWeekView) return false;

    const today = dayjs();
    const currentMonthIndex = today.month();

    if (monthIndex !== currentMonthIndex) return false;

    const firstDayOfMonth = today.startOf("month");
    const firstDayOfWeek = firstDayOfMonth.startOf("week").add(1, "day");
    const currentWeekIndex = Math.floor(today.diff(firstDayOfWeek, "day") / 7);

    return selectedWeek === Math.max(0, currentWeekIndex);
  };

  return (
    <aside className=" w-62 border-gray-200 border-r flex flex-col items-center gap-2">
      <h1 className="text-center my-3 font-bold text-2xl">
        Calendar<span className="text-gray-500">IQ</span>
      </h1>
      <button
        onClick={() => {
          setIsMonthView(true);
          setShowHeatmap(false);
          setIsWeekView(false);
          setIsDayView(false);
        }}
        className={`transition-all cursor-pointer border w-[90%] h-8 border-gray-200 rounded-md ${
          isMonthView ? "bg-black text-white" : "bg-white hover:bg-gray-100"
        }`}
      >
        Month
      </button>
      <div className="w-[90%] flex">
        <button
          onClick={() => {
            setIsMonthView(false);
            setIsWeekView(true);
            setIsDayView(false);
          }}
          className={`mr-1 flex-1 transition-all cursor-pointer border h-8 border-gray-200 rounded-md ${
            isWeekView ? "bg-black text-white" : "bg-white hover:bg-gray-100"
          }`}
        >
          Week
        </button>

        {isWeekView && (
          <>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`transition-all cursor-pointer h-8 w-8 border-gray-200 rounded-md`}
            >
              <img
                src={heatmapIcon}
                className={`transition-all opacity-50 object-contain rounded-md ${
                  showHeatmap ? "opacity-100" : ""
                }`}
              />
            </button>
          </>
        )}
      </div>
      {showHeatmap && (
        <div className="w-[90%] border border-gray-200 rounded-md overflow-hidden">
          <button
            onClick={() => setDropdown(!dropdown)}
            className="outline-0 text-sm font-medium h-8 w-full text-center cursor-pointer hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
          >
            <span>Filter Categories</span>
            <svg
              className={`w-4 h-4 transition-transform ${
                dropdown ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <div
            className={`${
              dropdown ? "max-h-[300px] py-2" : "max-h-0"
            } flex flex-col gap-1 overflow-y-auto transition-all duration-300 ease-in-out`}
          >
            {categories.map((category) => (
              <label
                key={category}
                className="flex items-center gap-3 text-sm px-2 py-1 hover:bg-gray-50 rounded-md cursor-pointer"
              >
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedHeatmapCategories.has(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 border rounded transition-all ${
                      selectedHeatmapCategories.has(category)
                        ? "bg-black border-black"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedHeatmapCategories.has(category) && (
                      <img src={checkIcon} className="w-4 h-4" />
                    )}
                  </div>
                </div>
                <span
                  style={{ color: categoryColors[category] }}
                  className="font-medium"
                >
                  {category}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => {
          setIsMonthView(false);
          setIsWeekView(false);
          setIsDayView(true);
          setShowHeatmap(false);
        }}
        className={`transition-all cursor-pointer border w-[90%] h-8 border-gray-200 rounded-md ${
          isDayView ? "bg-black text-white" : "bg-white hover:bg-gray-100"
        }`}
      >
        Day
      </button>

      {(isWeekView || isMonthView || isDayView) && (
        <>
          <div className="w-[90%] border border-gray-200 rounded-md">
            <CategoryStats
              view={isWeekView ? "week" : isMonthView ? "month" : "day"}
              onCategoryClick={isWeekView ? adjustEvents : null}
            />
          </div>

          <div className="w-[90%] border border-gray-200 rounded-md p-2 overflow-clip">
            <h3 className="font-medium mb-2">Working Hours</h3>
            <div className="flex gap-2 items-center">
              <input
                type="time"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                className="border-gray-200 border-1 outline-0 w-full rounded-md p-1 workingHours"
              />
              <span>-</span>
              <input
                type="time"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                className="border-gray-200 border-1 outline-0 w-full rounded-md p-1 workingHours"
              />
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;

import React, { useContext, useState } from "react";
import Context from "../context/Context";
import checkIcon from "../assets/check.svg";
import CategoryStats from "./CategoryStats";
import CategoryAnalysis from "./CategoryAnalysis";
import dayjs from "dayjs";
import upIcon from "../assets/chevron-up.svg";
import downIcon from "../assets/chevron-down.svg";

const categoryColors = {
  Workout: "rgba(255, 87, 51, 0.7)",
  Meeting: "rgba(52, 152, 219, 0.7)",
  Study: "rgba(155, 89, 182, 0.7)",
  Personal: "rgba(241, 196, 15, 0.7)",
  Work: "rgba(46, 204, 113, 0.7)",
  Social: "rgba(231, 76, 60, 0.7)",
  Family: "rgba(230, 126, 34, 0.7)",
  Health: "rgba(52, 231, 228, 0.7)",
  Hobby: "rgba(155, 89, 182, 0.7)",
  Chores: "rgba(149, 165, 166, 0.7)",
  Travel: "rgba(41, 128, 185, 0.7)",
  Finance: "rgba(39, 174, 96, 0.7)",
  Learning: "rgba(142, 68, 173, 0.7)",
  "Self-care": "rgba(211, 84, 0, 0.7)",
  Events: "rgba(192, 57, 43, 0.7)",
  None: "rgba(189, 195, 199, 0.7)",
};

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
  } = useContext(Context);
  const [dropdown, setDropdown] = useState(true);
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

  const adjustStudyEvents = (minutes) => {
    // Get start and end of current week (Monday to Sunday)
    const today = dayjs();
    const startOfWeek = today.startOf("week").add(1, "day"); // Monday
    const endOfWeek = startOfWeek.add(6, "day"); // Sunday

    // Filter events for the entire week
    const weekEvents = savedEvents.filter((event) => {
      const eventDay = dayjs(parseInt(event.day));
      return eventDay.isBetween(startOfWeek, endOfWeek, null, "[]"); // [] means inclusive
    });

    // Sort events chronologically - first by day, then by time
    weekEvents.sort((a, b) => {
      // First compare by day
      const dayA = dayjs(parseInt(a.day));
      const dayB = dayjs(parseInt(b.day));

      if (!dayA.isSame(dayB, "day")) {
        return dayA.valueOf() - dayB.valueOf();
      }

      // If same day, compare by start time
      const getMinutesFromTime = (timeString) => {
        const [hours, minutes] = timeString.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const aStart = getMinutesFromTime(a.timeStart);
      const bStart = getMinutesFromTime(b.timeStart);
      return aStart - bStart;
    });

    if (weekEvents.length > 0) {
      dispatchEvent({
        type: "increase",
        payload: {
          timeChange: minutes,
          category: "Study",
        },
      });
    } else {
      console.log("No Study events found for the current week");
    }
  };

  return (
    <aside className=" w-62 border-gray-200 border-r flex flex-col items-center gap-2">
      <h1 className="text-center my-3 font-bold text-2xl">CalendarApp</h1>
      <button
        onClick={() => {
          setIsMonthView(true);
          setIsWeekView(false);
          setIsDayView(false);
        }}
        className={`transition-all cursor-pointer border w-[90%] h-10 border-gray-200 rounded-md ${
          isMonthView ? "bg-black text-white" : "bg-white hover:bg-gray-100"
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
        className={`transition-all cursor-pointer border w-[90%] h-10 border-gray-200 rounded-md ${
          isWeekView ? "bg-black text-white" : "bg-white hover:bg-gray-100"
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
        className={`transition-all cursor-pointer border w-[90%] h-10 border-gray-200 rounded-md ${
          isDayView ? "bg-black text-white" : "bg-white hover:bg-gray-100"
        }`}
      >
        Day
      </button>

      {isWeekView && (
        <>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`transition-all cursor-pointer border w-[90%] h-10 border-gray-200 rounded-md ${
              showHeatmap ? "bg-black text-white" : "bg-white hover:bg-gray-100"
            }`}
          >
            Heatmap
          </button>

          {showHeatmap && (
            <div className="w-[90%] border border-gray-200 rounded-md overflow-hidden">
              <button
                onClick={() => setDropdown(!dropdown)}
                className="outline-0 text-sm font-medium h-10 w-full text-center cursor-pointer hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
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
          <div className="w-[90%] border border-gray-200 rounded-md">
            <CategoryAnalysis />
          </div>
        </>
      )}
      {(isWeekView || isMonthView || isDayView) && (
        <>
          <div className="w-[90%] border border-gray-200 rounded-md">
            <CategoryStats
              view={isWeekView ? "week" : isMonthView ? "month" : "day"}
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
      <div className="w-[90%] flex justify-between items-center border border-gray-200 rounded-md p-2">
        <h3 className="font-medium">Study</h3>
        <div className="flex flex-col gap-1 w-8">
          <button
            onClick={() => adjustStudyEvents(15)} // Increase by 15 minutes
            className="transition-all cursor-pointer border flex-1 h-10 border-gray-200 rounded-md hover:bg-gray-100"
          >
            <img src={upIcon} className="w-4 mx-auto" />
          </button>
          {/* <button
            onClick={() => adjustStudyEvents(-15)} // Decrease by 15 minutes
            className="transition-all cursor-pointer border flex-1 h-10 border-gray-200 rounded-md hover:bg-gray-100"
          >
            <img src={downIcon} className="w-4 mx-auto" />
          </button> */}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

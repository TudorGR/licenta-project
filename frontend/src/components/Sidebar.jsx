import React, { useContext, useState } from "react";
import Context from "../context/Context";
import checkIcon from "../assets/check.svg";
import heatmapIcon from "../assets/heatmapIcon.png";
import weatherIcon from "../assets/partly-cloudy.svg"; // Use the cloudy icon as the toggle icon
import CategoryStats from "./CategoryStats";
import CategoryAnalysis from "./CategoryAnalysis";
import dayjs from "dayjs";
import upIcon from "../assets/chevron-up.svg";
import downIcon from "../assets/chevron-down.svg";
import weekday from "dayjs/plugin/weekday.js";
import isoWeek from "dayjs/plugin/isoWeek";
import { categoryColors } from "../utils/categoryColors";
import SmallCalendar from "./SmallCalendar";

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
    autoRescheduleEnabled,
    setAutoRescheduleEnabled,
    showWeather,
    setShowWeather,
    showLocalEvents,
    setShowLocalEvents,
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
    dispatchEvent({
      type: "increase",
      payload: {
        timeChange: minutes,
        category,
      },
    });
  };

  return (
    <aside className="pt-2 shrink-0 w-70 border-gray-100 border-r flex flex-col items-center gap-2">
      {/* <h1 className="text-center my-3 font-bold text-2xl">
        Calendar<span className="text-blue-500">IQ</span>
      </h1> */}

      {/* Small Calendar */}
      <SmallCalendar />

      {(isWeekView || isMonthView || isDayView) && (
        <>
          <div className="rounded-sm w-full">
            <CategoryStats
              view={isWeekView ? "week" : isMonthView ? "month" : "day"}
              onCategoryClick={isWeekView ? adjustEvents : null}
            />
          </div>

          <div className="w-full rounded-sm p-0 overflow-clip">
            <h3 className="mb-2 mx-4">Working Hours</h3>
            <div className="flex items-center border-y-1 border-gray-100">
              <input
                type="time"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                className="h-12 relative text-gray-500 text-sm outline-0 w-full  px-2 workingHours"
              />
              <span className="h-12 border-r-1 border-gray-100"></span>
              <input
                type="time"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                className="h-12 relative text-gray-500 text-sm outline-0 w-full px-2  workingHours"
              />
            </div>
          </div>

          <div className="w-full rounded-sm p-0 overflow-clip">
            <div className="flex items-center justify-between border-b-1 border-gray-100 px-4 h-12">
              <span className="text-sm">Show local events</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLocalEvents}
                  onChange={() => setShowLocalEvents(!showLocalEvents)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
              </label>
            </div>

            {(isWeekView || isDayView) && (
              <div className="flex items-center justify-between border-b-1 border-gray-100 px-4 h-12">
                <span className="text-sm">Show weather</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWeather}
                    onChange={() => setShowWeather(!showWeather)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </label>
              </div>
            )}

            {isWeekView && (
              <div className="flex items-center justify-between border-b-1 border-gray-100 px-4 h-12">
                <span className="text-sm">Show heatmap</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={() => setShowHeatmap(!showHeatmap)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </label>
              </div>
            )}
          </div>
        </>
      )}

      {showHeatmap && (
        <div className="w-full border border-gray-200 rounded-sm overflow-hidden">
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
                className="flex items-center gap-3 text-sm px-2 py-1 hover:bg-gray-50 rounded-sm cursor-pointer"
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

      <div className="flex-1 flex items-end">
        {/* Attribution for weather icons */}
        <div className="text-xs text-black opacity-20 mb-2 text-center">
          Weather icons by{" "}
          <a
            href="https://www.amcharts.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            amCharts
          </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

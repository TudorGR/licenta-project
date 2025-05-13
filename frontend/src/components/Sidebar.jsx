import React, { useContext, useState } from "react";
import Context from "../context/Context";
import { AuthContext } from "../context/AuthContext";
import checkIcon from "../assets/check.svg";
import CategoryStats from "./CategoryStats";
import dayjs from "dayjs";

import weekday from "dayjs/plugin/weekday.js";
import isoWeek from "dayjs/plugin/isoWeek";
import { categoryColors } from "../utils/categoryColors";
import SmallCalendar from "./SmallCalendar";
import xIcon from "../assets/x.svg";
import tickIcon from "../assets/tick.svg";

dayjs.extend(weekday);
dayjs.extend(isoWeek);

const Sidebar = ({ onClose }) => {
  const {
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
    dispatchEvent,
    autoRescheduleEnabled,
    showWeather,
    setShowWeather,
    showLocalEvents,
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

  return (
    <aside className="relative pt-2 shrink-0 w-70 h-full bg-white border-gray-200 md:border-r flex flex-col items-center gap-2 overflow-y-auto">
      {/* Small Calendar Header with Close Button */}
      <div className=" absolute top-4 right-4 justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={onClose}
            className="cursor-pointer"
            aria-label="Close Sidebar"
          >
            <img src={xIcon} alt="" />
          </button>
        </div>
      </div>

      {/* Small Calendar */}
      <SmallCalendar />

      {(isWeekView || isMonthView || isDayView) && (
        <>
          <div className="rounded-sm w-full">
            <CategoryStats
              view={isWeekView ? "week" : isMonthView ? "month" : "day"}
            />
          </div>

          <div className="w-full rounded-sm p-0">
            <h3 className="mb-2 mx-4">Working Hours</h3>
            <div className="flex items-center border-t-1 border-gray-200">
              <input
                type="time"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                className="h-12 relative text-gray-500 text-sm outline-0 w-full  px-2 workingHours"
              />
              <span className="h-12 border-r-1 border-gray-200"></span>
              <input
                type="time"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                className="h-12 relative text-gray-500 text-sm outline-0 w-full px-2  workingHours"
              />
            </div>
            <div className="w-full rounded-sm p-0">
              {(isWeekView || isDayView) && (
                <div className="flex items-center justify-between border-y-1 border-gray-200 pl-4 h-12 ">
                  <span className="text-sm">Weather</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showWeather}
                      onChange={() => setShowWeather(!showWeather)}
                      className="sr-only peer"
                    />
                    <div className="w-24 h-12 border-t overflow-clip border-l border-b border-gray-200 bg-gray-100 peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-l-0  peer-checked:after:border-r-0 after:content-[''] after:absolute after:top-0 after:left-0 after:bg-white after:border-gray-200   after:h-12 after:w-12 after:transition-all flex items-center justify-between px-4 relative">
                      {/* X icon (visible when unchecked) */}
                      <img
                        src={xIcon}
                        className={`w-5 h-5 z-5 absolute left-4 top-1/2 transform -translate-y-1/2 transition-opacity ${
                          showWeather ? "opacity-10" : "opacity-100"
                        }`}
                      />
                      {/* Tick icon (visible when checked) */}
                      <img
                        src={tickIcon}
                        className={`w-5 h-5 z-5 absolute right-4 top-1/2 transform -translate-y-1/2 transition-opacity ${
                          showWeather ? "opacity-100" : "opacity-10"
                        }`}
                      />
                    </div>
                  </label>
                </div>
              )}

              {isWeekView && (
                <div className="flex items-center justify-between border-b-1 border-gray-200 pl-4 h-12">
                  <span className="text-sm">Heatmap</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHeatmap}
                      onChange={() => setShowHeatmap(!showHeatmap)}
                      className="sr-only peer"
                    />
                    <div className="w-24 h-12  overflow-clip border-l border-b border-gray-200 bg-gray-100 peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-l-0  peer-checked:after:border-r-0 after:content-[''] after:absolute after:top-0 after:left-0 after:bg-white after:border-gray-200   after:h-12 after:w-12 after:transition-all flex items-center justify-between px-4 relative">
                      {/* X icon (visible when unchecked) */}
                      <img
                        src={xIcon}
                        className={`w-5 h-5 z-5 absolute left-4 top-1/2 transform -translate-y-1/2 transition-opacity ${
                          showHeatmap ? "opacity-10" : "opacity-100"
                        }`}
                      />
                      {/* Tick icon (visible when checked) */}
                      <img
                        src={tickIcon}
                        className={`w-5 h-5 z-5 absolute right-4 top-1/2 transform -translate-y-1/2 transition-opacity ${
                          showHeatmap ? "opacity-100" : "opacity-10"
                        }`}
                      />
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showHeatmap && (
        <div className="w-full rounded-sm overflow-scroll">
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

      {showWeather ? (
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
      ) : (
        ""
      )}
    </aside>
  );
};

export default Sidebar;

import React, { useContext, useState } from "react";
import Context from "../context/Context";
import { AuthContext } from "../context/AuthContext";
import checkIcon from "../assets/check.svg";
import CategoryStats from "./CategoryStats";
import dayjs from "dayjs";
import NextEventDirections from "./NextEventDirections"; // Add this import

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
    categories,
    workingHoursStart,
    workingHoursEnd,
    setWorkingHoursStart,
    setWorkingHoursEnd,
    dispatchEvent,
    autoRescheduleEnabled,
    showLocalEvents,
  } = useContext(Context);
  const [dropdown, setDropdown] = useState(true);

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
          <NextEventDirections />

          <div className="w-full rounded-sm p-0">
            <h3 className="mb-2 mx-4">Working Hours</h3>
            <div className="flex items-center border-y-1 border-gray-200">
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
          </div>

          <div className="rounded-sm w-full">
            <CategoryStats
              view={isWeekView ? "week" : isMonthView ? "month" : "day"}
            />
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;

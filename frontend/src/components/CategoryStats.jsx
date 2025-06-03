import React, { useContext, useMemo } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";
import { categoryColors } from "../utils/categoryColors";

const CategoryStats = ({ view = "week", onCategoryClick }) => {
  const {
    savedEvents,
    selectedDay,
    workingHoursStart,
    workingHoursEnd,
    selectedDate,
  } = useContext(Context);

  const getWorkingMinutes = (start, end) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    return endHour * 60 + endMin - (startHour * 60 + startMin);
  };

  const stats = useMemo(() => {
    let startDate, endDate;

    switch (view) {
      case "day":
        // Simply use selectedDate for day view
        startDate = selectedDate.startOf("day");
        endDate = selectedDate.endOf("day");
        break;
      case "week":
        // Calculate week boundaries from selectedDate
        startDate = selectedDate.startOf("isoWeek"); // Monday (remove the +1 day)
        endDate = selectedDate.startOf("isoWeek").add(6, "day"); // Sunday
        break;
      case "month":
        // Calculate month boundaries from selectedDate
        startDate = selectedDate.startOf("month");
        endDate = selectedDate.endOf("month");
        break;
      default:
        return [];
    }

    const filteredEvents = savedEvents.filter((event) => {
      const eventDay = dayjs(event.day);

      if (view === "day") {
        return eventDay.format("YYYY-MM-DD") === startDate.format("YYYY-MM-DD");
      }

      return (
        (eventDay.isSame(startDate, "day") ||
          eventDay.isAfter(startDate, "day")) &&
        (eventDay.isSame(endDate, "day") || eventDay.isBefore(endDate, "day"))
      );
    });

    const categoryStats = {};
    const dailyWorkingMinutes = getWorkingMinutes(
      workingHoursStart,
      workingHoursEnd
    );

    const totalMinutesInPeriod =
      view === "day"
        ? dailyWorkingMinutes
        : view === "week"
        ? dailyWorkingMinutes * 7
        : dailyWorkingMinutes * endDate.diff(startDate, "day");

    filteredEvents.forEach((event) => {
      const category = event.category || "Other";
      if (!categoryStats[category]) {
        categoryStats[category] = { minutes: 0, percentage: 0 };
      }

      const [startHour, startMin] = event.timeStart.split(":").map(Number);
      const [endHour, endMin] = event.timeEnd.split(":").map(Number);
      const [workStartHour, workStartMin] = workingHoursStart
        .split(":")
        .map(Number);
      const [workEndHour, workEndMin] = workingHoursEnd.split(":").map(Number);

      const eventStartMinutes = startHour * 60 + startMin;
      const eventEndMinutes = endHour * 60 + endMin;
      const workStartMinutes = workStartHour * 60 + workStartMin;
      const workEndMinutes = workEndHour * 60 + workEndMin;

      const clampedStartMinutes = Math.max(eventStartMinutes, workStartMinutes);
      const clampedEndMinutes = Math.min(eventEndMinutes, workEndMinutes);

      if (clampedEndMinutes > clampedStartMinutes) {
        const duration = clampedEndMinutes - clampedStartMinutes;
        categoryStats[category].minutes += duration;
      }
    });

    Object.keys(categoryStats).forEach((category) => {
      categoryStats[category].percentage = (
        (categoryStats[category].minutes / totalMinutesInPeriod) *
        100
      ).toFixed(1);
    });

    return Object.entries(categoryStats).sort(
      (a, b) => b[1].minutes - a[1].minutes
    );
  }, [
    savedEvents,
    selectedDate, // Replace monthIndex and selectedWeek with selectedDate
    selectedDay,
    view,
    workingHoursStart,
    workingHoursEnd,
  ]);

  if (stats.length === 0) {
    return <></>;
  }

  return (
    <div className="p-0">
      <h3 className="mb-2 ml-4">
        {view === "day"
          ? "Daily Stats"
          : view.charAt(0).toUpperCase() + view.slice(1) + "ly Stats"}
      </h3>
      <div className="space-y-0">
        {stats.map(([category, stats]) => (
          <div
            key={category}
            className="space-y-1 py-1"
            title={`Category: ${category}`}
            onClick={() => onCategoryClick && onCategoryClick(category)}
            style={{ cursor: onCategoryClick ? "pointer" : "default" }}
          >
            <div className="flex justify-between text-sm ml-4">
              <span style={{ color: categoryColors[category] }}>
                {category}
              </span>
              <span className="text-gray-500 mr-4">
                {Math.floor(stats.minutes / 60)}h {stats.minutes % 60}m
              </span>
            </div>
            <div className="w-full bg-gray-100 h-1">
              <div
                className="h-1 transition-all duration-300"
                style={{
                  width: `${stats.percentage}%`,
                  backgroundColor:
                    categoryColors[category] || categoryColors.Other,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryStats;

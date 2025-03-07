import React, { useContext, useMemo } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";

const CategoryStats = ({ view = "week" }) => {
  const {
    savedEvents,
    monthIndex,
    selectedWeek,
    selectedDay,
    workingHoursStart,
    workingHoursEnd,
  } = useContext(Context);

  const getWorkingMinutes = (start, end) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    return endHour * 60 + endMin - (startHour * 60 + startMin);
  };

  const stats = useMemo(() => {
    const year = dayjs().year();
    let startDate, endDate;

    switch (view) {
      case "day":
        startDate = selectedDay.startOf("day");
        endDate = selectedDay.endOf("day");
        break;
      case "week":
        const monthStart = dayjs(new Date(year, monthIndex, 1));
        startDate = monthStart
          .startOf("week")
          .add(selectedWeek, "week")
          .add(1, "day");
        endDate = startDate.add(6, "day");
        break;
      case "month":
        startDate = dayjs(new Date(year, monthIndex, 1));
        endDate = startDate.endOf("month");
        break;
      default:
        return [];
    }

    // Modified filtering logic to include start and end dates
    const filteredEvents = savedEvents.filter((event) => {
      const eventDay = dayjs(event.day);

      // Comment out or remove the current week exclusion
      /*
      const currentWeekStart = dayjs().startOf("week").add(1, "day");
      const isCurrentWeek =
        eventDay.isAfter(currentWeekStart) ||
        eventDay.isSame(currentWeekStart, "day");

      // Exclude events from current week
      if (isCurrentWeek) return false;
      */

      // Rest of the filtering logic...
      if (view === "day") {
        return (
          eventDay.format("YYYY-MM-DD") === selectedDay.format("YYYY-MM-DD")
        );
      }

      // Include events on start and end dates by using isSame or isAfter/isBefore
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

    // Calculate total working minutes for the period
    const totalMinutesInPeriod =
      view === "day"
        ? dailyWorkingMinutes
        : view === "week"
        ? dailyWorkingMinutes * 7 // Use all 7 days
        : dailyWorkingMinutes * endDate.diff(startDate, "day"); // Use all days in month

    filteredEvents.forEach((event) => {
      const category = event.category || "None";
      if (!categoryStats[category]) {
        categoryStats[category] = { minutes: 0, percentage: 0 };
      }

      // Calculate duration within working hours
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

      // Clamp event time to working hours
      const clampedStartMinutes = Math.max(eventStartMinutes, workStartMinutes);
      const clampedEndMinutes = Math.min(eventEndMinutes, workEndMinutes);

      // Only count minutes that fall within working hours
      if (clampedEndMinutes > clampedStartMinutes) {
        const duration = clampedEndMinutes - clampedStartMinutes;
        categoryStats[category].minutes += duration;
      }
    });

    // Calculate percentages based on working hours
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
    monthIndex,
    selectedWeek,
    selectedDay,
    view,
    workingHoursStart,
    workingHoursEnd,
  ]);

  // Rest of the component remains the same
  if (stats.length === 0) {
    return <div className="p-2 text-gray-500">No events in this {view}</div>;
  }

  return (
    <div className="p-2">
      <h3 className="font-medium mb-2">
        {view.charAt(0).toUpperCase() + view.slice(1)}ly Stats
      </h3>
      <div className="space-y-3">
        {stats.map(([category, stats]) => (
          <div key={category} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{category}</span>
              <span>
                {Math.floor(stats.minutes / 60)}h {stats.minutes % 60}m
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-black rounded-full h-2 transition-all duration-300"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryStats;

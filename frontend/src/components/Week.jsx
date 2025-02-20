import React from "react";
import DayWeek from "./DayWeek";

const Week = ({ month, weekIndex }) => {
  if (!month || !month[weekIndex]) return null;
  const week = month[weekIndex];

  return (
    <div className="grid grid-cols-7 border-b w-full">
      {week.map((day, i) => (
        <DayWeek key={i} day={day} index={weekIndex} />
      ))}
    </div>
  );
};

export default Week;

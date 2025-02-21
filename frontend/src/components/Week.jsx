import React, { useEffect, useRef } from "react";
import DayWeek from "./DayWeek";

const TIME_SLOT_HEIGHT = 50;

const Week = ({ month, weekIndex }) => {
  if (!month || !month[weekIndex]) return null;
  const week = month[weekIndex];
  const timeGridRef = useRef(null);

  useEffect(() => {
    if (timeGridRef.current) {
      const middayPosition = 12 * TIME_SLOT_HEIGHT - 600 / 2;
      timeGridRef.current.scrollTop = middayPosition;
    }
  }, []);

  return (
    <div ref={timeGridRef} className="w-full overflow-y-auto">
      <div className="bg-white h-11 fixed z-5 w-full"></div>
      <div className="grid grid-cols-7 border-b w-full ">
        {week.map((day, i) => (
          <DayWeek key={i} day={day} index={weekIndex} />
        ))}
      </div>
    </div>
  );
};

export default Week;

import React, { useEffect, useRef, useContext } from "react";
import DayWeek from "./DayWeek";
import dayjs from "dayjs";
import Context from "../context/Context.js";

const TIME_SLOT_HEIGHT = 50;

const calculateTimePosition = () => {
  const now = dayjs();
  const minutes = now.hour() * 60 + now.minute();
  return (minutes / 60) * TIME_SLOT_HEIGHT;
};

const Week = ({ month, weekIndex }) => {
  const { showHeatmap } = useContext(Context);
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
      {/* <div className="bg-gray-100 h-11 fixed z-5  border border-t-0 border-l-0 border-r-0 border-b-gray-200"></div> */}
      <div
        className="grid border-b w-full"
        style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
      >
        <div className="relative mt-12">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="absolute text-xs text-gray-300"
              style={{
                top: `${i * TIME_SLOT_HEIGHT}px`,
                transform: "translateY(-55%)",
                right: "0",
                background: "white",
                width: "100%",
                textAlign: "center",
              }}
            >
              {`${i.toString().padStart(2, "0")}:00`}
            </div>
          ))}
          <div className="sticky top-0 mt-[-48px] w-full h-[45px] border-b-1 border-b-gray-100 bg-white"></div>
          <div
            className="absolute text-xs rounded-xl bg-blue-500 text-white"
            style={{
              top: `${calculateTimePosition()}px`,
              transform: "translateY(-55%)",
              right: "0",
              width: "100%",
              textAlign: "center",
              zIndex: 12,
            }}
          >
            {dayjs().format("HH:mm")}
          </div>
        </div>
        {week.map((day, i) => (
          <DayWeek key={i} day={day} index={weekIndex} />
        ))}
      </div>
    </div>
  );
};

export default Week;

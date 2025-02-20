import dayjs from "dayjs";
import React, { useContext, useEffect, useState } from "react";
import Context from "../context/Context";

const DayWeek = ({ day, index }) => {
  const [dayEvents, setDayEvents] = useState([]);
  const { setSelectedDay, setShowEventModal, savedEvents, setSelectedEvent } =
    useContext(Context);

  function getCurrentDay() {
    return day.format("DD-MM-YY") === dayjs().format("DD-MM-YY");
  }

  const getTimeSlot = (time) => {
    const [hour, minute] = time.split(":");
    return parseInt(hour) * 60 + parseInt(minute);
  };

  const positionEvent = (startTime, endTime) => {
    const startMinutes = getTimeSlot(startTime);
    const endMinutes = getTimeSlot(endTime);

    const eventHeight = ((endMinutes - startMinutes) / 720) * 100;
    const eventTop = ((startMinutes - 480) / 720) * 100;

    return { top: `${eventTop}%`, height: `${eventHeight}%` };
  };

  useEffect(() => {
    const events = savedEvents.filter(
      (e) => dayjs(e.day).format("DD-MM-YY") === day.format("DD-MM-YY")
    );
    setDayEvents(events);
  }, [savedEvents, day]);

  return (
    <div className="calendar-day border border-r-0 border-b-0 border-l-gray-200 border-t-gray-200 flex flex-col">
      <header className="flex flex-col items-center">
        {index === 0 && (
          <p className=" text-sm mt-1">{day.format("ddd").toUpperCase()}</p>
        )}
        <p
          className={` calendar-day-number text-sm p-1 my-1 text-center ${
            getCurrentDay()
              ? "bg-blue-600 text-white rounded-full w-7"
              : "rounded-full w-7"
          }`}
        >
          {day.format("DD")}
        </p>
      </header>
      <div className="time-grid relative">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="time-slot"
            style={{
              position: "absolute",
              top: `${(i / 12) * 100}%`,
              height: "8.33%",
              width: "100%",
              borderBottom: "1px solid #ccc",
            }}
          ></div>
        ))}
        {dayEvents.map((event, index) => {
          const { startTime, endTime } = event;
          const eventPosition = positionEvent(startTime, endTime);
          return (
            <div
              key={event.id}
              className={`event ${event.label}`}
              style={{
                position: "absolute",
                top: eventPosition.top,
                height: eventPosition.height,
                left: 0,
                width: "100%",
                backgroundColor:
                  event.label === "blue"
                    ? "#2196F3"
                    : event.label === "red"
                    ? "#F44336"
                    : event.label === "green"
                    ? "#4CAF50"
                    : event.label === "orange"
                    ? "#FF9800"
                    : "#FFEB3B",
                padding: "5px",
                color: "white",
                borderRadius: "4px",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
              onClick={() => {
                setSelectedEvent(event);
              }}
            >
              <div className="event-title">{event.title}</div>
              <div className="event-time">{`${startTime} - ${endTime}`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayWeek;

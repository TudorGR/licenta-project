import dayjs from "dayjs";
import React, { useContext, useEffect, useState } from "react";
import Context from "../context/Context";

const DayWeek = ({ day, index }) => {
  const [dayEvents, setDayEvents] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const {
    setSelectedDay,
    setShowEventModal,
    savedEvents,
    setSelectedEvent,
    setTimeStart,
    setTimeEnd,
  } = useContext(Context);

  const calculateTimePosition = () => {
    const now = dayjs();
    const minutes = now.hour() * 60 + now.minute();
    const position = ((minutes - 480) / 720) * 100;
    return Math.max(0, Math.min(100, position)); // Keep position between 0-100%
  };

  const getTimeFromMousePosition = (mouseY, gridElement) => {
    const rect = gridElement.getBoundingClientRect();
    const relativeY = mouseY - rect.top;
    const percentageY = (relativeY / rect.height) * 100;

    const minutes = (percentageY / 100) * 720 + 480;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round((minutes % 60) / 15) * 15;

    if (mins === 60) {
      return `${(hours + 1).toString().padStart(2, "0")}:00`;
    }

    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  };

  const handleMouseDown = (e) => {
    if (e.target.closest(".event")) {
      return;
    }
    const gridElement = e.currentTarget;
    setIsDragging(true);
    const startTime = getTimeFromMousePosition(e.clientY, gridElement);
    setDragStart(startTime);
    setDragEnd(startTime);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const gridElement = e.currentTarget;
    const currentTime = getTimeFromMousePosition(e.clientY, gridElement);
    setDragEnd(currentTime);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setSelectedDay(day);

      const [startTime, endTime] = [dragStart, dragEnd].sort();

      setTimeStart(startTime);
      setTimeEnd(endTime);

      setSelectedEvent(null);
      setShowEventModal(true);
    }
  };

  useEffect(() => {
    return () => {
      setIsDragging(false);
    };
  }, []);

  useEffect(() => {
    const updateTimePosition = () => {
      setCurrentTimePosition(calculateTimePosition());
    };

    updateTimePosition();

    const interval = setInterval(updateTimePosition, 60000);

    return () => clearInterval(interval);
  }, []);

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
        <p
          className={`calendar-day-number text-sm p-1 my-1 text-center ${
            getCurrentDay()
              ? "bg-blue-600 text-white rounded-full w-7"
              : "rounded-full w-7"
          }`}
        >
          {day.format("DD")}
        </p>
      </header>
      <div
        className="time-grid relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="time-slot"
            style={{
              position: "absolute",
              top: `${(i / 12) * 100}%`,
              height: "8.33%",
              width: "100%",
              borderBottom: "1px solid #E5E7EB",
              zIndex: 1,
            }}
          ></div>
        ))}
        {isDragging && dragStart && dragEnd && (
          <div
            className="border-2 border-blue-300 min-h-3 opacity-50 absolute left-0 w-full rounded-xl bg-blue-100"
            style={{
              ...positionEvent(dragStart, dragEnd),
              pointerEvents: "none",
            }}
          />
        )}
        {
          <div
            className="absolute left-0 w-full"
            style={{
              top: `${currentTimePosition}%`,
              height: "2px",
              background: "blue",
              zIndex: 2,
            }}
          ></div>
        }
        {dayEvents.map((event, index) => {
          const { timeStart, timeEnd } = event;
          const eventPosition = positionEvent(timeStart, timeEnd);
          return (
            <div
              key={event.id}
              style={{
                position: "absolute",
                top: eventPosition.top,
                height: eventPosition.height,
                left: 0,
                width: "95%",
                padding: "5px",
                boxSizing: "border-box",
                cursor: "pointer",
                borderRadius: "12px",
                zIndex: 3,
                color:
                  event.label === "blue"
                    ? "#3B82F6"
                    : event.label === "red"
                    ? "#EF4444"
                    : event.label === "green"
                    ? "#22C55E"
                    : event.label === "orange"
                    ? "#F97316"
                    : "#EAB308",
              }}
              className={`event ${event.label} ${
                event.label === "blue"
                  ? "border-blue-500 bg-white text-black border-1 shadow-[0_0_5px_rgba(59,130,246,0.2)]"
                  : event.label === "red"
                  ? "border-red-500 bg-white text-black border-1 shadow-[0_0_5px_rgba(239,68,68,0.2)]"
                  : event.label === "green"
                  ? "border-green-500 bg-white text-black border-1 shadow-[0_0_5px_rgba(34,197,94,0.2)]"
                  : event.label === "orange"
                  ? "border-orange-500 bg-white text-black border-1 shadow-[0_0_5px_rgba(249,115,22,0.2)]"
                  : "border-yellow-500 bg-white text-black border-1 shadow-[0_0_5px_rgba(234,179,8,0.2)]"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setTimeStart(event.timeStart);
                setTimeEnd(event.timeEnd);
                setSelectedDay(day);
                setSelectedEvent(event);
                setShowEventModal(true);
              }}
            >
              <div className="ml-1 text-lg font-medium">{event.title}</div>
              <div className="ml-1 text-md">{`${timeStart} - ${timeEnd}`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayWeek;

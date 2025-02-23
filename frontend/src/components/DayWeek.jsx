import dayjs from "dayjs";
import React, { useContext, useEffect, useRef, useState } from "react";
import Context from "../context/Context";
import workoutIcon from "../assets/workout.svg";
import meetingIcon from "../assets/meeting.svg";
import studyIcon from "../assets/study.svg";
import personalIcon from "../assets/personal.svg";
import workIcon from "../assets/work.svg";
import socialIcon from "../assets/social.svg";
import familyIcon from "../assets/family.svg";
import healthIcon from "../assets/health.svg";
import hobbyIcon from "../assets/hobby.svg";
import choresIcon from "../assets/chores.svg";
import travelIcon from "../assets/travel.svg";
import financeIcon from "../assets/finance.svg";
import learningIcon from "../assets/learning.svg";
import selfCareIcon from "../assets/self-care.svg";
import eventsIcon from "../assets/event.svg";

const TIME_SLOT_HEIGHT = 50;
const TOTAL_HEIGHT = TIME_SLOT_HEIGHT * 24;

const DayWeek = ({ day, index }) => {
  const timeGridRef = useRef(null);
  const [dayEvents, setDayEvents] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = dayjs();
    const firstDayOfMonth = today.startOf("month");
    const firstDayOfWeek = firstDayOfMonth.startOf("week");
    const weekIndex = Math.floor(today.diff(firstDayOfWeek, "days") / 7);
    return weekIndex;
  });
  const {
    setSelectedDay,
    setShowEventModal,
    savedEvents,
    setSelectedEvent,
    setTimeStart,
    setTimeEnd,
    selectedEvent,
  } = useContext(Context);

  const calculateTimePosition = () => {
    const now = dayjs();
    const minutes = now.hour() * 60 + now.minute();
    return (minutes / 60) * TIME_SLOT_HEIGHT;
  };
  const getTimeFromMousePosition = (mouseY, gridElement) => {
    const rect = gridElement.getBoundingClientRect();
    const relativeY = mouseY - rect.top;
    const minutes = (relativeY / TIME_SLOT_HEIGHT) * 60;
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

  const handleMouseUp = (e) => {
    if (!isDragging) {
      return;
    }

    setIsDragging(false);
    setSelectedDay(day);

    const [startTime, endTime] = [dragStart, dragEnd].sort();

    setTimeStart(startTime);
    setTimeEnd(endTime);

    setSelectedEvent(null);
    setShowEventModal(true);
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

    const top = (startMinutes / 60) * TIME_SLOT_HEIGHT;
    const height = ((endMinutes - startMinutes) / 60) * TIME_SLOT_HEIGHT;

    return { top: `${top}px`, height: `${height}px` };
  };

  useEffect(() => {
    const events = savedEvents.filter(
      (e) => dayjs(e.day).format("DD-MM-YY") === day.format("DD-MM-YY")
    );
    setDayEvents(events);
  }, [savedEvents, day]);

  useEffect(() => {
    if (timeGridRef.current) {
      const middayPosition = 12 * TIME_SLOT_HEIGHT - 600 / 2;
      timeGridRef.current.scrollTop = middayPosition;
    }
  }, []);

  return (
    <div className="calendar-day flex flex-col">
      <header className="sticky top-0 z-6">
        <div
          className={`flex justify-center items-center gap-1.5 text-nowrap h-11 w-full border-gray-200 border-l mx-auto calendar-day-number text-sm  text-center ${
            getCurrentDay() ? "text-black" : "text-gray-500"
          }`}
        >
          <p>{day.format("ddd")}</p>
          <div
            className={`flex items-center justify-center ${
              getCurrentDay()
                ? "bg-black rounded-full w-6 h-6 shadow-md text-white"
                : ""
            }`}
          >
            <p>{day.format("DD")}</p>
          </div>
        </div>
      </header>
      <div
        className="time-grid relative "
        style={{ height: "600px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div
          className="gray-border-axis"
          style={{ height: `${TOTAL_HEIGHT}px`, position: "relative" }}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className=" time-slot gray-border-bottom"
              style={{
                position: "absolute",
                top: `${i * TIME_SLOT_HEIGHT}px`,
                height: `${TIME_SLOT_HEIGHT}px`,
                width: "100%",
                zIndex: 1,
              }}
            ></div>
          ))}
          {isDragging && dragStart && dragEnd && (
            <div
              className="z-2 border-1 border-gray-500 min-h-3 opacity-50 absolute left-0 w-full rounded-md bg-gray-200"
              style={{
                ...positionEvent(dragStart, dragEnd),
                pointerEvents: "none",
              }}
            />
          )}
          {getCurrentDay() ? (
            <div
              className="absolute left-0 w-full bg-red-400"
              style={{
                top: `${currentTimePosition}px`,
                height: "2px",
                zIndex: 13,
              }}
            >
              <div className="absolute -left-1 -top-0.75 w-2 h-2 rounded-full bg-red-400" />
            </div>
          ) : (
            <div
              className="absolute left-0 w-full gray-border"
              style={{
                top: `${currentTimePosition}px`,
                height: "1px",
                zIndex: 11,
              }}
            ></div>
          )}
          {dayEvents.map((event, index) => {
            const { timeStart, timeEnd, category } = event;
            const eventPosition = positionEvent(timeStart, timeEnd);
            const isSmallEvent = parseInt(eventPosition.height) < 50; // Define small event threshold

            return (
              <div
                key={event.id}
                className="event"
                style={{
                  position: "absolute",
                  top: eventPosition.top,
                  height: eventPosition.height,
                  left: 0,
                  width: "100%",
                  padding: "1px",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  borderRadius: "6px",
                  zIndex: 3,
                  color: "black",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeStart(event.timeStart);
                  setTimeEnd(event.timeEnd);
                  setSelectedDay(day);
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
              >
                <div
                  style={{
                    height: "100%",
                  }}
                  className={`relative rounded-md pr-0.5 py-0.5 ${
                    event.label === "blue"
                      ? " blue-bg"
                      : event.label === "gray"
                      ? "gray-bg "
                      : event.label === "green"
                      ? " green-bg "
                      : event.label === "purple"
                      ? " purple-bg "
                      : " yellow-bg "
                  }`}
                >
                  {isSmallEvent ? (
                    <div className="text-sm ml-1 overflow-hidden whitespace-nowrap flex items-center gap-1">
                      <span>{event.title}</span>
                      <span className="text-xs text-gray-600">
                        • {timeStart} - {timeEnd}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm ml-1 overflow-clip">
                        {event.title}
                      </div>
                      <div className="ml-1 text-xs text-nowrap overflow-clip text-gray-600">
                        {`${timeStart} - ${timeEnd}`}
                      </div>
                    </>
                  )}
                  {category === "Workout" && (
                    <img
                      src={workoutIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Meeting" && (
                    <img
                      src={meetingIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Study" && (
                    <img
                      src={studyIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Personal" && (
                    <img
                      src={personalIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Work" && (
                    <img
                      src={workIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Social" && (
                    <img
                      src={socialIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Family" && (
                    <img
                      src={familyIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Health" && (
                    <img
                      src={healthIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Hobby" && (
                    <img
                      src={hobbyIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Chores" && (
                    <img
                      src={choresIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Travel" && (
                    <img
                      src={travelIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Finance" && (
                    <img
                      src={financeIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Learning" && (
                    <img
                      src={learningIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Self-care" && (
                    <img
                      src={selfCareIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {category === "Events" && (
                    <img
                      src={eventsIcon}
                      alt={category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DayWeek;

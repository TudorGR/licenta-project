import React, { useContext, useEffect, useRef, useState } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";
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

const DayView = () => {
  const timeGridRef = useRef(null);
  const {
    selectedDay,
    setSelectedDay,
    savedEvents,
    setShowEventModal,
    setSelectedEvent,
    setTimeStart,
    setTimeEnd,
    categories,
    setCategories,
    selectedCategory,
    setSelectedCategory,
  } = useContext(Context);

  const calculateTimePosition = () => {
    const now = dayjs();
    const minutes = now.hour() * 60 + now.minute();
    return (minutes / 60) * TIME_SLOT_HEIGHT;
  };

  const [dayEvents, setDayEvents] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [currentTimePosition, setCurrentTimePosition] = useState(
    calculateTimePosition()
  );

  useEffect(() => {
    const events = savedEvents.filter(
      (e) => dayjs(e.day).format("DD-MM-YY") === selectedDay.format("DD-MM-YY")
    );
    setDayEvents(events);
  }, [savedEvents, selectedDay]);

  useEffect(() => {
    if (timeGridRef.current) {
      const middayPosition = 12 * TIME_SLOT_HEIGHT - 600 / 2;
      timeGridRef.current.scrollTop = middayPosition;
    }
  }, []);

  useEffect(() => {
    const updateTimePosition = () => {
      setCurrentTimePosition(calculateTimePosition());
    };

    updateTimePosition();
    const interval = setInterval(updateTimePosition, 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePrevDay = () => {
    setSelectedDay(selectedDay.subtract(1, "day"));
  };

  const handleNextDay = () => {
    setSelectedDay(selectedDay.add(1, "day"));
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

    const adjustedHours = Math.min(Math.max(hours, 0), 23);
    return `${adjustedHours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  };

  const handleMouseDown = (e) => {
    if (e.target.closest(".eventt")) {
      return;
    }
    e.preventDefault();
    const gridElement = e.currentTarget;
    setIsDragging(true);
    const startTime = getTimeFromMousePosition(e.clientY, gridElement);
    setDragStart(startTime);
    setDragEnd(startTime);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const gridElement = e.currentTarget;
    const currentTime = getTimeFromMousePosition(e.clientY, gridElement);
    setDragEnd(currentTime);
  };

  const handleMouseUp = (e) => {
    if (!isDragging) {
      return;
    }

    e.preventDefault();
    setIsDragging(false);
    const [startTime, endTime] = [dragStart, dragEnd].sort();
    setTimeStart(startTime);
    setTimeEnd(endTime);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const positionEvent = (startTime, endTime) => {
    const getTimeSlot = (time) => {
      const [hour, minute] = time.split(":");
      return parseInt(hour) * 60 + parseInt(minute);
    };

    const startMinutes = getTimeSlot(startTime);
    const endMinutes = getTimeSlot(endTime);
    const top = (startMinutes / 60) * TIME_SLOT_HEIGHT;
    const height = ((endMinutes - startMinutes) / 60) * TIME_SLOT_HEIGHT;

    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <div className="flex-1 flex flex-col">
      <div ref={timeGridRef} className="flex-1 overflow-y-auto">
        <div
          className="relative h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
        >
          <div className="absolute left-15 right-0 h-full">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="border-gray-200 border-l absolute w-full gray-border-bottom"
                style={{
                  top: `${i * TIME_SLOT_HEIGHT}px`,
                  height: `${TIME_SLOT_HEIGHT}px`,
                }}
              >
                <div className="pl-1.5 absolute -left-14 -top-2.5 text-sm text-gray-500">
                  {`${i.toString().padStart(2, "0")}:00`}
                </div>
              </div>
            ))}

            {isDragging && dragStart && dragEnd && (
              <div
                className="eventt absolute left-0 w-full bg-gray-200 opacity-50 rounded-md"
                style={positionEvent(dragStart, dragEnd)}
              />
            )}

            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTimeStart(event.timeStart);
                  setTimeEnd(event.timeEnd);
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
                className="pb-0.5 px-0.5 eventt absolute left-0 w-full cursor-pointer"
                style={positionEvent(event.timeStart, event.timeEnd)}
              >
                <div
                  className={`h-full rounded-md px-1 relative ${
                    event.label === "blue"
                      ? "blue-bg"
                      : event.label === "gray"
                      ? "gray-bg"
                      : event.label === "green"
                      ? "green-bg"
                      : event.label === "purple"
                      ? "purple-bg"
                      : "yellow-bg"
                  }`}
                >
                  <div className="text-sm">{event.title}</div>
                  <div className="text-xs text-gray-600">
                    {`${event.timeStart} - ${event.timeEnd}`}
                  </div>
                  {event.category === "Workout" && (
                    <img
                      src={workoutIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Meeting" && (
                    <img
                      src={meetingIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Study" && (
                    <img
                      src={studyIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Personal" && (
                    <img
                      src={personalIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Work" && (
                    <img
                      src={workIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Social" && (
                    <img
                      src={socialIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Family" && (
                    <img
                      src={familyIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Health" && (
                    <img
                      src={healthIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Hobby" && (
                    <img
                      src={hobbyIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Chores" && (
                    <img
                      src={choresIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Travel" && (
                    <img
                      src={travelIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Finance" && (
                    <img
                      src={financeIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Learning" && (
                    <img
                      src={learningIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Self-care" && (
                    <img
                      src={selfCareIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                  {event.category === "Events" && (
                    <img
                      src={eventsIcon}
                      alt={event.category}
                      className="absolute bottom-0 right-0 backIcon"
                    />
                  )}
                </div>
              </div>
            ))}

            {selectedDay.format("DD-MM-YY") === dayjs().format("DD-MM-YY") && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;

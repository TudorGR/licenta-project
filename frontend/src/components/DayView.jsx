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
import pinIcon from "../assets/lock.svg";
import deleteIcon from "../assets/delete_icon.svg";
import ContextMenu from "./ContextMenu";
import {
  categoryColors,
  lightCategoryColors,
  darkCategoryColors,
} from "../utils/categoryColors";

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
    dispatchEvent,
  } = useContext(Context);

  const calculateTimePosition = () => {
    const now = dayjs();
    const minutes = now.hour() * 60 + now.minute();
    return (minutes / 60) * TIME_SLOT_HEIGHT;
  };

  const getTimeSlot = (time) => {
    const [hour, minute] = time.split(":");
    return parseInt(hour) * 60 + parseInt(minute);
  };

  const [dayEvents, setDayEvents] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [currentTimePosition, setCurrentTimePosition] = useState(
    calculateTimePosition()
  );
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    eventId: null,
  });
  const [hoveredEventId, setHoveredEventId] = useState(null);

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

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".context-menu")) {
        setContextMenu({ isOpen: false, x: 0, y: 0, eventId: null });
      }
    };

    window.addEventListener("mousedown", handleGlobalClick);
    return () => window.removeEventListener("mousedown", handleGlobalClick);
  }, []);

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

    // Convert times to minutes for comparison
    const getMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    let [startTime, endTime] = [dragStart, dragEnd].sort();

    // Calculate duration in minutes
    const duration = getMinutes(endTime) - getMinutes(startTime);

    // If duration is less than 15 minutes, extend the end time
    if (duration < 15) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + 15;
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      endTime = `${newHours.toString().padStart(2, "0")}:${newMinutes
        .toString()
        .padStart(2, "0")}`;
    }

    setTimeStart(startTime);
    setTimeEnd(endTime);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleContextMenu = (e, event) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({ isOpen: false, x: 0, y: 0, eventId: null });

    setTimeout(() => {
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        eventId: event.id,
      });
    }, 0);
  };

  const handleLock = async (eventId) => {
    try {
      await dispatchEvent({
        type: "lock",
        payload: { id: eventId },
      });
    } catch (error) {
      console.error("Error locking event:", error);
    }
  };

  const positionEvent = (startTime, endTime) => {
    const startMinutes = getTimeSlot(startTime);
    const endMinutes = getTimeSlot(endTime);
    let top;
    let height;

    if (endMinutes < startMinutes) {
      top = (endMinutes / 60) * TIME_SLOT_HEIGHT;
      height = ((startMinutes - endMinutes) / 60) * TIME_SLOT_HEIGHT;
    } else {
      top = (startMinutes / 60) * TIME_SLOT_HEIGHT;
      height = ((endMinutes - startMinutes) / 60) * TIME_SLOT_HEIGHT;
    }
    return { top: `${top}px`, height: `${height}px` };
  };

  const getTimeUntil = (event) => {
    const now = dayjs();
    const eventDay = dayjs(parseInt(event.day));
    const eventStartTime = eventDay
      .hour(parseInt(event.timeStart.split(":")[0]))
      .minute(parseInt(event.timeStart.split(":")[1]));
    const eventEndTime = eventDay
      .hour(parseInt(event.timeEnd.split(":")[0]))
      .minute(parseInt(event.timeEnd.split(":")[1]));

    if (now.isBefore(eventStartTime)) {
      // Event hasn't started yet
      const diffMinutes = eventStartTime.diff(now, "minute");

      if (diffMinutes < 60) {
        return `${diffMinutes}m until`;
      } else if (diffMinutes < 60 * 24) {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `${hours}h${mins > 0 ? ` ${mins}m` : ""} until`;
      } else if (diffMinutes < 60 * 24 * 7) {
        const days = Math.floor(diffMinutes / (60 * 24));
        const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
        return `${days}d${hours > 0 ? ` ${hours}h` : ""} until`;
      } else {
        const weeks = Math.floor(diffMinutes / (60 * 24 * 7));
        const days = Math.floor((diffMinutes % (60 * 24 * 7)) / (60 * 24));
        return `${weeks}w${days > 0 ? ` ${days}d` : ""} until`;
      }
    } else if (now.isAfter(eventEndTime)) {
      // Event has ended
      const diffMinutes = now.diff(eventEndTime, "minute");

      if (diffMinutes < 60) {
        return `${diffMinutes}m since`;
      } else if (diffMinutes < 60 * 24) {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `${hours}h${mins > 0 ? ` ${mins}m` : ""} since`;
      } else if (diffMinutes < 60 * 24 * 7) {
        const days = Math.floor(diffMinutes / (60 * 24));
        const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
        return `${days}d${hours > 0 ? ` ${hours}h` : ""} since`;
      } else {
        const weeks = Math.floor(diffMinutes / (60 * 24 * 7));
        const days = Math.floor((diffMinutes % (60 * 24 * 7)) / (60 * 24));
        return `${weeks}w${days > 0 ? ` ${days}d` : ""} since`;
      }
    } else {
      // Event is happening now
      const diffMinutes = eventEndTime.diff(now, "minute");

      if (diffMinutes < 60) {
        return `Ends ${diffMinutes}m`;
      } else if (diffMinutes < 60 * 24) {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `Ends ${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
      } else if (diffMinutes < 60 * 24 * 7) {
        const days = Math.floor(diffMinutes / (60 * 24));
        const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
        return `Ends ${days}d${hours > 0 ? ` ${hours}h` : ""}`;
      } else {
        const weeks = Math.floor(diffMinutes / (60 * 24 * 7));
        const days = Math.floor((diffMinutes % (60 * 24 * 7)) / (60 * 24));
        return `Ends ${weeks}w${days > 0 ? ` ${days}d` : ""}`;
      }
    }
  };

  const calculateBoxplotData = (category) => {
    const oneMonthAgo = selectedDay.subtract(1, "month").format("YYYY-MM-DD");
    const currentDate = selectedDay.format("YYYY-MM-DD");

    const categoryEvents = savedEvents.filter((event) => {
      const eventDate = dayjs(event.day).format("YYYY-MM-DD");
      return (
        event.category === category &&
        eventDate >= oneMonthAgo &&
        eventDate < currentDate
      );
    });

    const durations = categoryEvents.map((event) => {
      const startMinutes = getTimeSlot(event.timeStart);
      const endMinutes = getTimeSlot(event.timeEnd);
      return endMinutes - startMinutes;
    });

    if (durations.length === 0) return null;

    durations.sort((a, b) => a - b);
    const q1 = durations[Math.floor(durations.length / 4)];
    const median = durations[Math.floor(durations.length / 2)];
    const q3 = durations[Math.floor((durations.length * 3) / 4)];
    const min = durations[0];
    const max = durations[durations.length - 1];

    return { min, q1, median, q3, max };
  };

  const renderBoxplot = (event) => {
    const boxplotData = calculateBoxplotData(event.category);
    if (!boxplotData) return null;

    const eventDuration =
      getTimeSlot(event.timeEnd) - getTimeSlot(event.timeStart);

    const scale = (value) => {
      if (value < boxplotData.min) return 0;
      if (value > boxplotData.max) return 100;
      return (
        ((value - boxplotData.min) / (boxplotData.max - boxplotData.min)) * 100
      );
    };

    return (
      <div className="relative ml-1 h-4 mt-[-8px] overflow-x-clip">
        {/* Boxplot background */}
        <div className="absolute left-0 right-0 h-1 bg-gray-200 rounded"></div>
        {/* Interquartile range (Q1 to Q3) */}
        <div
          className="absolute h-1 bg-gray-400 rounded"
          style={{
            left: `${scale(boxplotData.q1)}%`,
            right: `${100 - scale(boxplotData.q3)}%`,
          }}
        ></div>
        {/* Median line */}
        <div
          className="absolute h-1 bg-gray-600 rounded"
          style={{
            left: `${scale(boxplotData.median)}%`,
            width: "2px",
          }}
        ></div>
        <div
          className="absolute h-2 w-2 bg-blue-500 rounded-full"
          style={{
            left: `${scale(eventDuration) > 88 ? 88 : scale(eventDuration)}%`,
            transform: "translateY(-20%)",
          }}
        ></div>
      </div>
    );
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
                className="eventt border-1 border-gray-500 min-h-3 opacity-50 absolute left-0 w-full rounded-sm bg-gray-200"
                style={positionEvent(dragStart, dragEnd)}
              />
            )}

            {dayEvents.map((event) => {
              const { top, height } = positionEvent(
                event.timeStart,
                event.timeEnd
              );
              const isSmallEvent = parseInt(height) < 50;
              const eventDuration =
                getTimeSlot(event.timeEnd) - getTimeSlot(event.timeStart);

              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeStart(event.timeStart);
                    setTimeEnd(event.timeEnd);
                    setSelectedDay(dayjs(event.day));
                    setSelectedEvent(event);
                    setShowEventModal(true);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, event)}
                  onMouseEnter={() => setHoveredEventId(event.id)}
                  onMouseLeave={() => setHoveredEventId(null)}
                  className="transition-all pb-0.5 px-0.5 eventt absolute left-0 w-full cursor-pointer"
                  style={{ top, height }}
                >
                  <div
                    className="h-full rounded-sm relative overflow-hidden"
                    style={{
                      backgroundColor:
                        lightCategoryColors[event.category || "None"],
                      height: "100%",
                      position: "relative",
                    }}
                  >
                    <div
                      className="w-full relative flex items-start h-full"
                      style={{
                        borderLeft: `4px solid ${
                          categoryColors[event.category || "None"]
                        }`,
                      }}
                    >
                      {isSmallEvent ? (
                        <div className="w-full text-xs ml-0.5 overflow-hidden whitespace-nowrap flex justify-between items-center gap-1 h-full">
                          <div className="flex items-center">
                            <span
                              style={{
                                color: `${
                                  darkCategoryColors[event.category || "None"]
                                }`,
                              }}
                              className="truncate font-medium ml-0.5"
                            >
                              {event.title}
                            </span>
                            <div
                              style={{
                                color: `${
                                  darkCategoryColors[event.category || "None"]
                                }`,
                              }}
                              className="opacity-80 ml-1 text-xs font-medium text-nowrap overflow-clip text-gray-600"
                            >
                              {`${event.timeStart} - ${event.timeEnd}`}
                            </div>
                          </div>
                          {event.locked && (
                            <img
                              src={pinIcon}
                              className="w-3 h-3 opacity-50 mr-1"
                              alt="Locked"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="relative w-full">
                          {event.locked && (
                            <img
                              src={pinIcon}
                              className="absolute top-5 right-0 w-3 h-3 opacity-50"
                              alt="Locked"
                            />
                          )}

                          {event.category === "Workout" && (
                            <img
                              src={workoutIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Meeting" && (
                            <img
                              src={meetingIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Study" && (
                            <img
                              src={studyIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Personal" && (
                            <img
                              src={personalIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Work" && (
                            <img
                              src={workIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Social" && (
                            <img
                              src={socialIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Family" && (
                            <img
                              src={familyIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Health" && (
                            <img
                              src={healthIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Hobby" && (
                            <img
                              src={hobbyIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Chores" && (
                            <img
                              src={choresIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Travel" && (
                            <img
                              src={travelIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Finance" && (
                            <img
                              src={financeIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Learning" && (
                            <img
                              src={learningIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Self-care" && (
                            <img
                              src={selfCareIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}
                          {event.category === "Events" && (
                            <img
                              src={eventsIcon}
                              alt={event.category}
                              className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                            />
                          )}

                          <div
                            style={{
                              color: `${
                                darkCategoryColors[event.category || "None"]
                              }`,
                            }}
                            className="text-xs font-medium ml-1 mt-0.5 overflow-clip"
                          >
                            {event.title}
                          </div>
                          <div
                            style={{
                              color: `${
                                darkCategoryColors[event.category || "None"]
                              }`,
                            }}
                            className="opacity-80 ml-1 text-xs font-medium text-nowrap overflow-clip text-gray-600"
                          >
                            {`${event.timeStart} - ${event.timeEnd}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {eventDuration > 60 && (
                    <div
                      style={{
                        color: `${
                          darkCategoryColors[event.category || "None"]
                        }`,
                      }}
                      className={`absolute font-medium bottom-2 left-1 w-full text-black text-xs px-1 py-0.5 z-10 transition-opacity ${
                        hoveredEventId === event.id ? "opacity-80" : "opacity-0"
                      }`}
                    >
                      {getTimeUntil(event)}
                    </div>
                  )}

                  {eventDuration > 60 && (
                    <div
                      className={`transition-all ${
                        hoveredEventId === event.id ? "opacity-90" : "opacity-0"
                      }`}
                    >
                      {renderBoxplot(event)}
                    </div>
                  )}
                </div>
              );
            })}

            {selectedDay.format("DD-MM-YY") === dayjs().format("DD-MM-YY") && (
              <div
                className="absolute left-0 w-full bg-blue-500"
                style={{
                  top: `${currentTimePosition}px`,
                  height: "2px",
                  zIndex: 13,
                }}
              >
                <div className="absolute -left-1 -top-0.75 w-2 h-2 rounded-full bg-blue-500" />
              </div>
            )}
          </div>
        </div>
      </div>
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onLock={() => {
            handleLock(contextMenu.eventId);
            setContextMenu({ isOpen: false, x: 0, y: 0, eventId: null });
          }}
          onDelete={() => {
            const eventToDelete = savedEvents.find(
              (e) => e.id === contextMenu.eventId
            );
            if (eventToDelete) {
              dispatchEvent({ type: "delete", payload: eventToDelete });
            }
            setContextMenu({ isOpen: false, x: 0, y: 0, eventId: null });
          }}
          isLocked={
            savedEvents.find((e) => e.id === contextMenu.eventId)?.locked
          }
        />
      )}
    </div>
  );
};

export default DayView;

import dayjs from "dayjs";
import React, { useContext, useEffect, useRef, useState, useMemo } from "react";
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
import pinIcon from "../assets/lock.svg";
import deleteIcon from "../assets/delete_icon.svg";
import lockIcon from "../assets/lock.svg";
import bellIcon from "../assets/bell.svg";
import ContextMenu from "./ContextMenu";
import locationIcon from "../assets/location.svg";
import TravelTimeIndicator, {
  clearTravelTimeCache,
} from "./TravelTimeIndicator";
import WeatherIndicator from "./WeatherIndicator";
import {
  categoryColors,
  lightCategoryColors,
  darkCategoryColors,
} from "../utils/categoryColors";
import { api } from "../services/api";
import { getCategoryIcon } from "../utils/categoryIcons";

const TIME_SLOT_HEIGHT = 50;
const TOTAL_HEIGHT = TIME_SLOT_HEIGHT * 24;

const DayWeek = ({
  day,
  index,
  dayIndex,
  isDraggingAcrossDays,
  draggedEvent,
  currentDragDayIndex,
  onStartEventDrag,
  onEventDrag,
  onEventDragEnd,
}) => {
  const timeGridRef = useRef(null);
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
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    eventId: null,
  });
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const {
    setSelectedDay,
    setShowEventModal,
    setSelectedEvent,
    setTimeStart,
    setTimeEnd,
    selectedEvent,
    selectedHeatmapCategories,
    dispatchEvent,
    savedEvents,
    loading,
    showHeatmap,
    workingHoursStart,
    workingHoursEnd,
    showWeather,
    showLocalEvents,
    userCity,
  } = useContext(Context);

  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [localEvents, setLocalEvents] = useState([]);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

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
    const mins = Math.round((minutes % 60) / 15) * 15; // Snap to 15-minute intervals

    // Ensure minutes stay within valid bounds (0-59)
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
    if (isDragging) {
      const gridElement = e.currentTarget;
      const currentTime = getTimeFromMousePosition(e.clientY, gridElement);
      setDragEnd(currentTime);
    } else if (isDraggingAcrossDays && draggedEvent) {
      const gridElement = e.currentTarget;
      const timeString = getTimeFromMousePosition(e.clientY, gridElement);

      onEventDrag(e, timeString, dayIndex);

      // Ensure `hasMoved` is set when the mouse moves beyond a small threshold
      if (
        mouseDownPos &&
        (Math.abs(e.clientX - mouseDownPos.x) > 3 ||
          Math.abs(e.clientY - mouseDownPos.y) > 3)
      ) {
        setHasMoved(true);
      }

      // Set `hasMoved` to true if the event is dragged to a different day
      if (currentDragDayIndex !== dayIndex) {
        setHasMoved(true);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      setSelectedDay(day);
      const [startTime, endTime] = [dragStart, dragEnd].sort();
      setTimeStart(startTime);
      setTimeEnd(endTime);
      setSelectedEvent(null);
      setShowEventModal(true);
    } else if (isDraggingAcrossDays) {
      if (hasMoved) {
        handleEventDrag();
      } else {
        setTimeStart(draggedEvent.timeStart);
        setTimeEnd(draggedEvent.timeEnd);
        setSelectedDay(day);
        setSelectedEvent(draggedEvent);
        setShowEventModal(true);
      }
      setIsDraggingEvent(false);
      setMouseDownPos(null);
      setHasMoved(false);
    }
  };

  const handleEventDrag = async () => {
    try {
      // Your existing event update code...
      // Add this line to clear travel time cache when events are moved
      clearTravelTimeCache();
      // Rest of your function...
    } catch (error) {
      console.error("Error updating event:", error);
    }
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

  const handleEventMouseDown = (e, event) => {
    if (e.button !== 0) return;

    e.stopPropagation();

    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setHasMoved(false); // Reset `hasMoved` when starting a new drag

    if (event.locked) {
      // Directly open the modal for locked events without delay
      setSelectedEvent(event);
      setTimeStart(event.timeStart);
      setTimeEnd(event.timeEnd);
      setSelectedDay(dayjs(event.day));
      setShowEventModal(true);
      return;
    }

    const gridElement = e.currentTarget.closest(".time-grid");
    const rect = gridElement.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const relativeX = e.clientX - rect.left;

    const eventTop = (getTimeSlot(event.timeStart) / 60) * TIME_SLOT_HEIGHT;
    const offset = {
      x: relativeX,
      y: relativeY - eventTop,
    };

    onStartEventDrag(event, offset, dayIndex);

    setIsDraggingEvent(true);
    setDragOffset(relativeY - eventTop);
  };

  useEffect(() => {
    const updateTimePosition = () => {
      setCurrentTimePosition(calculateTimePosition());
    };

    // Run immediately
    updateTimePosition();

    // Update more frequently - every 15 seconds
    const interval = setInterval(updateTimePosition, 15000);

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

  useEffect(() => {
    if (showLocalEvents) {
      api
        .getLocalEvents(userCity)
        .then((events) => {
          setLocalEvents(events);
        })
        .catch((error) => {
          console.error("Error fetching local events:", error);
        });
    } else {
      setLocalEvents([]);
    }
  }, [showLocalEvents, userCity]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };

    // Check initially
    checkScreenSize();

    // Set up event listener for resize events
    window.addEventListener("resize", checkScreenSize);

    // Clean up
    return () => window.removeEventListener("resize", checkScreenSize);
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

    let top;
    let height;

    if (endMinutes < startMinutes) {
      top = (endMinutes / 60) * TIME_SLOT_HEIGHT;
      height = ((startMinutes - endMinutes) / 60) * TIME_SLOT_HEIGHT;
    } else {
      top = (startMinutes / 60) * TIME_SLOT_HEIGHT;
      height = ((endMinutes - startMinutes) / 60) * TIME_SLOT_HEIGHT;
    }
    return { top: `${top}px`, height: `${height - 1}px` };
  };

  const dayEvents = useMemo(() => {
    if (!Array.isArray(savedEvents)) return [];
    return savedEvents.filter(
      (evt) => dayjs(evt.day).format("DD-MM-YY") === day.format("DD-MM-YY")
    );
  }, [savedEvents, day]);

  const dayLocalEvents = useMemo(() => {
    if (!showLocalEvents || !localEvents.length) return [];

    return localEvents.filter((event) => {
      return dayjs(event.day).format("DD-MM-YY") === day.format("DD-MM-YY");
    });
  }, [localEvents, day, showLocalEvents]);

  useEffect(() => {
    if (timeGridRef.current) {
      const middayPosition = 12 * TIME_SLOT_HEIGHT - 600 / 2;
      timeGridRef.current.scrollTop = middayPosition;
    }
  }, []);

  const getHeatmapData = () => {
    if (!savedEvents) return null;

    const currentDate = day.format("YYYY-MM-DD");
    const oneMonthAgo = day.subtract(1, "month").format("YYYY-MM-DD");
    const currentWeekStart = dayjs().startOf("week").add(1, "day");

    const timeSlotsByCategory = {};

    savedEvents
      .filter((event) => {
        const eventDate = dayjs(event.day);
        const isSameWeekDay = eventDate.day() === day.day();

        const isBeforeToday = eventDate.isBefore(currentDate);
        const isAfterOneMonthAgo = eventDate.isAfter(oneMonthAgo);
        const isPastMonthEvent = isBeforeToday && isAfterOneMonthAgo;

        const isCurrentWeek = eventDate.isSame(day, "week");

        return isSameWeekDay && (isPastMonthEvent || isCurrentWeek);
      })
      .forEach((event) => {
        if (!selectedHeatmapCategories.has(event.category)) return;

        const category = event.category || "None";
        if (!timeSlotsByCategory[category]) {
          timeSlotsByCategory[category] = {};
        }

        const startMinutes = getTimeSlot(event.timeStart);
        const endMinutes = getTimeSlot(event.timeEnd);

        for (let min = startMinutes; min < endMinutes; min += 15) {
          timeSlotsByCategory[category][min] =
            (timeSlotsByCategory[category][min] || 0) + 1;
        }
      });

    return timeSlotsByCategory;
  };

  const renderHeatmap = () => {
    const heatmapData = getHeatmapData();
    if (!heatmapData) return null;

    return Object.entries(heatmapData).map(([category, timeSlots]) =>
      Object.entries(timeSlots).map(([minutes, count]) => {
        const opacity = Math.min(count * 0.2, 0.8);
        return (
          <div
            key={`${category}-${minutes}`}
            className="absolute left-0 w-full"
            style={{
              top: `${(parseInt(minutes) / 60) * TIME_SLOT_HEIGHT}px`,
              height: `${TIME_SLOT_HEIGHT / 4}px`,
              backgroundColor: categoryColors[category],
              opacity,
            }}
          />
        );
      })
    );
  };

  const getCategoryCounts = () => {
    if (!dayEvents || dayEvents.length === 0) return [];

    const categoryData = {};
    let totalDuration = 0;

    const getWorkingMinutes = (start, end) => {
      const [startHour, startMin] = start.split(":").map(Number);
      const [endHour, endMin] = end.split(":").map(Number);
      return endHour * 60 + endMin - (startHour * 60 + startMin);
    };

    const workingMinutes = getWorkingMinutes(
      workingHoursStart || "09:00",
      workingHoursEnd || "17:00"
    );

    dayEvents.forEach((event) => {
      const category = event.category || "None";
      if (!categoryData[category]) {
        categoryData[category] = { count: 0, duration: 0 };
      }

      const eventDuration =
        getTimeSlot(event.timeEnd) - getTimeSlot(event.timeStart);
      categoryData[category].count += 1;
      categoryData[category].duration += eventDuration;
      totalDuration += eventDuration;
    });

    return Object.entries(categoryData)
      .map(([category, { count, duration }]) => ({
        category,
        count,
        duration,
        percentage: totalDuration > 0 ? duration / totalDuration : 0,
        workingHoursPercentage:
          workingMinutes > 0 ? Math.min(duration / workingMinutes, 1) : 0,
      }))
      .sort((a, b) => b.duration - a.duration);
  };

  const getConsecutiveEventsWithLocations = (events) => {
    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => {
      const timeA = new Date(`2000-01-01T${a.timeStart}`).getTime();
      const timeB = new Date(`2000-01-01T${b.timeStart}`).getTime();
      return timeA - timeB;
    });

    const pairs = [];

    // Find consecutive events with locations
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEvent = sortedEvents[i];
      const nextEvent = sortedEvents[i + 1];

      // Check if both events have locations
      if (
        currentEvent.location &&
        nextEvent.location &&
        currentEvent.location.trim() !== "" &&
        nextEvent.location.trim() !== ""
      ) {
        // Check if they are on the same day
        if (currentEvent.day === nextEvent.day) {
          // Calculate the time between events in minutes
          const currentEndTime = new Date(
            `2000-01-01T${currentEvent.timeEnd}`
          ).getTime();
          const nextStartTime = new Date(
            `2000-01-01T${nextEvent.timeStart}`
          ).getTime();
          const timeBetween = (nextStartTime - currentEndTime) / (1000 * 60);

          // Consider events consecutive if they're less than 3 hours apart
          if (timeBetween <= 180 && timeBetween > 0) {
            pairs.push({
              firstEvent: currentEvent,
              secondEvent: nextEvent,
              timeBetween,
            });
          }
        }
      }
    }

    return pairs;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="calendar-day flex flex-col">
      <header className="sticky top-0 z-15 bg-gradient-to-b from-white to-transparent ">
        <div
          className={`relative flex justify-center items-center gap-1 text-nowrap h-11 w-full mx-auto text-sm text-center ${
            getCurrentDay() ? "text-black" : "text-gray-500"
          }`}
        >
          {isSmallScreen ? (
            // Compact format for small screens
            <div className="flex flex-col gap-1 items-center text-xs text-gray-500">
              <p>{day.format("dd")[0]}</p>
              <div
                className={`flex items-center justify-center ${
                  getCurrentDay()
                    ? "bg-black rounded-full w-5 h-5 shadow-custom text-white"
                    : "text-gray-500"
                }`}
              >
                <p className="text-xs">{day.format("DD")}</p>
              </div>
            </div>
          ) : (
            // Original format for larger screens
            <div className="flex flex-row gap-1 items-center text-xs text-gray-500">
              <p>{day.format("ddd")}</p>
              <div
                className={`flex items-center justify-center ${
                  getCurrentDay()
                    ? "bg-black rounded-full w-6 h-6 shadow-custom text-white"
                    : ""
                }`}
              >
                <p>{day.format("DD")}</p>
              </div>
            </div>
          )}
        </div>
      </header>
      <div
        className={`time-grid relative mb-12 `}
        style={{ height: "1200px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (!isDraggingAcrossDays) {
            setIsDragging(false);
          }
        }}
      >
        {/* Travel time indicators between consecutive events with locations */}
        {!showHeatmap &&
          getConsecutiveEventsWithLocations(dayEvents).map((pair, idx) => {
            const firstEventEnd = getTimeSlot(pair.firstEvent.timeEnd);
            const secondEventStart = getTimeSlot(pair.secondEvent.timeStart);

            const top = (firstEventEnd / 60) * TIME_SLOT_HEIGHT;
            const height =
              ((secondEventStart - firstEventEnd) / 60) * TIME_SLOT_HEIGHT;

            return (
              <div
                key={`travel-${idx}`}
                className="travel-time-container"
                style={{
                  position: "absolute",
                  top: `${top}px`,
                  height: `${height}px`,
                  left: "0",
                  width: "100%",
                  zIndex: 30,
                }}
              >
                <TravelTimeIndicator
                  origin={pair.firstEvent.location}
                  destination={pair.secondEvent.location}
                  timeBetween={pair.timeBetween}
                />
              </div>
            );
          })}
        <div
          className={`absolute top-0 w-full z-3 ${
            day.day() === 6 || day.day() === 0 ? "bg-black/1" : ""
          }`}
          style={{ height: `${TOTAL_HEIGHT}px` }}
        ></div>
        <div
          className={`${
            day.day() === 0
              ? "border-t  border-gray-100"
              : "border-t border-r border-gray-100"
          }`}
          style={{ height: `${TOTAL_HEIGHT}px`, position: "relative" }}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={`timeslot-${i}`}
              className="time-slot gray-border-bottom flex items-center justify-center"
              style={{
                position: "absolute",
                top: `${i * TIME_SLOT_HEIGHT}px`,
                height: `${TIME_SLOT_HEIGHT}px`,
                width: "100%",
                zIndex: 1,
              }}
            >
              {showWeather && <WeatherIndicator hour={i} date={day} />}
            </div>
          ))}
          {isDragging && dragStart && dragEnd && (
            <div
              className="z-2 border-1 border-gray-500 min-h-3 opacity-50 absolute left-0 w-full  bg-gray-200"
              style={{
                ...positionEvent(dragStart, dragEnd),
                pointerEvents: "none",
              }}
            />
          )}
          {isDraggingAcrossDays &&
            draggedEvent &&
            currentDragDayIndex === dayIndex && (
              <div
                className=" absolute left-0 w-full z-20 pointer-events-none"
                style={{
                  ...positionEvent(
                    draggedEvent.timeStart,
                    draggedEvent.timeEnd
                  ),
                }}
              >
                <div
                  className="relative  h-full"
                  style={{
                    backgroundColor:
                      lightCategoryColors[draggedEvent.category || "None"],
                    opacity: 0.7,
                    border: `1px dashed ${
                      categoryColors[draggedEvent.category || "None"]
                    }`,
                  }}
                ></div>
              </div>
            )}
          {showHeatmap ? (
            renderHeatmap()
          ) : (
            <>
              {dayEvents.map((event) => {
                const { timeStart, timeEnd, category, id } = event;
                const eventPosition = positionEvent(timeStart, timeEnd);
                const isSmallEvent = parseInt(eventPosition.height) < 30;
                const eventDuration =
                  getTimeSlot(event.timeEnd) - getTimeSlot(event.timeStart);

                return (
                  <div
                    key={`event-${
                      id ||
                      `${day.format("YYYY-MM-DD")}-${timeStart}-${timeEnd}`
                    }`}
                    onMouseDown={(e) => handleEventMouseDown(e, event)}
                    onMouseEnter={() => setHoveredEventId(event.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    className={`event transition-opacity ${
                      draggedEvent && draggedEvent.id === event.id
                        ? "opacity-50 "
                        : ""
                    }`}
                    style={{
                      position: "absolute",
                      top: eventPosition.top,
                      height: eventPosition.height,
                      left: 0,
                      width: "calc(100% - 0px)",
                      padding: "0px",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      borderRadius: "6px",
                      zIndex: 3,
                      color: "black",
                    }}
                    onContextMenu={(e) => handleContextMenu(e, event)}
                  >
                    <div
                      className="relative  pr-0.5 py-0 overflow-hidden"
                      style={{
                        backgroundColor:
                          lightCategoryColors[event.category || "Other"],
                        height: "100%",
                        position: "relative",
                      }}
                    >
                      <div
                        className=" relative flex items-start h-full"
                        style={{
                          borderLeft: `3px ${
                            categoryColors[event.category || "Other"]
                          } ${event.locked ? "dashed" : "solid"}`,
                        }}
                      >
                        {isSmallEvent ? (
                          <div className="text-xs ml-0.5 overflow-hidden whitespace-nowrap flex justify-between items-center gap-1 h-full">
                            <div className="flex truncate items-center w-[calc(100%-16px)]">
                              <span
                                style={{
                                  color: `${
                                    darkCategoryColors[event.category || "None"]
                                  }`,
                                }}
                                className="font-medium ml-0.5"
                              >
                                {event.title}
                              </span>
                              <div
                                style={{
                                  color: `${
                                    categoryColors[event.category || "None"]
                                  }`,
                                }}
                                className="ml-1 text-xs text-nowrap text-gray-600"
                              >
                                {`${timeStart} · ${timeEnd}`}
                              </div>
                            </div>
                            {event.reminderEnabled ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                stroke={`${
                                  darkCategoryColors[event.category || "None"]
                                }`}
                                fill="none"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="absolute  right-0 w-3 h-3"
                              >
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                              </svg>
                            ) : null}
                          </div>
                        ) : (
                          // For events with more space, show additional details
                          (() => {
                            const showLocation =
                              event.location &&
                              parseInt(eventPosition.height) >= 60;
                            const showDescription =
                              event.description &&
                              parseInt(eventPosition.height) >= 80;

                            return (
                              <div className="relative w-full">
                                {event.reminderEnabled ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    stroke={`${
                                      darkCategoryColors[
                                        event.category || "None"
                                      ]
                                    }`}
                                    fill="none"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    className="absolute round top-5 right-0 w-3 h-3"
                                  >
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                  </svg>
                                ) : null}

                                {category && (
                                  <img
                                    src={getCategoryIcon(category)}
                                    alt={category}
                                    className="absolute round top-1 right-0 w-3 h-3"
                                  />
                                )}

                                {/* Add location icon to the right side, below reminder icon */}
                                {showLocation && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke={`${
                                      darkCategoryColors[
                                        event.category || "None"
                                      ]
                                    }`}
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    className="absolute round top-9 right-0 w-3 h-3 "
                                  >
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                  </svg>
                                )}

                                <div
                                  style={{
                                    color: `${
                                      darkCategoryColors[
                                        event.category || "None"
                                      ]
                                    }`,
                                  }}
                                  className="mt-0.5 w-[calc(100%-16px)] text-xs font-medium ml-1 overflow-clip truncate"
                                >
                                  {event.title}
                                </div>

                                <div
                                  style={{
                                    color: `${
                                      darkCategoryColors[
                                        event.category || "None"
                                      ]
                                    }`,
                                  }}
                                  className={`${
                                    event.reminderEnabled
                                      ? "w-[calc(100%-16px)]"
                                      : "w-[calc(100%-4px)]"
                                  } opacity-50 truncate ml-1 text-xs text-nowrap overflow-clip text-gray-600`}
                                >
                                  {`${timeStart} · ${timeEnd}`}
                                </div>

                                {/* Keep location text on left side without the icon */}
                                {showLocation && (
                                  <div
                                    style={{
                                      color: `${
                                        darkCategoryColors[
                                          event.category || "None"
                                        ]
                                      }`,
                                    }}
                                    className="ml-1 w-[calc(100%-16px)] text-xs opacity-50 truncate "
                                  >
                                    {event.location}
                                  </div>
                                )}

                                {/* Show description if available and there's enough space */}
                                {showDescription && (
                                  <div
                                    style={{
                                      color: `${
                                        darkCategoryColors[
                                          event.category || "None"
                                        ]
                                      }`,
                                    }}
                                    className="italic ml-1 text-xs opacity-50 truncate  line-clamp-2"
                                  >
                                    {event.description}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {showLocalEvents &&
                dayLocalEvents.map((event) => {
                  const { timeStart, timeEnd } = event;
                  const eventPosition = positionEvent(timeStart, timeEnd);

                  return (
                    <div
                      key={`local-event-${event.title}-${timeStart}`}
                      className="local-event"
                      style={{
                        position: "absolute",
                        top: eventPosition.top,
                        height: eventPosition.height,
                        left: 0,
                        width: "100%",
                        padding: "0px 4px 0px 0px",
                        boxSizing: "border-box",
                        pointerEvents: "none", // Makes the event "ghost-like"
                        opacity: 0.75, // Increased opacity for better visibility
                        zIndex: 2,
                      }}
                    >
                      <div
                        className="relative  pr-0.5 py-0 overflow-hidden"
                        style={{
                          backgroundColor: "#f3f4f6", // Lighter background
                          height: "100%",
                          position: "relative",
                          border: "2px dashed #6b7280", // Thicker, more visible border
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)", // Subtle shadow
                        }}
                      >
                        <div className="relative flex items-start h-full">
                          <div
                            className="text-xs ml-0.5 overflow-hidden whitespace-nowrap flex justify-between items-center gap-1 h-full"
                            style={{ width: "100%" }}
                          >
                            <div className="flex flex-col justify-center h-full w-full bg-white bg-opacity-70 px-1 rounded">
                              <span className="truncate font-semibold text-gray-800">
                                {event.title}
                              </span>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-gray-500"></div>{" "}
                                {/* Indicator dot */}
                                <div className="font-medium text-xs text-nowrap overflow-clip text-gray-700">
                                  {`${timeStart} · ${timeEnd}`}
                                </div>
                              </div>
                              {event.location && (
                                <div className="text-gray-600 text-xs truncate">
                                  {event.location}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </div>
        {getCurrentDay() ? (
          <div
            className="absolute left-0 w-full bg-black rounded-full"
            style={{
              top: `${currentTimePosition}px`,
              height: "2px",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div className="absolute -left-1 -top-0.75 w-2 h-2 rounded-full bg-black" />
          </div>
        ) : (
          <div
            className="absolute left-0 w-full bg-black/10 rounded-full"
            style={{
              top: `${currentTimePosition}px`,
              height: "2px",
              zIndex: 10,
              pointerEvents: "none",
            }}
          ></div>
        )}
      </div>
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={() => {
            const eventToEdit = savedEvents.find(
              (e) => e.id === contextMenu.eventId
            );
            if (eventToEdit) {
              setSelectedEvent(eventToEdit);
              setTimeStart(eventToEdit.timeStart);
              setTimeEnd(eventToEdit.timeEnd);
              setSelectedDay(dayjs(eventToEdit.day));
              setShowEventModal(true);
            }
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

export default DayWeek;

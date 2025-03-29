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
import ContextMenu from "./ContextMenu";
import { categoryColors, lightCategoryColors } from "../utils/categoryColors";

const TIME_SLOT_HEIGHT = 50;
const TOTAL_HEIGHT = TIME_SLOT_HEIGHT * 24;

const DayWeek = ({ day, index }) => {
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
    dispatchEvent, // Get dispatchEvent from context
    savedEvents,
    loading,
    showHeatmap,
    workingHoursStart,
    workingHoursEnd,
  } = useContext(Context);

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

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".context-menu")) {
        setContextMenu({ isOpen: false, x: 0, y: 0, eventId: null });
      }
    };

    window.addEventListener("mousedown", handleGlobalClick);
    return () => window.removeEventListener("mousedown", handleGlobalClick);
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
    const currentWeekStart = dayjs().startOf("week").add(1, "day"); // Monday of current week

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
        // Less than an hour
        return `${diffMinutes}m until`;
      } else if (diffMinutes < 60 * 24) {
        // Less than a day
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `${hours}h${mins > 0 ? ` ${mins}m` : ""} until`;
      } else if (diffMinutes < 60 * 24 * 7) {
        // Less than a week
        const days = Math.floor(diffMinutes / (60 * 24));
        const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
        return `${days}d${hours > 0 ? ` ${hours}h` : ""} until`;
      } else {
        // More than a week
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

  const getCategoryCounts = () => {
    if (!dayEvents || dayEvents.length === 0) return [];

    // Group events by category and track both count and duration
    const categoryData = {};
    let totalDuration = 0;

    // Calculate total working hours in minutes
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

      // Calculate event duration in minutes
      const eventDuration =
        getTimeSlot(event.timeEnd) - getTimeSlot(event.timeStart);
      categoryData[category].count += 1;
      categoryData[category].duration += eventDuration;
      totalDuration += eventDuration;
    });

    // Convert to array for rendering
    return Object.entries(categoryData)
      .map(([category, { count, duration }]) => ({
        category,
        count,
        duration,
        percentage: totalDuration > 0 ? duration / totalDuration : 0,
        workingHoursPercentage:
          workingMinutes > 0 ? Math.min(duration / workingMinutes, 1) : 0, // Cap at 100%
      }))
      .sort((a, b) => b.duration - a.duration);
  };

  const calculateBoxplotData = (category) => {
    const oneMonthAgo = day.subtract(1, "month").format("YYYY-MM-DD");
    const currentDate = day.format("YYYY-MM-DD");

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
            transform: "translateX(-50%)",
            transform: "translateY(-20%)",
          }}
        ></div>
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="calendar-day flex flex-col">
      <header className="sticky top-0 z-6">
        <div
          className={`relative flex justify-center items-center gap-1.5 text-nowrap h-11 w-full border-gray-200 border-l mx-auto calendar-day-number text-sm text-center ${
            getCurrentDay() ? "text-black" : "text-gray-500"
          }`}
        >
          {/* Bar chart background - fills width based on number of categories */}
          <div className="absolute inset-0 flex justify-center items-end w-full">
            {getCategoryCounts().map(
              (
                { category, count, duration, workingHoursPercentage },
                index,
                array
              ) => {
                // Scale the height based on percentage of working hours
                // Now using workingHoursPercentage instead of percentage
                const barHeight = `${Math.min(
                  workingHoursPercentage * 100,
                  100
                )}%`;
                const barWidth = `${100 / array.length}%`;

                return (
                  <div
                    key={`bar-${category}`}
                    style={{
                      backgroundColor:
                        categoryColors[category] || categoryColors.None,
                      height: barHeight,
                      width: barWidth,
                      opacity: 0.4,
                      transition: "height 0.5s ease-in-out", // Smooth transition for height changes
                    }}
                    title={`${category}: ${count} events (${Math.round(
                      duration / 60
                    )} hours, ${Math.round(
                      workingHoursPercentage * 100
                    )}% of working hours)`}
                  />
                );
              }
            )}
          </div>

          {/* Text content (on top of bars) */}
          <div className="z-10 flex flex-col items-center text-black">
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
              key={`timeslot-${i}`}
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
          {showHeatmap ? (
            renderHeatmap()
          ) : (
            <>
              {dayEvents.map((event) => {
                const { timeStart, timeEnd, category, id } = event; // Extract id
                const eventPosition = positionEvent(timeStart, timeEnd);
                const isSmallEvent = parseInt(eventPosition.height) < 30; // Changed from 50 to 25
                const eventDuration =
                  getTimeSlot(event.timeEnd) - getTimeSlot(event.timeStart);

                return (
                  <div
                    key={`event-${
                      id ||
                      `${day.format("YYYY-MM-DD")}-${timeStart}-${timeEnd}`
                    }`}
                    className="event transition-all"
                    style={{
                      position: "absolute",
                      top: eventPosition.top,
                      height: eventPosition.height,
                      left: 0,
                      width: "100%",
                      padding: "0px 4px 0px 0px",
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
                    onMouseEnter={() => setHoveredEventId(event.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    onContextMenu={(e) => handleContextMenu(e, event)}
                  >
                    <div
                      className="relative rounded-sm pr-0.5 py-0"
                      style={{
                        backgroundColor:
                          lightCategoryColors[event.category || "None"],
                        height: "100%",
                        position: "relative",
                      }}
                    >
                      <div
                        className=" relative flex items-start h-full rounded-sm"
                        style={{
                          borderLeft: `3px solid ${
                            categoryColors[event.category || "None"]
                          }`,
                        }}
                      >
                        {isSmallEvent ? (
                          <div className="text-xs ml-0.5 overflow-hidden whitespace-nowrap flex justify-between items-center gap-1 h-full">
                            <div className="flex items-center">
                              <span className="truncate">{event.title}</span>
                              <div className="ml-1 mt-1 font-xxs text-nowrap overflow-clip text-gray-600">
                                {`${timeStart} - ${timeEnd}`}
                              </div>
                            </div>
                            {event.locked && (
                              <img
                                src={lockIcon}
                                className="w-2 h-2 opacity-50 mr-1"
                                alt="Locked"
                                style={{ marginLeft: "auto" }} // Ensure it stays at the far right
                              />
                            )}
                          </div>
                        ) : (
                          <div className="absolute w-full">
                            {event.locked && (
                              <img
                                src={lockIcon}
                                className="absolute round top-5 right-0 w-3 h-3 opacity-50"
                                alt="Locked"
                              />
                            )}

                            {category === "Workout" && (
                              <img
                                src={workoutIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Meeting" && (
                              <img
                                src={meetingIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Study" && (
                              <img
                                src={studyIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Personal" && (
                              <img
                                src={personalIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Work" && (
                              <img
                                src={workIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Social" && (
                              <img
                                src={socialIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Family" && (
                              <img
                                src={familyIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Health" && (
                              <img
                                src={healthIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Hobby" && (
                              <img
                                src={hobbyIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Chores" && (
                              <img
                                src={choresIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Travel" && (
                              <img
                                src={travelIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Finance" && (
                              <img
                                src={financeIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Learning" && (
                              <img
                                src={learningIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Self-care" && (
                              <img
                                src={selfCareIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}
                            {category === "Events" && (
                              <img
                                src={eventsIcon}
                                alt={category}
                                className="absolute round top-1 right-0 w-3 h-3 opacity-50"
                              />
                            )}

                            <div className="w-[80%] text-xs ml-1 mt-0.5 overflow-clip truncate">
                              {event.title}
                            </div>
                            <div className="w-[80%] truncate ml-1 font-xxs text-nowrap overflow-clip text-gray-600">
                              {`${timeStart} - ${timeEnd}`}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Time until/since indicator */}
                      {eventDuration > 60 && (
                        <div
                          className={`absolute bottom-2 left-1 w-full text-black font-xxs px-1 py-0.5 z-10 transition-opacity ${
                            hoveredEventId === event.id
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        >
                          {getTimeUntil(event)}
                        </div>
                      )}
                      {eventDuration > 60 && (
                        <div
                          className={`transition-all ${
                            hoveredEventId === event.id
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        >
                          {renderBoxplot(event)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
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

export default DayWeek;

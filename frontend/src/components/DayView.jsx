import React, { useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast"; // Add this import
import Context from "../context/Context";
import dayjs from "dayjs";
import pinIcon from "../assets/lock.svg";
import deleteIcon from "../assets/delete_icon.svg";
import bellIcon from "../assets/bell.svg";
import ContextMenu from "./ContextMenu";
import TravelTimeIndicator, {
  clearTravelTimeCache,
} from "./TravelTimeIndicator"; // Add .clearTravelTimeCache to the import
import WeatherIndicator from "./WeatherIndicator"; // Add this import
import {
  categoryColors,
  lightCategoryColors,
  darkCategoryColors,
} from "../utils/categoryColors";
import { getCategoryIcon } from "../utils/categoryIcons"; // Add this import

const TIME_SLOT_HEIGHT = 50;
const TOTAL_HEIGHT = TIME_SLOT_HEIGHT * 24;

const DayView = () => {
  const [currentTimeString, setCurrentTimeString] = useState("");
  const [justDragged, setJustDragged] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [selectedEventForClick, setSelectedEventForClick] = useState(null);

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
    showWeather,
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
  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [initialY, setInitialY] = useState(0);

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
      const now = dayjs();
      setCurrentTimePosition(calculateTimePosition());
      setCurrentTimeString(now.format("HH:mm"));
    };

    // Run immediately
    updateTimePosition();

    // Update more frequently - every 15 seconds
    const interval = setInterval(updateTimePosition, 15000);

    return () => clearInterval(interval);
  }, []); // No dependencies needed as calculateTimePosition doesn't depend on props/state

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
    return () => {
      setIsDragging(false);
      setIsDraggingEvent(false);
      setDraggedEvent(null);
      setMouseDownPos(null);
      setHasMoved(false);
      setSelectedEventForClick(null);
    };
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
    if (isDragging) {
      e.preventDefault();
      const gridElement = e.currentTarget;
      const currentTime = getTimeFromMousePosition(e.clientY, gridElement);
      setDragEnd(currentTime);
    } else if (isDraggingEvent && draggedEvent) {
      e.preventDefault();

      if (
        mouseDownPos &&
        (Math.abs(e.clientX - mouseDownPos.x) > 3 ||
          Math.abs(e.clientY - mouseDownPos.y) > 3)
      ) {
        setHasMoved(true);
      }

      const gridElement = e.currentTarget;
      const rect = gridElement.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;

      const adjustedY = relativeY - dragOffset;
      const newTimeSlot = Math.floor((adjustedY / TIME_SLOT_HEIGHT) * 60);
      let hours = Math.floor(newTimeSlot / 60);
      let mins = Math.round((newTimeSlot % 60) / 15) * 15;

      // Fix for minutes = 60 case
      if (mins === 60) {
        mins = 0;
        hours += 1;
      }

      // Ensure hours are within valid range
      hours = Math.min(Math.max(hours, 0), 23);

      const newTime = `${hours.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}`;

      const eventDuration =
        getTimeSlot(draggedEvent.timeEnd) - getTimeSlot(draggedEvent.timeStart);

      let totalMins = hours * 60 + mins + eventDuration;
      let endHours = Math.floor(totalMins / 60);
      let endMins = totalMins % 60;

      // Ensure end hours are within valid range
      endHours = Math.min(Math.max(endHours, 0), 23);

      const newEndTime = `${endHours.toString().padStart(2, "0")}:${endMins
        .toString()
        .padStart(2, "0")}`;

      setDraggedEvent({
        ...draggedEvent,
        timeStart: newTime,
        timeEnd: newEndTime,
      });
    }
  };

  const resetDragStates = () => {
    setIsDraggingEvent(false);
    setDraggedEvent(null);
    setMouseDownPos(null);
    setHasMoved(false);
    setSelectedEventForClick(null);
  };

  const handleMouseUp = async (e) => {
    if (isDragging) {
      e.preventDefault();
      setIsDragging(false);

      const getMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };

      let [startTime, endTime] = [dragStart, dragEnd].sort();

      const duration = getMinutes(endTime) - getMinutes(startTime);

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
    } else if (isDraggingEvent && draggedEvent) {
      e.preventDefault();

      try {
        // Always update the event's position first for immediate feedback
        if (hasMoved) {
          const updatedEvent = {
            ...draggedEvent,
            timeStart: draggedEvent.timeStart,
            timeEnd: draggedEvent.timeEnd,
          };

          await dispatchEvent({
            type: "update",
            payload: updatedEvent,
          });

          // Clear travel time cache when events are moved
          TravelTimeIndicator.clearTravelTimeCache();

          // Overlap detection kept but toast notification removed
        } else {
          setTimeStart(draggedEvent.timeStart);
          setTimeEnd(draggedEvent.timeEnd);
          setSelectedDay(dayjs(draggedEvent.day));
          setSelectedEvent(draggedEvent);
          setShowEventModal(true);
        }
      } catch (error) {
        console.error("Error updating event position:", error);
        toast.error("Failed to update event position", { duration: 3000 });
      } finally {
        // Always reset drag states regardless of outcome
        resetDragStates();
      }
    } else if (mouseDownPos && !hasMoved && selectedEventForClick) {
      setTimeStart(selectedEventForClick.timeStart);
      setTimeEnd(selectedEventForClick.timeEnd);
      setSelectedDay(dayjs(selectedEventForClick.day));
      setSelectedEvent(selectedEventForClick);
      setShowEventModal(true);

      resetDragStates();
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

  const handleEventMouseDown = (e, event) => {
    if (e.button !== 0) return;

    e.stopPropagation();

    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setHasMoved(false);

    setSelectedEventForClick(event);

    if (event.locked) return;

    const gridElement = e.currentTarget.closest(".relative");
    const rect = gridElement.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    setIsDraggingEvent(true);
    setDraggedEvent(event);
    setInitialY(relativeY);

    const eventTop = (getTimeSlot(event.timeStart) / 60) * TIME_SLOT_HEIGHT;
    setDragOffset(relativeY - eventTop);
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

  const consecutiveEventPairs = getConsecutiveEventsWithLocations(dayEvents);

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
                className="border-gray-100 border-l absolute w-full gray-border-bottom"
                style={{
                  top: `${i * TIME_SLOT_HEIGHT}px`,
                  height: `${TIME_SLOT_HEIGHT}px`,
                }}
              >
                <div className="pl-1.5 absolute -left-13 -top-2 text-xs text-gray-300">
                  {`${i.toString().padStart(2, "0")}:00`}
                </div>
                {showWeather && (
                  <div className="absolute right-1 top-1 opacity-50">
                    <WeatherIndicator hour={i} date={selectedDay} />
                  </div>
                )}
              </div>
            ))}

            {isDragging && dragStart && dragEnd && (
              <div
                className="eventt border-1 border-gray-500 min-h-3 opacity-50 absolute left-0 w-full  bg-gray-200"
                style={positionEvent(dragStart, dragEnd)}
              />
            )}

            {isDraggingEvent && draggedEvent && (
              <div
                className="absolute  left-0 w-full z-20 pointer-events-none"
                style={positionEvent(
                  draggedEvent.timeStart,
                  draggedEvent.timeEnd
                )}
              >
                <div
                  className="relative  h-[calc(100%-1px)]"
                  style={{
                    backgroundColor:
                      lightCategoryColors[draggedEvent.category || "None"],
                    opacity: 0.7,
                    border: `1px dashed ${
                      categoryColors[draggedEvent.category || "None"]
                    }`,
                  }}
                >
                  <div
                    className="relative flex items-start h-full"
                    style={{
                      borderLeft: `3px ${
                        categoryColors[draggedEvent.category || "None"]
                      } "solid"`,
                    }}
                  >
                    <div className="text-xs ml-1 overflow-hidden whitespace-nowrap mt-1"></div>
                  </div>
                </div>
              </div>
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
                  onMouseDown={(e) => handleEventMouseDown(e, event)}
                  onContextMenu={(e) => handleContextMenu(e, event)}
                  onMouseEnter={() => setHoveredEventId(event.id)}
                  onMouseLeave={() => setHoveredEventId(null)}
                  className={`transition-opacity  eventt absolute left-0 ${
                    showWeather ? "w-[calc(100%-64px)]" : "w-full"
                  } cursor-pointer ${
                    draggedEvent && draggedEvent.id === event.id
                      ? "opacity-50"
                      : ""
                  }`}
                  style={{ top, height }}
                >
                  <div
                    className="h-[calc(100%-1px)] mb-px mx-px border-white relative overflow-hidden"
                    style={{
                      backgroundColor:
                        lightCategoryColors[event.category || "None"],
                    }}
                  >
                    <div
                      className="w-full relative flex items-start h-full"
                      style={{
                        borderLeft: `4px ${event.locked ? "dashed" : "solid"} ${
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
                          {event.reminderEnabled ? (
                            <img
                              src={bellIcon}
                              className="w-3 h-3 opacity-50 mr-1"
                              alt="Reminder"
                            />
                          ) : null}
                        </div>
                      ) : (
                        <div className="relative w-full">
                          {event.reminderEnabled ? (
                            <img
                              src={bellIcon}
                              className="absolute top-5 right-0 w-3 h-3 opacity-50"
                              alt="Reminder"
                            />
                          ) : null}

                          {event.category && (
                            <img
                              src={getCategoryIcon(event.category)}
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
                      className={`absolute font-medium bottom-1 left-2 w-full text-black text-xs px-0.5 py-0.5 z-10 transition-opacity ${
                        hoveredEventId === event.id ? "opacity-80" : "opacity-0"
                      }`}
                    >
                      {getTimeUntil(event)}
                    </div>
                  )}
                </div>
              );
            })}

            {consecutiveEventPairs.map((pair, idx) => {
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
                    zIndex: 2,
                    pointerEvents: "none",
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

            {selectedDay.format("DD-MM-YY") === dayjs().format("DD-MM-YY") && (
              <div
                className="absolute left-0 w-full bg-black"
                style={{
                  top: `${currentTimePosition}px`,
                  height: "2px",
                  zIndex: 13,
                }}
              >
                <div className="absolute -left-15 -top-1.75 text-xs text-white w-15 px-[15.5px] bg-black">
                  {currentTimeString}
                </div>
              </div>
            )}
          </div>
        </div>
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

export default DayView;

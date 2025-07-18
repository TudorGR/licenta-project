import React, { useContext, useEffect, useRef, useState } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";
import bellIcon from "../assets/bell.svg";
import ContextMenu from "./ContextMenu";
import {
  categoryColors,
  lightCategoryColors,
  darkCategoryColors,
} from "../utils/categoryColors";
import { getCategoryIcon } from "../utils/categoryIcons";

const TIME_SLOT_HEIGHT = 50;

const DayView = () => {
  const [currentTimeString, setCurrentTimeString] = useState("");
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
  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

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
        } else {
          setTimeStart(draggedEvent.timeStart);
          setTimeEnd(draggedEvent.timeEnd);
          setSelectedDay(dayjs(draggedEvent.day));
          setSelectedEvent(draggedEvent);
          setShowEventModal(true);
        }
      } catch (error) {
        console.error("Error updating event position:", error);
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

  const handleEventMouseDown = (e, event) => {
    if (e.button !== 0) return;

    e.stopPropagation();

    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setHasMoved(false);

    setSelectedEventForClick(event);

    const gridElement = e.currentTarget.closest(".relative");
    const rect = gridElement.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    setIsDraggingEvent(true);
    setDraggedEvent(event);

    const eventTop = (getTimeSlot(event.timeStart) / 60) * TIME_SLOT_HEIGHT;
    setDragOffset(relativeY - eventTop);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div ref={timeGridRef} className="flex-1 overflow-y-auto">
        <div
          className="relative h-full mt-[45px]"
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
                className=" absolute w-full gray-border-bottom2"
                style={{
                  top: `${i * TIME_SLOT_HEIGHT}px`,
                  height: `${TIME_SLOT_HEIGHT}px`,
                }}
              >
                <div className="pl-1.5 absolute -left-13 -top-2 text-xs text-gray-300">
                  {`${i.toString().padStart(2, "0")}:00`}
                </div>
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
                  className={`transition-opacity  eventt absolute left-0 w-full
                   cursor-pointer ${
                     draggedEvent && draggedEvent.id === event.id
                       ? "opacity-50"
                       : ""
                   }`}
                  style={{ top, height }}
                >
                  <div
                    className="h-[calc(100%-1px)] mb-px  border-white relative overflow-hidden"
                    style={{
                      backgroundColor:
                        lightCategoryColors[event.category || "None"],
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
                              className=" ml-1 text-xs opacity-50 text-nowrap overflow-clip text-gray-600"
                            >
                              {`${event.timeStart} · ${event.timeEnd}`}
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
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              stroke={`${
                                darkCategoryColors[event.category || "None"]
                              }`}
                              fill="none"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="absolute round top-5 right-0.5 w-3 h-3"
                            >
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                          ) : null}

                          {event.category && (
                            <img
                              src={getCategoryIcon(event.category)}
                              alt={event.category}
                              className="absolute round top-1 right-0.5 w-3 h-3"
                            />
                          )}

                          {/* Add location icon with category color */}
                          {event.location && parseInt(height) >= 60 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={`${
                                darkCategoryColors[event.category || "None"]
                              }`}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="absolute round top-9 right-0.5 w-3 h-3 "
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                          )}

                          <div
                            style={{
                              color: `${
                                darkCategoryColors[event.category || "None"]
                              }`,
                            }}
                            className="text-xs font-medium ml-1 mt-0.5 overflow-clip truncate w-[85%]"
                          >
                            {event.title}
                          </div>

                          <div
                            style={{
                              color: `${
                                darkCategoryColors[event.category || "None"]
                              }`,
                            }}
                            className="ml-1 text-xs opacity-50 text-nowrap overflow-clip  truncate"
                          >
                            {`${event.timeStart} · ${event.timeEnd}`}
                          </div>

                          {/* Show location if available and there's enough space */}
                          {event.location && parseInt(height) >= 60 && (
                            <div
                              style={{
                                color: `${
                                  darkCategoryColors[event.category || "None"]
                                }`,
                              }}
                              className="ml-1  text-xs opacity-50 truncate w-[85%]"
                            >
                              {event.location}
                            </div>
                          )}

                          {/* Show description if available and there's enough space */}
                          {event.description && parseInt(height) >= 80 && (
                            <div
                              style={{
                                color: `${
                                  darkCategoryColors[event.category || "None"]
                                }`,
                              }}
                              className="ml-1 italic text-xs opacity-50 truncate w-[85%] line-clamp-2"
                            >
                              {event.description}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
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
                <div className="absolute -left-1 -top-0.75 w-2 h-2 rounded-full bg-black" />
                <div className="absolute -left-15.5 -top-1.75 text-xs font-medium w-15 px-[15.5px] ">
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
        />
      )}
    </div>
  );
};

export default DayView;

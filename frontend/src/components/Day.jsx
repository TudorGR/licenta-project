import dayjs from "dayjs";
import React, { useContext, useEffect, useState, useRef } from "react";
import Context from "../context/Context";
import pinIcon from "../assets/lock.svg";
import deleteIcon from "../assets/delete_icon.svg";
import lockIcon from "../assets/lock.svg";
import ContextMenu from "./ContextMenu";
import {
  lightCategoryColors,
  categoryColors,
  darkCategoryColors,
} from "../utils/categoryColors";

// Mini day view constants
const MINI_TIME_SLOT_HEIGHT = 10; // Smaller height for mini view
const WORKING_HOURS_START = 8; // 8 AM
const WORKING_HOURS_END = 20; // 8 PM
const TOTAL_HOURS = WORKING_HOURS_END - WORKING_HOURS_START;
const MINI_VIEW_HEIGHT = TOTAL_HOURS * MINI_TIME_SLOT_HEIGHT;

// Add this function to handle event layout
const getEventLayout = (events) => {
  if (!events.length) return [];

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    const startA = a.timeStart.split(":").map(Number);
    const startB = b.timeStart.split(":").map(Number);
    return startA[0] * 60 + startA[1] - (startB[0] * 60 + startB[1]);
  });

  // For each event, determine its column and width
  const layout = [];
  const columnsOccupied = [];

  for (const event of sortedEvents) {
    const eventStart =
      event.timeStart.split(":").map(Number)[0] * 60 +
      event.timeStart.split(":").map(Number)[1];
    const eventEnd =
      event.timeEnd.split(":").map(Number)[0] * 60 +
      event.timeEnd.split(":").map(Number)[1];

    // Find the first available column
    let column = 0;
    while (
      columnsOccupied[column]?.some(
        ([start, end]) => eventStart < end && eventEnd > start
      )
    ) {
      column++;
    }

    if (!columnsOccupied[column]) {
      columnsOccupied[column] = [];
    }

    columnsOccupied[column].push([eventStart, eventEnd]);

    layout.push({
      event,
      column,
      totalColumns: 1, // Will be updated later
    });
  }

  // Determine total columns needed
  const totalColumns = Math.max(...layout.map((item) => item.column), 0) + 1;

  // Update each event with total columns info
  return layout.map((item) => ({
    ...item,
    totalColumns,
  }));
};

const Day = ({ day, index, showMiniDayView = false }) => {
  const [dayEvents, setDayEvents] = useState([]);
  const {
    setSelectedDay,
    setShowEventModal,
    savedEvents,
    setSelectedEvent,
    setTimeStart,
    setTimeEnd,
    dispatchEvent,
  } = useContext(Context);

  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    eventId: null,
  });

  const dayRef = useRef(null);

  function getCurrentDay() {
    return day.format("DD-MM-YY") === dayjs().format("DD-MM-YY");
  }

  useEffect(() => {
    const events = savedEvents.filter(
      (e) => dayjs(e.day).format("DD-MM-YY") === day.format("DD-MM-YY")
    );
    setDayEvents(events);
  }, [savedEvents, day]);

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

  // For mini day view
  const getTimeSlot = (time) => {
    const [hour, minute] = time.split(":");
    return parseInt(hour) * 60 + parseInt(minute);
  };

  const positionEvent = (startTime, endTime) => {
    const [startHour] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    // Adjust to visible hours range
    const visibleStartHour = Math.max(WORKING_HOURS_START, startHour);
    const visibleEndHour = Math.min(
      WORKING_HOURS_END,
      endMinute > 0 ? endHour + 1 : endHour
    );

    const totalHours = WORKING_HOURS_END - WORKING_HOURS_START;
    const top = ((visibleStartHour - WORKING_HOURS_START) / totalHours) * 100;
    const heightValue =
      ((visibleEndHour - visibleStartHour) / totalHours) * 100;
    const height = Math.max(heightValue, 2); // Minimum height percentage

    return { top, height };
  };

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".context-menu")) {
        setContextMenu({ isOpen: false, x: 0, y: 0, eventId: null });
      }
    };

    window.addEventListener("mousedown", handleGlobalClick);
    return () => window.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  const eventLayout = getEventLayout(dayEvents);

  return (
    <div
      ref={dayRef}
      className={`overflow-clip calendar-day border border-r-gray-100 border-b-gray-100 border-l-0 border-t-0 flex flex-col h-full ${
        day.day() === 6 || day.day() === 0 ? "bg-black/1" : ""
      }`}
    >
      <header className="flex flex-col items-center">
        {index === 0 && (
          <p className="text-sm mt-1">{day.format("ddd").toUpperCase()}</p>
        )}
        <p
          className={`calendar-day-number text-sm p-1 my-1 text-center ${
            getCurrentDay()
              ? "bg-black text-white rounded-full w-7"
              : " rounded-full w-7"
          }`}
        >
          {day.format("DD")}
        </p>
      </header>

      <div className="flex-1 flex">
        {/* Left column - original events list */}
        <div
          className="w-3/5 cursor-pointer overflow-hidden"
          onClick={() => {
            setSelectedDay(day);
            setTimeStart("08:00");
            setTimeEnd("09:00");
            setShowEventModal(true);
          }}
        >
          {dayEvents.slice(0, index === 0 ? 4 : 5).map((event, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedEvent(event)}
              onContextMenu={(e) => handleContextMenu(e, event)}
              className="px-1 ml-0.5 mr-0.5 text-sm rounded mb-1 truncate text-black"
              style={{
                backgroundColor: lightCategoryColors[event.category || "None"],
              }}
            >
              <div
                style={{
                  color: darkCategoryColors[event.category || "None"],
                }}
                className="font-medium relative text-xs"
              >
                {event.title}
              </div>
            </div>
          ))}
          {dayEvents.length > (index === 0 ? 4 : 5) && (
            <p className="text-xs ml-1">
              +{dayEvents.length - (index === 0 ? 4 : 5)}
            </p>
          )}
        </div>

        {/* Right column - mini day view */}
        {showMiniDayView && (
          <div
            className="w-2/5 relative cursor-pointer h-full min-h-[100px]"
            onClick={() => {
              setSelectedDay(day);
              setTimeStart("08:00");
              setTimeEnd("09:00");
              setShowEventModal(true);
            }}
          >
            {/* Events with improved layout */}
            {eventLayout.map(({ event, column, totalColumns }, idx) => {
              const { top, height } = positionEvent(
                event.timeStart,
                event.timeEnd
              );
              const columnWidth = 100 / totalColumns;

              // Use percentage for top position instead of fixed pixels
              const topPercent = top;
              const heightPercent = height;

              return (
                <div
                  key={`mini-event-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(event);
                    setShowEventModal(true);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, event)}
                  className="absolute rounded-sm border border-white overflow-hidden"
                  style={{
                    top: `${topPercent}%`,
                    height: `${heightPercent}%`,
                    left: `${column * columnWidth}%`,
                    width: `${columnWidth - 2}%`,
                    backgroundColor: categoryColors[event.category || "None"],
                    zIndex: 2,
                  }}
                ></div>
              );
            })}
          </div>
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

export default Day;

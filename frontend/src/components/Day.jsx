import dayjs from "dayjs";
import React, { useContext, useEffect, useState, useRef } from "react";
import Context from "../context/Context";
import ContextMenu from "./ContextMenu";
import {
  lightCategoryColors,
  categoryColors,
  darkCategoryColors,
} from "../utils/categoryColors";

const Day = ({ day, index }) => {
  const [dayEvents, setDayEvents] = useState([]);
  const dayRef = useRef(null);
  const [maxEvents, setMaxEvents] = useState(index === 0 ? 4 : 5);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
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

  function getCurrentDay() {
    return day.format("DD-MM-YY") === dayjs().format("DD-MM-YY");
  }

  // Add screen size detection
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

  // Calculate available space and adjust max events
  useEffect(() => {
    const calculateMaxEvents = () => {
      if (dayRef.current) {
        const headerHeight = 40; // Approximate height for the day header
        const availableHeight = dayRef.current.clientHeight - headerHeight;
        const eventHeight = 20; // Approximate height of each event item
        const plusIndicatorHeight = 16; // Height of the "+X more" indicator

        // Calculate how many events can fit, leaving room for the "+X" indicator if needed
        const calculatedMaxEvents = Math.floor(
          (availableHeight - plusIndicatorHeight) / eventHeight
        );

        // Set minimum of 1 event
        setMaxEvents(Math.max(calculatedMaxEvents, 1));
      }
    };

    calculateMaxEvents();

    // Add resize listener to recalculate when window size changes
    window.addEventListener("resize", calculateMaxEvents);
    return () => window.removeEventListener("resize", calculateMaxEvents);
  }, []);

  useEffect(() => {
    const events = savedEvents.filter(
      (e) =>
        dayjs(parseInt(e.day)).format("DD-MM-YY") === day.format("DD-MM-YY")
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

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".context-menu")) {
        setContextMenu({ isOpen: false, x: 0, y: 0, eventId: null });
      }
    };

    window.addEventListener("mousedown", handleGlobalClick);
    return () => window.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  return (
    <div
      ref={dayRef}
      className={`overflow-clip calendar-day border border-r-gray-100 border-b-gray-100 border-l-0 border-t-0 flex flex-col h-full ${
        day.day() === 6 || day.day() === 0 ? "bg-black/1" : ""
      }`}
    >
      <header className="flex flex-col items-center">
        <div
          className={`flex ${
            getCurrentDay() ? "gap-1" : ""
          } text-xs text-gray-500 justify-center items-center calendar-day-number h-11 text-center `}
        >
          {isSmallScreen ? (
            // Compact format for small screens
            <div className="flex flex-col">
              {index === 0 && <p className="text-xs">{day.format("dd")[0]}</p>}
              <p
                className={`text-xs flex items-center justify-center ${
                  getCurrentDay()
                    ? "bg-black text-white rounded-full w-5 h-5"
                    : "rounded-full w-5 h-5"
                }`}
              >
                {day.format("DD")}
              </p>
            </div>
          ) : (
            // Original format for larger screens
            <>
              {index === 0 && (
                <p className="text-xs mr-1">{day.format("ddd")}</p>
              )}
              <p
                className={`text-xs text-gray-500 flex items-center justify-center ${
                  getCurrentDay()
                    ? "bg-black text-white rounded-full w-6 h-6"
                    : "rounded-full w-6 h-6"
                }`}
              >
                {day.format("DD")}
              </p>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Events list - now full width */}
        <div
          className="w-full cursor-pointer overflow-hidden"
          onClick={() => {
            setSelectedDay(day);
            setTimeStart("08:00");
            setTimeEnd("09:00");
            setShowEventModal(true);
          }}
        >
          {dayEvents.slice(0, maxEvents).map((event, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedEvent(event)}
              onContextMenu={(e) => handleContextMenu(e, event)}
              className="border-l-3 pl-1 text-sm mb-px truncate text-black"
              style={{
                backgroundColor: lightCategoryColors[event.category || "Other"],
                borderColor: categoryColors[event.category || "Other"],
              }}
            >
              <div
                style={{
                  color: darkCategoryColors[event.category || "Other"],
                }}
                className="font-medium relative text-xs truncate"
              >
                {event.title}
              </div>
            </div>
          ))}
          {dayEvents.length > maxEvents && (
            <p className="text-xs ml-1">+{dayEvents.length - maxEvents}</p>
          )}
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

export default Day;

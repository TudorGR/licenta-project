import dayjs from "dayjs";
import React, { useContext, useEffect, useState } from "react";
import Context from "../context/Context";
import pinIcon from "../assets/lock.svg";
import deleteIcon from "../assets/delete_icon.svg";

const Day = ({ day, index }) => {
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
    <div className="calendar-day border border-r-0 border-b-0 border-l-gray-200 border-t-gray-200 flex flex-col">
      <header className="flex flex-col items-center">
        {index === 0 && (
          <p className=" text-sm mt-1">{day.format("ddd").toUpperCase()}</p>
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
      <div
        className="flex-1 cursor-pointer"
        onClick={() => {
          setSelectedDay(day);
          setTimeStart("08:00");
          setTimeEnd("09:00");
          setShowEventModal(true);
        }}
      >
        {dayEvents.slice(0, index === 0 ? 3 : 4).map((event, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedEvent(event)}
            onContextMenu={(e) => handleContextMenu(e, event)}
            className={`${
              event.label === "blue"
                ? "blue-bg text-black"
                : event.label === "gray"
                ? "gray-bg text-black"
                : event.label === "green"
                ? "green-bg text-black"
                : event.label === "purple"
                ? "purple-bg text-black"
                : "yellow-bg text-black"
            } px-1 mr-3 text-sm rounded mb-1 truncate`}
          >
            {event.title}
          </div>
        ))}
        {dayEvents.length > 4 && index !== 0 ? (
          <p className="text-xs mt-1 ml-1">+{dayEvents.length - 4} more</p>
        ) : dayEvents.length > 3 && index === 0 ? (
          <p className="text-xs mt-1 ml-1">+{dayEvents.length - 3} more</p>
        ) : (
          ""
        )}
      </div>
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onLock={() => {
            console.log("Pin event:", contextMenu.eventId);
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

const ContextMenu = ({ x, y, onLock, onDelete }) => {
  return (
    <div
      className="fixed bg-white shadow-lg rounded-md py-2 z-50 min-w-32 border border-gray-200 context-menu"
      style={{ left: x, top: y }}
    >
      <button
        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
        onClick={onLock}
      >
        <img src={pinIcon} className="w-5" />
        Lock
      </button>
      <button
        className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center gap-2"
        onClick={onDelete}
      >
        <img src={deleteIcon} className="w-5" />
        Delete
      </button>
    </div>
  );
};

export default Day;

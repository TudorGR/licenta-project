import dayjs from "dayjs";
import React, { useContext, useEffect, useState } from "react";
import Context from "../context/Context";

const Day = ({ day, index }) => {
  const [dayEvents, setDayEvents] = useState([]);
  const { setSelectedDay, setShowEventModal, savedEvents, setSelectedEvent } =
    useContext(Context);

  function getCurrentDay() {
    return day.format("DD-MM-YY") === dayjs().format("DD-MM-YY");
  }
  useEffect(() => {
    const events = savedEvents.filter(
      (e) => dayjs(e.day).format("DD-MM-YY") === day.format("DD-MM-YY")
    );
    setDayEvents(events);
  }, [savedEvents, day]);

  return (
    <div className="calendar-day border border-r-0 border-b-0 border-l-gray-200 border-t-gray-200 flex flex-col">
      <header className="flex flex-col items-center">
        {index === 0 && (
          <p className=" text-sm mt-1">{day.format("ddd").toUpperCase()}</p>
        )}
        <p
          className={` calendar-day-number text-sm p-1 my-1 text-center ${
            getCurrentDay()
              ? "bg-blue-600 text-white rounded-full w-7"
              : "rounded-full w-7"
          }`}
        >
          {day.format("DD")}
        </p>
      </header>
      <div
        className="flex-1 cursor-pointer"
        onClick={() => {
          setSelectedDay(day);
          setShowEventModal(true);
        }}
      >
        {dayEvents.slice(0, index === 0 ? 3 : 4).map((e, index) => (
          <div
            key={index}
            onClick={() => {
              setSelectedEvent(e);
            }}
            className={`${
              e.label === "blue"
                ? " bg-sky-100 text-black"
                : e.label === "gray"
                ? "bg-gray-100 text-black"
                : e.label === "green"
                ? " bg-emerald-100 text-black"
                : e.label === "purple"
                ? " bg-violet-100 text-black"
                : " bg-amber-100 text-black"
            } px-1 mr-3 text-sm rounded mb-1 truncate`}
          >
            {e.title}
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
    </div>
  );
};

export default Day;

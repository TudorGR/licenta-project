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
    <div className="border border-gray-200 flex flex-col">
      <header className="flex flex-col items-center">
        {index === 0 && (
          <p className="text-sm mt-1">{day.format("ddd").toUpperCase()}</p>
        )}
        <p
          className={`text-sm p-1 my-1 text-center ${
            getCurrentDay() ? "bg-blue-600 text-white rounded-full w-7" : ""
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
        {dayEvents.map((e, index) => (
          <div
            key={index}
            onClick={() => {
              setSelectedEvent(e);
            }}
            className={`${
              e.label === "blue"
                ? "bg-blue-500"
                : e.label === "red"
                ? "bg-red-500"
                : e.label === "green"
                ? "bg-green-500"
                : e.label === "orange"
                ? "bg-orange-500"
                : "bg-yellow-500"
            } p-1 mr-3 text-sm rounded mb-1 truncate`}
          >
            {e.title}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Day;

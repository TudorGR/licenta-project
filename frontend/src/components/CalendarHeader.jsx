import React, { useContext } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";

const CalendarHeader = () => {
  const { monthIndex, setMonthIndex } = useContext(Context);

  const handlePrevMonth = () => {
    setMonthIndex(monthIndex - 1);
  };
  const handleNextMonth = () => {
    setMonthIndex(monthIndex + 1);
  };
  const handleToday = () => {
    setMonthIndex(
      monthIndex === dayjs().month()
        ? monthIndex + Math.random()
        : dayjs().month()
    );
  };
  return (
    <header className="px-4 py-2 flex items-center">
      <p className="italic mr-2">'Insert Logo Here'</p>
      <h1 className="mr-10 text-xl font-bold"> Calendar</h1>
      <button
        onClick={handleToday}
        className="cursor-pointer border rounded py-2 px-4 mr-5"
      >
        Today
      </button>
      <button className="cursor-pointer" onClick={handlePrevMonth}>
        {"<left<"}
      </button>
      <button className="cursor-pointer" onClick={handleNextMonth}>
        {">right>"}
      </button>
      <h2 className="ml-4 text-xl">
        {dayjs(new Date(dayjs().year(), monthIndex)).format("MMMM YYYY")}
      </h2>
    </header>
  );
};

export default CalendarHeader;

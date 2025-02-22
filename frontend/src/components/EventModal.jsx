import React, { useContext, useEffect, useRef, useState } from "react";
import Context from "../context/Context";
import closeIcon from "../assets/close_icon.svg";
import deleteIcon from "../assets/delete_icon.svg";
import calendar from "../assets/calendar.svg";
import SmallCalendar from "./SmallCalendar";

const colors = ["gray", "blue", "green", "purple", "yellow"];

export default function EventModal() {
  const {
    setShowEventModal,
    selectedDay,
    dispatchEvent,
    selectedEvent,
    setSelectedEvent,
    timeStart,
    timeEnd,
    setTimeStart,
    setTimeEnd,
  } = useContext(Context);
  const [title, setTitle] = useState(selectedEvent ? selectedEvent.title : "");
  const [description, setDescription] = useState(
    selectedEvent ? selectedEvent.description : ""
  );
  const [startTime, setStartTime] = useState(timeStart ? timeStart : "08:00");
  const [endTime, setEndTime] = useState(timeEnd ? timeEnd : "09:00");

  const [smallCalendar, setSmallCalendar] = useState(false);
  const [color, setColor] = useState(
    selectedEvent ? colors.find((col) => col === selectedEvent.label) : "gray"
  );
  const [error, setError] = useState(false);
  const inputRef = useRef(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(true);
      inputRef.current?.focus();
      return;
    }

    const event = {
      title,
      description,
      label: color,
      day: selectedDay.valueOf(),
      timeStart,
      timeEnd,
      id: selectedEvent ? selectedEvent.id : Date.now(),
    };
    if (selectedEvent) {
      dispatchEvent({ type: "update", payload: event });
    } else {
      dispatchEvent({ type: "push", payload: event });
    }
    setSelectedEvent(null);
    setShowEventModal(false);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSmallCalendar(false);
  }, [selectedDay]);

  useEffect(() => {
    setTimeStart(startTime);
  }, [startTime, setTimeStart]);

  useEffect(() => {
    setTimeEnd(endTime);
  }, [endTime, setTimeEnd]);

  return (
    <div className="z-20 h-screen w-full fixed left-0 top-0 flex justify-center items-center">
      {smallCalendar && <SmallCalendar />}
      <form className=" bg-white shadow-2xl w-[500px] rounded-md">
        <header className="border-b-1 border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="font-medium text-xl">Create Event</h1>
            <p>Fill in the data below to add an event</p>
          </div>
          <div>
            {selectedEvent ? (
              <button
                onClick={() => {
                  setShowEventModal(false);
                  dispatchEvent({ type: "delete", payload: selectedEvent });
                }}
                className="cursor-pointer"
                type="button"
              >
                <img src={deleteIcon} className="w-6" />
              </button>
            ) : (
              ""
            )}
            <button
              onClick={() => {
                setShowEventModal(false);
              }}
              className="cursor-pointer  ml-4 mr-2"
              type="button"
            >
              <img src={closeIcon} className="w-6" />
            </button>
          </div>
        </header>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1/5 items-end gap-y-2">
            <h1 className="text-lg font-medium">Title</h1>
            <input
              ref={inputRef}
              type="text"
              className={`${
                error
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-200"
              } border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md`}
              name="title"
              placeholder="Add title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
            />
            <h1 className="text-lg font-medium">Description</h1>
            <input
              type="text"
              className="border-gray-200 border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md"
              name="description"
              placeholder="Add description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoComplete="off"
            />
            <h1 className="text-lg font-medium">Date and Time</h1>
            <div
              onClick={() => {
                setSmallCalendar(true);
              }}
              className="cursor-pointer py-2 px-4 flex border-1 border-gray-200 rounded-md"
            >
              <img src={calendar} className="w-6 mr-4" />
              <p>{selectedDay.format("dddd, MMMM DD")}</p>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="time"
                className="border-gray-200 border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <p>{"-"}</p>
              <input
                type="time"
                className="border-gray-200 border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>
        <footer className="flex justify-between items-center border-t-1 border-gray-200 px-6 py-4">
          <div className="flex gap-x-2">
            {colors.map((col, index) => (
              <span
                key={index}
                onClick={() => setColor(col)}
                className={`${
                  col === "blue"
                    ? "bg-sky-200 border-2 border-sky-400"
                    : col === "gray"
                    ? "bg-gray-200 border-2 border-gray-400"
                    : col === "green"
                    ? "bg-emerald-200 border-2 border-emerald-400"
                    : col === "purple"
                    ? "bg-violet-200 border-2 border-violet-400"
                    : "bg-amber-200  border-2 border-amber-400"
                } w-5 h-5 rounded-full flex items-center justify-center cursor-pointer`}
              >
                {col === color && (
                  <span className="bg-white w-3 h-3 rounded-full flex items-center justify-center"></span>
                )}
              </span>
            ))}
          </div>
          <div>
            <button
              onClick={() => {
                setShowEventModal(false);
              }}
              className="hover:bg-gray-100 cursor-pointer border w-28 h-10 border-gray-200 rounded-md mr-4"
              type="button"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="hover:bg-gray-800 text-white bg-black cursor-pointer border w-28 h-10 border-gray-200 rounded-md"
            >
              Save
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

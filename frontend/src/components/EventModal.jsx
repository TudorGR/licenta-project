import React, { useContext, useEffect, useRef, useState } from "react";
import Context from "../context/Context";
import closeIcon from "../assets/close_icon.svg";
import deleteIcon from "../assets/delete_icon.svg";

const colors = ["blue", "green", "orange", "yellow", "red"];

export default function EventModal() {
  const { setShowEventModal, selectedDay, dispatchEvent, selectedEvent } =
    useContext(Context);
  const [title, setTitle] = useState(selectedEvent ? selectedEvent.title : "");
  const [description, setDescription] = useState(
    selectedEvent ? selectedEvent.description : ""
  );
  const [color, setColor] = useState(
    selectedEvent ? colors.find((col) => col === selectedEvent.label) : "blue"
  );
  const [error, setError] = useState(false);
  const inputRef = useRef(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!error) {
      const event = {
        title,
        description,
        label: color,
        day: selectedDay.valueOf(),
        id: selectedEvent ? selectedEvent.id : Date.now(),
      };
      if (selectedEvent) {
        dispatchEvent({ type: "update", payload: event });
      } else {
        dispatchEvent({ type: "push", payload: event });
      }
      setShowEventModal(false);
    } else {
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (title.length > 0) {
      setError(false);
    } else {
      setError(true);
    }
  }, [title]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="h-screen w-full fixed left-0 top-0 flex justify-center items-center">
      <form className=" bg-white shadow-2xl w-[500px]">
        <header className="border-b-1 border-gray-100 px-6 py-4 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="font-bold text-xl">Create Event</h1>
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
          <div className="grid grid-cols-1/5 items-end gap-y-7">
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold">Title</h1>
              <input
                ref={inputRef}
                type="text"
                className={`${
                  error ? "focus:border-red-500" : ""
                } pt-3 border-0 text-gray-600 text-xl pb-2 w-full border-b-2 focus:outline-none focus:border-blue-500 focus:ring-0 border-gray-200`}
                name="title"
                placeholder="Add title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <p>schedule icon</p>
            <p>{selectedDay.format("dddd, MMMM DD")}</p>
            <p>description icon</p>
            <input
              type="text"
              className="pt-3 border-0 text-gray-600 pb-2 w-full border-b-2 focus:outline-none focus:border-blue-500 focus:ring-0 border-gray-200"
              name="description"
              placeholder="Add description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p>label color</p>
            <div className="flex gap-x-2">
              {colors.map((col, index) => (
                <span
                  key={index}
                  onClick={() => setColor(col)}
                  className={`${
                    col === "blue"
                      ? "bg-blue-500"
                      : col === "red"
                      ? "bg-red-500"
                      : col === "green"
                      ? "bg-green-500"
                      : col === "orange"
                      ? "bg-orange-500"
                      : col === "yellow"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  } w-5 h-5 rounded-full flex items-center justify-center cursor-pointer`}
                >
                  {col === color && (
                    <span className="bg-white w-3 h-3 rounded-full flex items-center justify-center"></span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="flex justify-end  border-t-1 border-gray-100 px-6 py-4 mt-5">
          <button
            onClick={() => {
              setShowEventModal(false);
            }}
            className="mr-4 border-1 border-blue-500 px-6 py-2 text-blue-500"
            type="button"
          >
            close
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="bg-blue-500 px-6 py-2 text-white"
          >
            Save
          </button>
        </footer>
      </form>
    </div>
  );
}

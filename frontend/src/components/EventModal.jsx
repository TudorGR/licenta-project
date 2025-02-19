import React, { useContext, useState } from "react";
import Context from "../context/Context";

const colors = ["blue", "red", "green", "purple"];

export default function EventModal() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const { setShowEventModal, selectedDay, dispatchEvent } = useContext(Context);

  const handleSubmit = (e) => {
    e.preventDefault();
    const event = {
      title,
      description,
      label: color,
      day: selectedDay.valueOf(),
      id: Date.now(),
    };
    dispatchEvent({ type: "push", payload: event });
    setShowEventModal(false);
  };

  return (
    <div className="h-screen w-full fixed left-0 top-0 flex justify-center items-center">
      <form className="bg-white rounded-lg shadow-2xl w-1/4">
        <header className="bg-gray-100 px-4 py-2 flex justify-between items-center">
          <p>NEW</p>
          <button
            onClick={() => setShowEventModal(false)}
            className="cursor-pointer"
          >
            close
          </button>
        </header>
        <div className="p-3">
          <div className="grid grid-cols-1/5 items-end gap-y-7">
            <div></div>
            <input
              type="text"
              className="pt-3 border-0 text-gray-600 text-xl pb-2 w-full border-b-2 focus:outline-none focus:border-blue-500 focus:ring-0 border-gray-200"
              name="title"
              placeholder="Add title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
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
              required
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
                      : "bg-purple-500"
                  } w-6 h-6 rounded-full flex items-center justify-center cursor-pointer`}
                >
                  {col === color && <p>x</p>}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="flex justify-end  border-t p-3 mt-5">
          <button
            type="submit"
            onClick={handleSubmit}
            className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded text-white"
          >
            Save
          </button>
        </footer>
      </form>
    </div>
  );
}

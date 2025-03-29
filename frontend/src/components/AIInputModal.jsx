import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import Context from "../context/Context";
import dayjs from "dayjs";
import closeIcon from "../assets/close_icon.svg";

function AIInputModal({ isOpen, onClose }) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const { dispatchEvent } = useContext(Context);

  useEffect(() => {
    if (isOpen) {
      setInputText("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!inputText) return;
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/parse-event",
        { text: inputText }
      );

      const eventData = response.data;

      const event = {
        title: eventData.title,
        description: eventData.description || "",
        timeStart: dayjs(eventData.timeStart).format("HH:mm"),
        timeEnd: dayjs(eventData.timeEnd).format("HH:mm"),
        day: dayjs(eventData.day).valueOf(),
        label: "gray",
        category: eventData.category || "None",
        id: Date.now(),
      };

      dispatchEvent({ type: "push", payload: event });
      onClose();
    } catch (error) {
      console.error("Error parsing event:", error);
      alert(
        "Failed to parse event. Please try again with clearer instructions."
      );
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[450px] shadow-xl">
        <div className="flex justify-between items-center px-3 pb-0 pt-2">
          <h2 className="text-lg font-medium text-black">Quick Add Event</h2>
          <button className="cursor-pointer " onClick={onClose}>
            <img src={closeIcon} className="w-5" />
          </button>
        </div>
        <div className="p-2">
          <input
            name="AIInput"
            autoFocus
            type="text"
            autoComplete="off"
            className="w-full border border-gray-200 py-1 px-2 rounded-md outline-0"
            placeholder="Type your event (e.g. Meeting tomorrow at 3pm)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                handleSubmit();
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
          />
        </div>
        <div className="p-2 pt-0  flex justify-end gap-2">
          <button
            onClick={onClose}
            className="cursor-pointer transition-all w-28 px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`cursor-pointer  transition-all px-4 py-1 rounded-md ${
              loading ? "bg-gray-400" : "bg-black text-white hover:bg-gray-700"
            }`}
          >
            {loading ? "Processing..." : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIInputModal;

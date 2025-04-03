import React, { useState, useContext, useEffect, useRef } from "react";
import axios from "axios";
import Context from "../context/Context";
import dayjs from "dayjs";
import closeIcon from "../assets/close_icon.svg";

function AIInputModal({ isOpen, onClose }) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const { dispatchEvent } = useContext(Context);
  const modalContentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setInputText("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        modalContentRef.current &&
        !modalContentRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

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
    <div className="fixed inset-0 bg-black/10 bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalContentRef} className="bg-white rounded-3xl w-[400px]">
        <div className="flex h-14 justify-between items-center px-4 pb-0">
          <h2 className="text-lg  text-black">Quick Add Event</h2>
          <button className="cursor-pointer " onClick={onClose}>
            <img src={closeIcon} className="w-5" />
          </button>
        </div>
        <div className="h-12">
          <input
            name="AIInput"
            autoFocus
            type="text"
            autoComplete="off"
            className="w-full h-full border-y-1 border-gray-100 py-1 px-4 outline-0"
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
        <div className=" pt-0 h-14 flex justify-end items-center gap-2">
          <button
            onClick={onClose}
            className="shadow-custom active:bg-gray-50 cursor-pointer transition-all h-10 px-2 border border-gray-200 rounded-full "
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`shadow-custom active:bg-gray-700 cursor-pointer  transition-all h-10 px-4 rounded-full mr-4 ${
              loading ? "bg-gray-400" : "bg-black text-white "
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

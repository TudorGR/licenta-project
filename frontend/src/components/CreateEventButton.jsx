import React, { useContext } from "react";
import Context from "../context/Context";
import plus from "../assets/plus.svg";

export default function CreateEventButton() {
  const { setShowEventModal } = useContext(Context);

  return (
    <button
      onClick={() => setShowEventModal(true)}
      className="transition-all shadow-custom active:bg-gray-700 cursor-pointer px-4 h-10 text-white bg-black rounded-full ml-2"
    >
      <div className="flex items-center justify-center">
        <img src={plus} className="w-5 h-5" />
        <p>New</p>
      </div>
    </button>
  );
}

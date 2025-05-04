import React, { useContext } from "react";
import Context from "../context/Context";
import plus from "../assets/plus.svg";

export default function CreateEventButton() {
  const { setShowEventModal } = useContext(Context);

  return (
    <button
      onClick={() => setShowEventModal(true)}
      className="shrink-0 transition-all shadow-custom active:bg-gray-700 cursor-pointer px-4 h-10 text-white bg-black rounded-full"
    >
      <div className="flex items-center gap-1 justify-center">
        <img src={plus} className="w-4 h-4 " />
        <p>New</p>
      </div>
    </button>
  );
}

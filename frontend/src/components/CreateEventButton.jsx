import React, { useContext } from "react";
import Context from "../context/Context";

export default function CreateEventButton() {
  const { setShowEventModal } = useContext(Context);

  return (
    <button
      onClick={() => setShowEventModal(true)}
      className="cursor-pointer border p-2 rounded-full flex items-center shadow-md hover:shadow-xl"
    >
      NEW
    </button>
  );
}

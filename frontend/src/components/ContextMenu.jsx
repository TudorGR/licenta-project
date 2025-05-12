import React, { useState, useEffect } from "react";
import editIcon from "../assets/edit.svg";
import deleteIcon from "../assets/delete_icon.svg";

const ContextMenu = ({ x, y, onEdit, onDelete, isClosing }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade in after component mounts
    setIsVisible(true);

    // Handle closing state change
    if (isClosing) {
      setIsVisible(false);
    }
  }, [isClosing]);

  return (
    <div
      className="fixed bg-white shadow-lg rounded-xl z-50 min-w-24 border border-gray-200 context-menu"
      style={{
        left: x,
        top: y,
        opacity: isVisible ? 1 : 0,
        transition: "opacity 150ms ease-out",
      }}
    >
      <button
        className="text-sm w-full px-2 py-2 text-left hover:opacity-50 transition-all flex items-center gap-2"
        onClick={onEdit}
      >
        <img src={editIcon} className="w-4" />
        Edit
      </button>

      <button
        className="text-sm w-full px-2 py-2 text-left hover:opacity-50 transition-all text-red-600 flex items-center gap-2 border-t border-gray-200"
        onClick={onDelete}
      >
        <img src={deleteIcon} className="w-4" />
        Delete
      </button>
    </div>
  );
};

export default ContextMenu;

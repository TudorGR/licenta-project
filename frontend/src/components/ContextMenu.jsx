import React from "react";
import pinIcon from "../assets/lock.svg";
import deleteIcon from "../assets/delete_icon.svg";

const ContextMenu = ({ x, y, onLock, onDelete, isLocked }) => {
  return (
    <div
      className="fixed bg-white shadow-lg rounded-sm py-1 z-50 min-w-24 border border-gray-200 context-menu"
      style={{ left: x, top: y }}
    >
      <button
        className="text-sm w-full px-2 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
        onClick={onLock}
      >
        <img src={pinIcon} className="w-4" />
        {isLocked ? "Unlock" : "Lock"}
      </button>

      <button
        className="text-sm w-full px-2 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center gap-2 border-t border-gray-200"
        onClick={onDelete}
      >
        <img src={deleteIcon} className="w-4" />
        Delete
      </button>
    </div>
  );
};

export default ContextMenu;

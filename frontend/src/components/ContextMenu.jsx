import React from "react";
import pinIcon from "../assets/lock.svg";
import deleteIcon from "../assets/delete_icon.svg";

const colors = ["gray", "blue", "green", "purple", "yellow"];

const ContextMenu = ({
  x,
  y,
  onLock,
  onDelete,
  onColorChange,
  isLocked,
  currentColor,
}) => {
  return (
    <div
      className="fixed bg-white shadow-lg rounded-md py-2 z-50 min-w-32 border border-gray-200 context-menu"
      style={{ left: x, top: y }}
    >
      <button
        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
        onClick={onLock}
      >
        <img src={pinIcon} className="w-5" />
        {isLocked ? "Unlock" : "Lock"}
      </button>
      <div className="w-full px-4 py-2 border-t border-gray-200">
        <div className="flex gap-1">
          {colors.map((col) => (
            <span
              key={col}
              onClick={() => onColorChange(col)}
              className={`${
                col === "blue"
                  ? "blue-bg border-2 border-blue-500"
                  : col === "gray"
                  ? "gray-bg border-2 border-gray-500"
                  : col === "green"
                  ? "green-bg border-2 border-green-500"
                  : col === "purple"
                  ? "purple-bg border-2 border-purple-500"
                  : "yellow-bg border-2 border-yellow-500"
              } w-4 h-4 rounded-full flex items-center justify-center cursor-pointer`}
            >
              {col === currentColor && (
                <span className=" bg-white w-3 h-3 rounded-full"></span>
              )}
            </span>
          ))}
        </div>
      </div>
      <button
        className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center gap-2 border-t border-gray-200"
        onClick={onDelete}
      >
        <img src={deleteIcon} className="w-5" />
        Delete
      </button>
    </div>
  );
};

export default ContextMenu;

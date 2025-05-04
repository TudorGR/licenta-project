import React, { useEffect } from "react";
import Sidebar from "./Sidebar";

const SidebarWrapper = ({ showSidebar, onClose }) => {
  // Prevent scrolling when sidebar is open on mobile
  useEffect(() => {
    if (showSidebar) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showSidebar]);

  if (!showSidebar) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Overlay with animation */}
      <div
        className="absolute inset-0 bg-black/10 bg-opacity-40 animate-fade-in transition-opacity duration-300 ease-in-out"
        onClick={onClose}
      />

      {/* Sidebar with slide-in animation */}
      <div className="absolute inset-y-0 left-0 w-70 transform transition-transform duration-300 ease-in-out translate-x-0 animate-slide-in">
        <Sidebar onClose={onClose} />
      </div>
    </div>
  );
};

export default SidebarWrapper;

import React, { useEffect, useState } from "react";
import AIChatBox from "./AIChatBox";

const AIChatBoxWrapper = ({ showAIChatBox, onClose }) => {
  // Add state to detect if we're on mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Update mobile state when window resizes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent scrolling when AIchatBox is open on mobile
  useEffect(() => {
    if (showAIChatBox) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAIChatBox]);

  if (!showAIChatBox) return null;

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto">
      {/* Overlay with animation - only visible on mobile */}
      <div
        className="absolute inset-0 bg-black/10 bg-opacity-40 animate-fade-in transition-opacity duration-300 ease-in-out md:hidden"
        onClick={onClose}
      />

      {/* Chat - conditionally add animation classes only for mobile */}
      <div
        className={`absolute h-full inset-y-0 right-0 w-80 
        ${
          isMobile
            ? "transform transition-transform duration-300 ease-in-out translate-x-0 animate-slide-in-right"
            : ""
        }
        md:relative md:inset-auto`}
      >
        <AIChatBox onClose={onClose} />
      </div>
    </div>
  );
};

export default AIChatBoxWrapper;

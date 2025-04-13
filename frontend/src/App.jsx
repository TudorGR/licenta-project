import React, { useState, useEffect, useContext } from "react";
import { getCalendarMonth } from "./util";
import Context from "./context/Context";
import Sidebar from "./components/Sidebar";
import Month from "./components/Month";
import CalendarHeader from "./components/CalendarHeader";
import CalendarMainHeader from "./components/CalendarMainHeader";
import EventModal from "./components/EventModal";
import Week from "./components/Week";
import DayView from "./components/DayView";
import AIChatBox from "./components/AIChatBox"; // Import the new component
import { Toaster } from "react-hot-toast";
import "./App.css";

function App() {
  const [calendarMonth, setCalendarMonth] = useState(getCalendarMonth());
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const {
    monthIndex,
    showEventModal,
    isMonthView,
    isWeekView,
    selectedWeek,
    isDayView,
  } = useContext(Context);

  useEffect(() => {
    setCalendarMonth(getCalendarMonth(monthIndex));
  }, [monthIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // You can keep or remove this shortcut based on your preference
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        // Do nothing now or toggle the right sidebar visibility
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Toaster position="top-right" />
      <div className="p-2 h-screen bg-gray-100 flex flex-col">
        <CalendarMainHeader />
        <div className="h-[calc(100vh-65px)] overflow-clip flex bg-white rounded-xl">
          <Sidebar />
          <div className="flex flex-col flex-1 h-full">
            <CalendarHeader />
            <div className="flex flex-1 h-full">
              {isMonthView && <Month month={calendarMonth} />}
              {isWeekView && (
                <Week month={calendarMonth} weekIndex={selectedWeek} />
              )}
              {isDayView && <DayView />}
            </div>
          </div>
          <AIChatBox /> {/* Add the AI Chatbox here */}
        </div>
      </div>
      {showEventModal && <EventModal />}
    </>
  );
}

export default App;

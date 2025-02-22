import "./App.css";
import React, { useState, useContext, useEffect } from "react";
import { getCalendarMonth } from "./util";
import CalendarHeader from "./components/CalendarHeader";
import Sidebar from "./components/Sidebar";
import Month from "./components/Month";
import Context from "./context/Context";
import EventModal from "./components/EventModal";
import Week from "./components/Week";
import DayView from "./components/DayView";
import AIInputModal from "./components/AIInputModal";

function App() {
  const [calendarMonth, setCalendarMonth] = useState(getCalendarMonth());
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
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
      // Check for Alt + Space shortcut
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        setIsAIModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {showEventModal && <EventModal />}
      {isAIModalOpen && (
        <AIInputModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
        />
      )}
      <div className="h-screen flex">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <CalendarHeader onOpenAIModal={() => setIsAIModalOpen(true)} />
          <div className="flex flex-1">
            {isMonthView && <Month month={calendarMonth} />}
            {isWeekView && (
              <Week month={calendarMonth} weekIndex={selectedWeek} />
            )}
            {isDayView && <DayView />}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;

import React, { useState, useEffect, useContext } from "react";
import { getCalendarMonth } from "./util";
import Context from "./context/Context";
import Sidebar from "./components/Sidebar";
import Month from "./components/Month";
import CalendarHeader from "./components/CalendarHeader";
import CalendarMainHeader from "./components/CalendarMainHeader";
import EventModal from "./components/EventModal";
import AIInputModal from "./components/AIInputModal";
import Week from "./components/Week";
import DayView from "./components/DayView";
import AISuggestionsPanel from "./components/AISuggestionsPanel";
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
      <div className="pb-8 px-8 pt-8 h-screen bg-gray-100 flex flex-col">
        <CalendarMainHeader
          onOpenAIModal={() => setIsAIModalOpen(true)}
          onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
          showSuggestions={showSuggestions}
        />
        <div className="h-[90%] overflow-clip flex bg-white rounded-xl">
          <Sidebar />
          <div className="flex flex-col flex-1 h-full ">
            <CalendarHeader
              onOpenAIModal={() => setIsAIModalOpen(true)}
              onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
              showSuggestions={showSuggestions}
            />
            <div className="flex flex-1 h-full">
              {isMonthView && <Month month={calendarMonth} />}
              {isWeekView && (
                <Week month={calendarMonth} weekIndex={selectedWeek} />
              )}
              {isDayView && <DayView />}
            </div>
          </div>
          {/* <AISuggestionsPanel /> */}
        </div>
      </div>
    </>
  );
}

export default App;

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

function App() {
  const [calendarMonth, setCalendarMonth] = useState(getCalendarMonth());
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

  return (
    <>
      {showEventModal && <EventModal />}
      <div className="h-screen flex">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <CalendarHeader />
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

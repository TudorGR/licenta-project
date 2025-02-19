import "./App.css";
import React, { useState, useContext, useEffect } from "react";
import { getCalendarMonth } from "./util";
import CalendarHeader from "./components/CalendarHeader";
import Sidebar from "./components/Sidebar";
import Month from "./components/Month";
import Context from "./context/Context";
import EventModal from "./components/EventModal";

function App() {
  const [calendarMonth, setCalendarMonth] = useState(getCalendarMonth());
  const { monthIndex, showEventModal } = useContext(Context);

  useEffect(() => {
    setCalendarMonth(getCalendarMonth(monthIndex));
  }, [monthIndex]);

  return (
    <>
      {showEventModal && <EventModal />}
      <div className="h-screen flex flex-col">
        <CalendarHeader />
        <div className="flex flex-1">
          <Sidebar />
          <Month month={calendarMonth} />
        </div>
      </div>
    </>
  );
}

export default App;

import "./App.css";
import React, { useState } from "react";
import { getCalendarMonth } from "./util";
import CalendarHeader from "./components/CalendarHeader";
import Sidebar from "./components/Sidebar";
import Month from "./components/Month";

function App() {
  const [calendarMonth, setCalendarMonth] = useState(getCalendarMonth());

  return (
    <>
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

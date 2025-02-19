import React from "react";

const Context = React.createContext({
  monthIndex: 0,
  setMonthIndex: (index) => {},
  smallCalendarMonth: 0,
  setSmallCalendarMonth: (index) => {},
  selectedDay: null,
  setSelectedDay: (day) => {},
  showEventModal: false,
  setShowEventModal: () => {},
});

export default Context;

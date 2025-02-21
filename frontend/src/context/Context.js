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
  dispatchEvent: ({ type, payload }) => {},
  savedEvents: [],
  selectedEvent: null,
  setSelectedEvent: () => {},
  isMonthView: false,
  setIsMonthView: () => {},
  isWeekView: false,
  setIsMonthView: () => {},
  selectedWeek: 0,
  setSelectedWeek: (index) => {},
  timeStart: "08:00",
  setTimeStart: (time) => {},
  timeEnd: "09:00",
  setTimeEnd: (time) => {},
});

export default Context;

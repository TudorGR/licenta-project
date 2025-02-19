import React, { useEffect, useState } from "react";
import Context from "./Context";
import dayjs from "dayjs";

export default function ContextWrapper(props) {
  const [monthIndex, setMonthIndex] = useState(dayjs().month());
  const [smallCalendarMonth, setSmallCalendarMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(dayjs());
  const [showEventModal, setShowEventModal] = useState(false);

  useEffect(() => {
    if (smallCalendarMonth !== null) {
      setMonthIndex(smallCalendarMonth);
    }
  }, [smallCalendarMonth]);

  return (
    <Context.Provider
      value={{
        monthIndex,
        setMonthIndex,
        smallCalendarMonth,
        setSmallCalendarMonth,
        selectedDay,
        setSelectedDay,
        showEventModal,
        setShowEventModal,
      }}
    >
      {props.children}
    </Context.Provider>
  );
}

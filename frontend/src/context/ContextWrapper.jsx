import React, { useEffect, useReducer, useState, useMemo } from "react";
import Context from "./Context";
import dayjs from "dayjs";
import { api } from "../services/api.js";

const asyncDispatchEvent = (dispatch, getState) => async (action) => {
  try {
    switch (action.type) {
      case "push":
        const createdEvent = await api.createEvent(action.payload);
        const currentState = getState();
        dispatch({ type: "set", payload: [...currentState, createdEvent] });
        break;

      case "update":
        // Get current state before update
        const currentStateBeforeUpdate = getState();
        // Remove the event being updated
        const stateWithoutUpdated = currentStateBeforeUpdate.filter(
          (evt) => evt.id !== action.payload.id
        );
        // Update the event in the API
        const updatedEvent = await api.updateEvent(
          action.payload.id,
          action.payload
        );
        // Add the updated event back to state
        dispatch({
          type: "set",
          payload: [...stateWithoutUpdated, updatedEvent],
        });
        break;

      case "delete":
        await api.deleteEvent(action.payload.id);
        const stateAfterDelete = getState();
        dispatch({
          type: "set",
          payload: stateAfterDelete.filter(
            (evt) => evt.id !== action.payload.id
          ),
        });
        break;

      case "set":
        dispatch(action);
        break;

      default:
        dispatch(action);
    }
  } catch (error) {
    console.error("Error in dispatch:", error);
    throw error;
  }
};

// Update the reducer function
const savedEventsReducer = (state, { type, payload }) => {
  switch (type) {
    case "set":
      return payload || []; // Ensure we always return an array
    default:
      return state;
  }
};

export default function ContextWrapper(props) {
  const [monthIndex, setMonthIndex] = useState(dayjs().month());
  const [smallCalendarMonth, setSmallCalendarMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(dayjs());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isMonthView, setIsMonthView] = useState(false);
  const [isWeekView, setIsWeekView] = useState(true);
  const [isDayView, setIsDayView] = useState(false);
  const [timeStart, setTimeStart] = useState("08:00");
  const [timeEnd, setTimeEnd] = useState("09:00");
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = dayjs();
    const firstDayOfMonth = today.startOf("month");
    const firstDayOfWeek = firstDayOfMonth.startOf("week").add(1, "day");
    const weekIndex = Math.floor(today.diff(firstDayOfWeek, "day") / 7);
    return Math.max(0, weekIndex);
  });

  const [savedEvents, dispatch] = useReducer(savedEventsReducer, []);
  const getState = useMemo(() => () => savedEvents, [savedEvents]); // Memoize getState

  const dispatchEvent = useMemo(
    () => asyncDispatchEvent(dispatch, getState),
    [dispatch, getState] // Add getState to dependencies
  );

  const [loading, setLoading] = useState(true);
  const [categories] = useState([
    "None",
    "Meeting",
    "Workout",
    "Study",
    "Personal",
    "Work",
    "Social",
    "Family",
    "Health",
    "Hobby",
    "Chores",
    "Travel",
    "Finance",
    "Learning",
    "Self-care",
    "Events",
  ]);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const events = await api.getEvents();
        dispatch({ type: "set", payload: events });
      } catch (error) {
        console.error("Failed to fetch events:", error);
        dispatch({ type: "set", payload: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [dispatchEvent]);

  useEffect(() => {
    if (smallCalendarMonth !== null) {
      setMonthIndex(smallCalendarMonth);
    }
  }, [smallCalendarMonth]);

  useEffect(() => {
    if (!showEventModal) {
      setSelectedEvent(null);
    }
  }, [showEventModal]);

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
        dispatchEvent,
        savedEvents: savedEvents || [], // Ensure we always have an array
        selectedEvent,
        setSelectedEvent,
        isMonthView,
        setIsMonthView,
        isWeekView,
        setIsWeekView,
        selectedWeek,
        setSelectedWeek,
        timeStart,
        timeEnd,
        setTimeStart,
        setTimeEnd,
        isDayView,
        setIsDayView,
        categories,
        selectedCategory,
        setSelectedCategory,
        isLoading: loading,
      }}
    >
      {props.children}
    </Context.Provider>
  );
}

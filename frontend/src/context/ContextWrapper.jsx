import React, {
  useEffect,
  useReducer,
  useState,
  useMemo,
  useCallback,
} from "react";
import Context from "./Context";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { api } from "../services/api.js";
import axios from "axios";
import weekday from "dayjs/plugin/weekday.js";
import isoWeek from "dayjs/plugin/isoWeek";
import { reminderService } from "../services/reminderService.js";

dayjs.extend(weekday);
dayjs.extend(isoWeek);

// Extend dayjs with the isBetween plugin
dayjs.extend(isBetween);

// Modify the asyncDispatchEvent function to accept savedEvents as a parameter
const asyncDispatchEvent = (dispatch) => async (action, getState) => {
  try {
    switch (action.type) {
      case "push":
        const createdEvent = await api.createEvent(action.payload);
        const eventsAfterCreate = await api.getEvents();
        dispatch({ type: "set", payload: eventsAfterCreate });

        // Return the created event information for potential undo functionality
        return { eventData: createdEvent };

      case "update":
        try {
          // Update event in database
          await api.updateEvent(action.payload.id, action.payload);
          const eventsAfterUpdate = await api.getEvents();
          dispatch({ type: "set", payload: eventsAfterUpdate });

          // Make sure we're updating the reminder with the updated event
          reminderService.updateReminder(action.payload);
        } catch (error) {
          console.error("Error updating event:", error);
          throw error;
        }
        break;

      case "delete":
        // Store the event ID before deletion
        const deletedEventId = action.payload.id;
        const deletedEvent = { ...action.payload };

        await api.deleteEvent(deletedEventId);
        const eventsAfterDelete = await api.getEvents();
        dispatch({ type: "set", payload: eventsAfterDelete });

        // Return the deleted event information for potential undo functionality
        return { id: deletedEventId, eventData: deletedEvent };

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

const savedEventsReducer = (state, { type, payload }) => {
  switch (type) {
    case "set":
      return payload || [];
    default:
      return state;
  }
};

export default function ContextWrapper({ children }) {
  const [monthIndex, setMonthIndex] = useState(dayjs().month());
  const [smallCalendarMonth, setSmallCalendarMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(dayjs());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Initialize view states from localStorage or use defaults
  const savedView = localStorage.getItem("calendarView") || "week";
  const [isMonthView, setIsMonthView] = useState(savedView === "month");
  const [isWeekView, setIsWeekView] = useState(savedView === "week");
  const [isDayView, setIsDayView] = useState(savedView === "day");

  const [timeStart, setTimeStart] = useState("08:00");
  const [timeEnd, setTimeEnd] = useState("09:00");
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = dayjs();
    const firstDayOfMonth = today.startOf("month");
    const firstDayOfWeek = firstDayOfMonth.startOf("week").add(1, "day");
    const weekIndex = Math.floor(today.diff(firstDayOfWeek, "day") / 7);

    // Clamp the weekIndex to the valid range for the current month
    const lastDayOfMonth = firstDayOfMonth.endOf("month");
    const totalWeeksInMonth = Math.ceil(lastDayOfMonth.date() / 7);
    return Math.min(Math.max(0, weekIndex), totalWeeksInMonth - 1);
  });
  const [workingHoursStart, setWorkingHoursStart] = useState(
    localStorage.getItem("workingHoursStart") || "07:00"
  );
  const [workingHoursEnd, setWorkingHoursEnd] = useState(
    localStorage.getItem("workingHoursEnd") || "19:00"
  );
  const [showLocalEvents, setShowLocalEvents] = useState(false);
  const [userCity, setUserCity] = useState(
    localStorage.getItem("userCity") || "Iasi Romania"
  );

  // Save city to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("userCity", userCity);
  }, [userCity]);

  useEffect(() => {
    localStorage.setItem("workingHoursStart", workingHoursStart);
  }, [workingHoursStart]);

  useEffect(() => {
    localStorage.setItem("workingHoursEnd", workingHoursEnd);
  }, [workingHoursEnd]);

  const [savedEvents, dispatch] = useReducer(savedEventsReducer, []);

  const dispatchEvent = useMemo(() => {
    const dispatcher = asyncDispatchEvent(dispatch);
    return (action) =>
      dispatcher(action, () => ({
        savedEvents,
        workingHoursStart,
        workingHoursEnd,
      }));
  }, [dispatch, savedEvents, workingHoursStart, workingHoursEnd]);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([
    "Other",
    "Work",
    "Education",
    "Health & Wellness",
    "Finance & Bills",
    "Social & Family",
    "Travel & Commute",
    "Personal Tasks",
    "Leisure & Hobbies",
  ]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [user, setUser] = useState(null);

  // Add analytics-related state
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState("month");

  // Create wrapped setter functions to persist the view mode
  const setIsMonthViewWithStorage = (value) => {
    setIsMonthView(value);
    if (value) {
      localStorage.setItem("calendarView", "month");
      setIsWeekView(false);
      setIsDayView(false);
    }
  };

  const setIsWeekViewWithStorage = (value) => {
    setIsWeekView(value);
    if (value) {
      localStorage.setItem("calendarView", "week");
      setIsMonthView(false);
      setIsDayView(false);
    }
  };

  const setIsDayViewWithStorage = (value) => {
    setIsDayView(value);
    if (value) {
      localStorage.setItem("calendarView", "day");
      setIsMonthView(false);
      setIsWeekView(false);
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const events = await api.getEvents();

        // Ensure day is properly parsed as integer for dayjs
        const formattedEvents = events.map((event) => ({
          ...event,
          day: event.day, // Keep as string, components will parse as needed
        }));

        dispatch({ type: "set", payload: formattedEvents });

        // Initialize reminder service with events
        reminderService.initialize(formattedEvents);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        dispatch({ type: "set", payload: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

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
        savedEvents: savedEvents || [],
        selectedEvent,
        setSelectedEvent,
        isMonthView,
        setIsMonthView: setIsMonthViewWithStorage,
        isWeekView,
        setIsWeekView: setIsWeekViewWithStorage,
        selectedWeek,
        setSelectedWeek,
        timeStart,
        timeEnd,
        setTimeStart,
        setTimeEnd,
        isDayView,
        setIsDayView: setIsDayViewWithStorage,
        categories,
        selectedCategory,
        setSelectedCategory,
        isLoading: loading,
        workingHoursStart,
        workingHoursEnd,
        setWorkingHoursStart,
        setWorkingHoursEnd,
        showLocalEvents,
        setShowLocalEvents,
        userCity,
        setUserCity,
        user,
        // Add analytics-related values
        showAnalyticsDashboard,
        setShowAnalyticsDashboard,
        analyticsTimeframe,
        setAnalyticsTimeframe,
      }}
    >
      {children}
    </Context.Provider>
  );
}

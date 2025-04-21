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
        await api.createEvent(action.payload);
        const eventsAfterCreate = await api.getEvents();
        dispatch({ type: "set", payload: eventsAfterCreate });
        break;

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
        await api.deleteEvent(action.payload.id);
        const eventsAfterDelete = await api.getEvents();
        dispatch({ type: "set", payload: eventsAfterDelete });
        break;

      case "set":
        dispatch(action);
        break;

      case "increase":
        try {
          const { category, timeChange } = action.payload;
          const { savedEvents, workingHoursStart, workingHoursEnd } =
            getState();

          // Get all events for the current week
          const startOfWeek = dayjs().isoWeekday(1);
          const endOfWeek = dayjs().isoWeekday(7);

          const eventsToSend = savedEvents.filter((event) => {
            const eventDay = dayjs(parseInt(event.day));
            return eventDay.isBetween(startOfWeek, endOfWeek, "day", "[]");
          });

          const response = await axios.post("http://localhost:5000/api/algo", {
            events: eventsToSend,
            timeChange,
            category,
            workingHoursStart,
            workingHoursEnd,
          });

          const result = response.data;
          const modifiedEvents = result.events;

          // Update events in the database
          for (const event of modifiedEvents) {
            await api.updateEvent(event.id, event);
          }

          // Refresh events from the database
          const eventsAfterIncrease = await api.getEvents();
          dispatch({ type: "set", payload: eventsAfterIncrease });
        } catch (error) {
          console.error("Error increasing event durations:", error);
          throw error;
        }
        break;

      case "lock":
        try {
          const updatedEvent = await api.toggleEventLock(action.payload.id);
          const eventsAfterLock = await api.getEvents();
          dispatch({ type: "set", payload: eventsAfterLock });
        } catch (error) {
          console.error("Error toggling event lock:", error);
          throw error;
        }
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

    // Clamp the weekIndex to the valid range for the current month
    const lastDayOfMonth = firstDayOfMonth.endOf("month");
    const totalWeeksInMonth = Math.ceil(lastDayOfMonth.date() / 7);
    return Math.min(Math.max(0, weekIndex), totalWeeksInMonth - 1);
  });
  const [workingHoursStart, setWorkingHoursStart] = useState("07:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("19:00");
  const [showWeather, setShowWeather] = useState(false);
  const [showLocalEvents, setShowLocalEvents] = useState(false);
  const [userCity, setUserCity] = useState(
    localStorage.getItem("userCity") || "Iasi Romania"
  );

  // Save city to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("userCity", userCity);
  }, [userCity]);

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
  const [categories] = useState([
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
  const [selectedHeatmapCategories, setSelectedHeatmapCategories] = useState(
    () => new Set(categories)
  );
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const events = await api.getEvents();
        dispatch({ type: "set", payload: events });

        // Initialize reminder service with events
        reminderService.initialize(events);
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

  const dispatchCalEvent = useCallback(
    async (action) => {
      try {
        switch (action.type) {
          case "push":
            // Create event code...
            const createdEvent = await api.createEvent(action.payload);
            const eventsAfterPush = await api.getEvents();
            dispatch({ type: "set", payload: eventsAfterPush });

            // Schedule reminder for new event
            if (createdEvent.reminderEnabled) {
              reminderService.scheduleReminder(createdEvent);
            }
            break;

          case "update":
            // Update event code...
            await api.updateEvent(action.payload.id, action.payload);
            const eventsAfterUpdate = await api.getEvents();
            dispatch({ type: "set", payload: eventsAfterUpdate });

            // Update reminder
            reminderService.updateReminder(action.payload);
            break;

          case "delete":
            await api.deleteEvent(action.payload.id);
            const eventsAfterDelete = await api.getEvents();
            dispatch({ type: "set", payload: eventsAfterDelete });

            // Remove reminder
            reminderService.removeReminder(action.payload.id);
            break;

          // Other cases...
        }
      } catch (error) {
        console.error("Error in dispatch:", error);
        throw error;
      }
    },
    [dispatch]
  );

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
        selectedHeatmapCategories,
        setSelectedHeatmapCategories,
        selectedCategory,
        setSelectedCategory,
        isLoading: loading,
        showHeatmap,
        setShowHeatmap,
        workingHoursStart,
        workingHoursEnd,
        setWorkingHoursStart,
        setWorkingHoursEnd,
        showWeather,
        setShowWeather,
        showLocalEvents,
        setShowLocalEvents,
        userCity,
        setUserCity,
      }}
    >
      {props.children}
    </Context.Provider>
  );
}

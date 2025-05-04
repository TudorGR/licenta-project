import React, { useState, useRef, useEffect, useContext } from "react";
import axios from "axios";
import Context from "../context/Context";
import dayjs from "dayjs";
import sendIcon from "../assets/send-icon.svg";
import searchIcon from "../assets/search.svg";
import micIcon from "../assets/mic.svg";
import arrowRightIcon from "../assets/arrow-right.svg";
import editIcon from "../assets/edit.svg";
import { api } from "../services/api.js";
import zapIcon from "../assets/zap.svg";
import mapPinIcon from "../assets/map-pin.svg";
import clockIcon from "../assets/clock.svg";
import xIcon from "../assets/x.svg";
// Import the speech recognition library
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import AudioWaveform from "./AudioWaveform";
import { categoryColors, darkCategoryColors } from "../utils/categoryColors";
import { AuthContext } from "../context/AuthContext";

const AIChatBox = ({ onClose }) => {
  const {
    dispatchEvent,
    setSelectedEvent,
    setShowEventModal,
    savedEvents,
    setSelectedDay,
    setMonthIndex,
    setSelectedWeek,
    setIsMonthView,
    setIsWeekView,
    setIsDayView,
  } = useContext(Context);

  // Get currentUser from AuthContext instead
  const { currentUser } = useContext(AuthContext);

  // Update the initial message using currentUser instead of user
  const [messages, setMessages] = useState([
    {
      type: "system",
      text: currentUser?.name
        ? `Hi ${currentUser.name}! How can I help you with your calendar?`
        : "Hi! How can I help you with your calendar?",
    },
  ]);

  const [input, setInput] = useState("");
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);

  const initialLoadDone = useRef(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionTimer = useRef(null);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  // Add a flag to track initial render
  const initialRenderRef = useRef(true);
  // Add a function to detect mobile devices
  const isMobileDevice = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768
    );
  };

  // Replace the speech recognition implementation with react-speech-recognition
  const {
    transcript,
    listening: isListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showSuggestions]);

  // Modified useEffect for input focus - don't focus on initial render for mobile
  useEffect(() => {
    if (!loading) {
      // Only focus if this is not the initial render or if it's not a mobile device
      if (!initialRenderRef.current || !isMobileDevice()) {
        inputRef.current?.focus();
      }
      // Mark initial render as complete
      initialRenderRef.current = false;
    }
  }, [loading]);

  // Effect to handle the delayed showing of suggestions
  useEffect(() => {
    if (suggestions.length > 0 && !loading) {
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
      }
      suggestionTimer.current = setTimeout(() => {
        setShowSuggestions(true);
      }, 1000);
    } else {
      setShowSuggestions(false);
    }
    return () => {
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
      }
    };
  }, [suggestions, loading]);

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-send message when speech recognition stops
  useEffect(() => {
    if (!isListening && transcript) {
      // Wait a bit to ensure state is updated
      handleSendMessage();
      resetTranscript();
    }
  }, [isListening, transcript]);

  // Check for browser support
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser");
    }
  }, [browserSupportsSpeechRecognition]);

  // Generate suggestions based on past events
  useEffect(() => {
    if (savedEvents && savedEvents.length > 0 && !initialLoadDone.current) {
      fetchEventSuggestions();
      initialLoadDone.current = true;
    }
  }, [savedEvents]);

  // Function to toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      SpeechRecognition.stopListening();
      setShowVoiceInput(false);
    } else {
      resetTranscript();
      setShowVoiceInput(true);
      SpeechRecognition.startListening({
        continuous: false,
        language: "en-US",
      });
    }
  };

  // Add a function to handle closing the voice input modal
  const handleCloseVoiceInput = () => {
    SpeechRecognition.stopListening();
    setShowVoiceInput(false);
  };

  // Add a new function to handle resetting the chat
  const handleStartOver = () => {
    setMessages([
      {
        type: "system",
        text: currentUser?.name
          ? `Hi ${currentUser.name}! How can I help you with your calendar?`
          : "Hi! How can I help you with your calendar?",
      },
    ]);
    setInput("");
    setSuggestions([]);
    fetchEventSuggestions(); // Fetch fresh suggestions
  };

  // Update the fetchEventSuggestions function
  const fetchEventSuggestions = async () => {
    if (!savedEvents || savedEvents.length === 0) return;

    try {
      // Set loading state to true before API call
      setSuggestionsLoading(true);

      // Get current date
      const currentDate = dayjs().format("YYYY-MM-DD");

      // Get past 3 months events
      const threeMonthsAgo = dayjs().subtract(3, "month").valueOf();
      const pastEvents = savedEvents.filter(
        (event) => event.day >= threeMonthsAgo && event.day <= dayjs().valueOf()
      );

      // Get next 3 months events
      const threeMonthsAhead = dayjs().add(3, "month").valueOf();
      const futureEvents = savedEvents.filter(
        (event) =>
          event.day >= dayjs().valueOf() && event.day <= threeMonthsAhead
      );

      // Call smart suggestions endpoint
      const response = await axios.post(
        "http://localhost:5000/api/suggestions/smart-suggestions",
        {
          pastEvents,
          futureEvents,
          currentDate,
        }
      );

      // Transform suggestions into the format needed by the component
      const transformedSuggestions = response.data.map((suggestion) => ({
        formattedMessage: suggestion.suggestion,
        messageTemplate: {
          template: suggestion.suggestion,
          values: {},
        },
        template: suggestion.suggestion,
        values: {},
        type: suggestion.type,
      }));

      setSuggestions(transformedSuggestions);
    } catch (error) {
      console.error("Failed to fetch smart suggestions:", error);

      // Fallback to static suggestions
      const queryEventSuggestions = generateEventQuerySuggestions();
      setSuggestions(queryEventSuggestions);
    } finally {
      // Set loading state to false when done
      setSuggestionsLoading(false);
    }
  };

  // Add this helper function to shuffle an array (Fisher-Yates algorithm)
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Generate static event query suggestions - update this function to include find event suggestions
  const generateEventQuerySuggestions = () => {
    const queryTemplates = [
      // Local events queries
      {
        template: `Show me local events for this week`,
        values: { query: "events week" },
      },
      {
        template: `What's happening today in the city?`,
        values: { query: "events today" },
      },
      {
        template: `What events are going on this month?`,
        values: { query: "events month" },
      },
      {
        template: `Any interesting events this week?`,
        values: { query: "events week" },
      },

      // New find event queries for personal calendar
      {
        template: `When is my next meeting?`,
        values: { query: "find meetings" },
      },
      {
        template: `When was the last time I went to the gym?`,
        values: { query: "find appointments" },
      },
      {
        template: `When did I go to see the dentist?`,
        values: { query: "find events tomorrow" },
      },
      {
        template: `Find my next workout.`,
        values: { query: "find category work" },
      },
      {
        template: `When was my last meeting?`,
        values: { query: "find presentations" },
      },
    ];

    // Select 2 random templates - one from local events (0-3) and one from find events (4-8)
    const localEventIndex = Math.floor(Math.random() * 4);
    const findEventIndex = Math.floor(Math.random() * 5) + 4;

    const selectedTemplates = [
      queryTemplates[localEventIndex],
      queryTemplates[findEventIndex],
    ];

    return selectedTemplates.map((template) => ({
      ...template,
      messageTemplate: template,
      formattedMessage: template.template,
    }));
  };

  // Message templates for suggestions with formatted parts
  const suggestionTemplates = [
    // Existing templates with specific times
    (suggestion) => ({
      template: `Create an event titled "{title}" on {day} from {timeStart} to {timeEnd}`,
      values: {
        title: suggestion.title,
        day: dayjs(suggestion.day).format("MMMM D"),
        timeStart: suggestion.timeStart,
        timeEnd: suggestion.timeEnd,
      },
    }),
    (suggestion) => ({
      template: `Schedule "{title}" for {day} between {timeStart} and {timeEnd}`,
      values: {
        title: suggestion.title,
        day: dayjs(suggestion.day).format("MMMM D"),
        timeStart: suggestion.timeStart,
        timeEnd: suggestion.timeEnd,
      },
    }),
    (suggestion) => ({
      template: `Add "{title}" to my calendar on {day} from {timeStart}-{timeEnd}`,
      values: {
        title: suggestion.title,
        day: dayjs(suggestion.day).format("MMMM D"),
        timeStart: suggestion.timeStart,
        timeEnd: suggestion.timeEnd,
      },
    }),
    (suggestion) => ({
      template: `Put "{title}" from {timeStart} to {timeEnd} on {day}`,
      values: {
        title: suggestion.title,
        day: dayjs(suggestion.day).format("MMMM D"),
        timeStart: suggestion.timeStart,
        timeEnd: suggestion.timeEnd,
      },
    }),
    (suggestion) => ({
      template: `Book time for "{title}" on {day} from {timeStart} until {timeEnd}`,
      values: {
        title: suggestion.title,
        day: dayjs(suggestion.day).format("MMMM D"),
        timeStart: suggestion.timeStart,
        timeEnd: suggestion.timeEnd,
      },
    }),

    // New templates without specific times (to trigger AI time suggestions)
    (suggestion) => ({
      template: `Schedule "{title}" on {day}`,
      values: {
        title: suggestion.title,
        day: dayjs(suggestion.day).format("MMMM D"),
      },
    }),
    (suggestion) => ({
      template: `Add "{title}" to my calendar for {day}`,
      values: {
        title: suggestion.title,
        day: dayjs(suggestion.day).format("MMMM D"),
      },
    }),
    (suggestion) => ({
      template: `Book time for "{title}" on {day}`,
      values: {
        title: suggestion.title,
        day: dayjs(suggestion.day).format("MMMM D"),
      },
    }),
    (suggestion) => ({
      template: `When should I schedule "{title}" on {day}?`,
      values: {
        title: suggestion.title,
        day: dayjs(suggestion.day).format("MMMM D"),
      },
    }),
    (suggestion) => ({
      template: `Find the best time for "{title}" on {day}`,
      values: {
        title: suggestion.title,
        day: dayjs(suggestion.day).format("MMMM D"),
      },
    }),

    // New templates for local events queries
    (suggestion) => ({
      template: `Show me local events for this week`,
      values: {
        query: "events week",
      },
    }),
    (suggestion) => ({
      template: `What's happening today in the city?`,
      values: {
        query: "events today",
      },
    }),
    (suggestion) => ({
      template: `What events are going on this month?`,
      values: {
        query: "events month",
      },
    }),
    (suggestion) => ({
      template: `Any interesting events this weekend?`,
      values: {
        query: "events weekend",
      },
    }),
    (suggestion) => ({
      template: `Show me local concerts and performances`,
      values: {
        query: "local concerts",
      },
    }),

    // New templates for find event functionality
    (suggestion) => ({
      template: `When is my next meeting?`,
      values: { query: "find meetings" },
    }),
    (suggestion) => ({
      template: `When was the last time I went to the gym?`,
      values: { query: "find appointments" },
    }),
    (suggestion) => ({
      template: `When did I go to see the dentist?`,
      values: { query: "find events tomorrow" },
    }),
    (suggestion) => ({
      template: `Find my next workout.`,
      values: { query: "find category work" },
    }),
    (suggestion) => ({
      template: `When was my last meeting?`,
      values: { query: "find presentations" },
    }),
  ];

  // Helper function to format the message text from template and values
  const formatMessageText = (template, values) => {
    let text = template;
    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{${key}}`;
      text = text.replace(placeholder, value);
    }
    return text;
  };

  // Handle suggestion click - convert to conversation input
  const handleSuggestionClick = (suggestion) => {
    // Use the suggestion directly from the GROQ response
    const message = suggestion.formattedMessage;

    // Set the message as input and send it
    setInput(message);

    // Use setTimeout to ensure the state update happens before sending
    setTimeout(() => {
      handleSendMessage(message);

      // Remove this suggestion to avoid duplicates
      setSuggestions((prev) =>
        prev.filter((s) => s.formattedMessage !== suggestion.formattedMessage)
      );
    }, 0);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Function to navigate to the event's date while preserving current view
  const handleGoToEvent = (event) => {
    const eventDay = dayjs(event.day);

    // Set the selected day
    setSelectedDay(eventDay);

    // Set the month index
    setMonthIndex(eventDay.month());

    // Calculate and set the week index for week view
    const firstDayOfMonth = eventDay.startOf("month");
    const firstDayOfWeek = firstDayOfMonth.startOf("week").add(1, "day");
    const weekIndex = Math.floor(eventDay.diff(firstDayOfWeek, "day") / 7);
    setSelectedWeek(Math.max(0, weekIndex));

    // Don't change the view mode - keep whatever view the user is currently in
    // This will preserve month/week/day view
  };

  const handleSendMessage = async (customMessage = null) => {
    const messageToSend = customMessage || input;
    if (!messageToSend.trim()) return;

    // Add user message to chat
    setMessages((prev) => [...prev, { type: "user", text: messageToSend }]);

    setInput("");
    setLoading(true);

    try {
      // Hide suggestions immediately when sending a message
      setShowSuggestions(false);

      const response = await axios.post("http://localhost:5000/api/chat", {
        text: messageToSend,
      });

      if (response.data.intent === "create_event") {
        // Handle event creation (no overlaps)
        const eventData = response.data.eventData;

        const event = {
          title: eventData.title,
          description: eventData.description || "",
          timeStart: eventData.timeStart,
          timeEnd: eventData.timeEnd,
          day: eventData.day,
          category: eventData.category || "None",
        };

        await dispatchEvent({ type: "push", payload: event });

        // Add confirmation message to chat
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            text: `Event created: ${event.title} on ${dayjs(event.day).format(
              "dddd, MMMM D"
            )} at ${event.timeStart}.`,
          },
        ]);

        // Refresh suggestions after getting a response
        fetchEventSuggestions();
      } else if (response.data.intent === "event_overlap") {
        // Handle event overlap case with interactive list
        const eventData = response.data.eventData;
        const overlappingEvents = response.data.overlappingEvents;

        // Add warning message with interactive overlap list
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            content: {
              type: "eventOverlap",
              eventData: eventData,
              overlappingEvents: overlappingEvents,
            },
          },
        ]);

        // Refresh suggestions after getting a response
        fetchEventSuggestions();
      } else if (response.data.intent === "time_suggestions") {
        // Handle time suggestions
        const eventData = response.data.eventData;
        const suggestedSlots = response.data.suggestedSlots;

        // Add time suggestions message with interactive buttons
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            content: {
              type: "timeSuggestions",
              eventData: eventData,
              suggestedSlots: suggestedSlots,
              message: response.data.message,
            },
          },
        ]);

        // Refresh suggestions after getting a response
        fetchEventSuggestions();
      } else if (
        response.data.intent === "list_events" ||
        response.data.intent === "local_events"
      ) {
        // Handle list events response
        const { events, timeframe, city } = response.data;

        // Debug the response data
        console.log("Local events response:", response.data);

        // Make sure events is always an array
        const eventsList = Array.isArray(events) ? events : [];

        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            content: {
              type: "localEvents",
              events: eventsList,
              timeframe,
              city,
            },
          },
        ]);

        // Refresh suggestions after getting a response
        fetchEventSuggestions();
      } else if (response.data.intent === "find_event_result") {
        // Handle find event results
        const { events, selectedEvent, category, message } = response.data;

        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            content: {
              type: "eventSearch",
              events: events,
              selectedEvent: selectedEvent,
              category: category,
              message: message,
            },
          },
        ]);

        // Refresh suggestions after getting a response
        fetchEventSuggestions();
      } else {
        // For other intents (existing code)
        setMessages((prev) => [
          ...prev,
          { type: "system", text: response.data.message },
        ]);

        // Refresh suggestions after getting a response
        fetchEventSuggestions();
      }
    } catch (error) {
      console.error("Error processing message:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "system",
          text: "Sorry, I encountered an error processing your request.",
        },
      ]);

      // Still refresh suggestions on error responses
      fetchEventSuggestions();
    } finally {
      setLoading(false);
    }
  };

  // Custom component for rendering the overlap message
  const OverlapMessage = ({ eventData, overlappingEvents }) => (
    <div className="flex flex-col">
      <div>
        I can't create "{eventData.title}" on{" "}
        {dayjs(eventData.day).format("dddd, MMMM D")} from {eventData.timeStart}{" "}
        to {eventData.timeEnd} because it would overlap with:
      </div>
      <ul className="mt-2 mb-2">
        {overlappingEvents.map((event) => (
          <li
            key={event.id}
            onClick={() => handleEventClick(event)}
            className="py-1 px-2 my-1 rounded transition-all bg-gray-100 hover:bg-gray-200 cursor-pointer flex justify-between"
          >
            <span className="font-medium">{event.title}</span>
            <span className="text-gray-600">
              {event.timeStart} · {event.timeEnd}
            </span>
          </li>
        ))}
      </ul>
      <div className="text-xs text-gray-500">
        Click on any event to edit it or choose a different time.
      </div>
    </div>
  );

  // Custom component for rendering time suggestions
  const TimeSuggestionsMessage = ({ eventData, suggestedSlots, message }) => {
    const [showAllSlots, setShowAllSlots] = useState(false);

    // Function to handle slot selection
    const handleSelectSlot = async (slot) => {
      try {
        const event = {
          title: eventData.title,
          description: eventData.description || "",
          timeStart: slot.timeStart,
          timeEnd: slot.timeEnd,
          day: eventData.day,
          category: eventData.category || "None",
        };

        await dispatchEvent({ type: "push", payload: event });

        // Add confirmation message
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            text: `Event created: ${event.title} on ${dayjs(event.day).format(
              "dddd, MMMM D"
            )} from ${event.timeStart} to ${event.timeEnd}.`,
          },
        ]);
      } catch (error) {
        console.error("Error creating event:", error);
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            text: "Sorry, I encountered an error creating your event.",
          },
        ]);
      }
    };

    // Format time as just the hour (e.g., "10:30am" or "3pm")
    const formatTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const period = hours >= 12 ? "pm" : "am";
      const hour = hours % 12 || 12;
      return minutes === 0
        ? `${hour}${period}`
        : `${hour}:${minutes.toString().padStart(2, "0")}${period}`;
    };

    return (
      <div className="flex flex-col">
        <div>
          {message || `Here are suggested times for "${eventData.title}":`}
        </div>
        <div className="mt-2 mb-2">
          <div className="flex flex-row gap-1 items-center">
            {suggestedSlots.length == 0 ? (
              <div className="text-xs text-gray-500">No time slots found.</div>
            ) : (
              ""
            )}
            {/* Display first 3 time slots */}
            {suggestedSlots.slice(0, 3).map((slot, index) => (
              <button
                key={index}
                onClick={() => handleSelectSlot(slot)}
                className={`py-1 px-2 rounded cursor-pointer transition-all ${
                  index === 0
                    ? "bg-black hover:bg-gray-700 text-white"
                    : "bg-gray-100 hover:bg-gray-200 transition-all text-gray-800"
                }`}
              >
                {formatTime(slot.timeStart)}
              </button>
            ))}

            {/* "More" dropdown button */}
            {suggestedSlots.length > 3 && (
              <div className="relative inline-block">
                <button
                  onClick={() => setShowAllSlots(!showAllSlots)}
                  className="py-1 overflow-x-scroll rounded  text-gray-800 flex items-center"
                >
                  {suggestedSlots.slice(3).length}
                  {showAllSlots ? "▲" : "▼"}
                </button>

                {/* Dropdown menu for all slots */}
                {showAllSlots && (
                  <div className="shadow-custom absolute z-10 mt-1 right-0 bg-white rounded-md border border-gray-200 py-1 w-40 max-h-100 overflow-scroll">
                    {suggestedSlots.slice(3).map((slot, index) => (
                      <button
                        key={index + 3}
                        onClick={() => handleSelectSlot(slot)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {slot.timeStart} · {slot.timeEnd}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {suggestedSlots.length == 0 ? (
          ""
        ) : (
          <div className="text-xs text-gray-500">
            Click on a time slot to schedule this event
          </div>
        )}
      </div>
    );
  };

  // Custom component for rendering local events list
  const LocalEventsMessage = ({ events, timeframe, city }) => {
    const [expandedEvent, setExpandedEvent] = useState(null);

    // Add console.log to debug the events data
    console.log("Local events data:", { events, timeframe, city });

    return (
      <div className="flex flex-col">
        <div className="mb-2">
          Here are some events I found in {city} {timeframe && `(${timeframe})`}
          :
        </div>

        {!events || events.length === 0 ? (
          <div className="text-gray-500">
            No events found. Try a different timeframe or check back later.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {events.map((event, index) => (
              <div
                key={index}
                className="p-2.5 rounded-md bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() =>
                  setExpandedEvent(expandedEvent === index ? null : index)
                }
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{event.title}</span>
                  <span className="text-xs text-gray-500">
                    {dayjs(event.day).format("MMM D")}
                  </span>
                </div>

                {expandedEvent === index && (
                  <div className="mt-2 text-sm space-y-1 text-gray-700">
                    <div className="text-xs">
                      {dayjs(event.day).format("dddd, MMMM D")}
                    </div>
                    <div>
                      {event.timeStart} · {event.timeEnd}
                    </div>
                    {event.location && <div>📍 {event.location}</div>}
                    {event.description && (
                      <div className="italic">{event.description}</div>
                    )}
                    {event.category && (
                      <div className="mt-1">
                        <span className="inline-block px-2 py-0.5 bg-gray-200 rounded text-xs">
                          {event.category}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Updated EventSearchMessage component
  const EventSearchMessage = ({ events, selectedEvent, category, message }) => {
    const [showAllEvents, setShowAllEvents] = useState(false);

    // Function to navigate to the event's date
    const handleGoToEvent = (event) => {
      const eventDay = dayjs(event.day);

      // Set the selected day
      setSelectedDay(eventDay);

      // Set the month index
      setMonthIndex(eventDay.month());

      // Calculate and set the week index
      const firstDayOfMonth = eventDay.startOf("month");
      const firstDayOfWeek = firstDayOfMonth.startOf("week").add(1, "day");
      const weekIndex = Math.floor(eventDay.diff(firstDayOfWeek, "day") / 7);
      setSelectedWeek(Math.max(0, weekIndex));
    };

    // If no events or no selected event, just show the message
    if (events.length === 0) {
      return (
        <div className="flex flex-col">
          <div className="mb-2">{message}</div>
          <div className="text-gray-500">No matching events found.</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <div className="mb-2">{message}</div>

        {selectedEvent && (
          <div className="mb-3 p-3 bg-gray-100 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-lg">{selectedEvent.title}</span>
              <span className="text-sm text-gray-600">
                {dayjs(selectedEvent.day).format("ddd, MMM D")}
              </span>
            </div>
            <div className="text-sm mb-1 flex flex-wrap gap-1">
              <span className="inline-block text-nowrap bg-gray-200 px-2 py-0.5 rounded text-xs ">
                {selectedEvent.timeStart} · {selectedEvent.timeEnd}
              </span>
              {selectedEvent.category && (
                <span
                  className="inline-block text-nowrap px-2 py-0.5 rounded text-xs text-white "
                  style={{
                    backgroundColor:
                      darkCategoryColors[selectedEvent.category] || "#9E9E9E",
                  }}
                >
                  {selectedEvent.category}
                </span>
              )}
            </div>
            {selectedEvent.location && (
              <div className="text-sm">📍 {selectedEvent.location}</div>
            )}
            {selectedEvent.description && (
              <div className="text-sm mt-1 italic">
                {selectedEvent.description}
              </div>
            )}
            <div className="flex justify-end mt-2 gap-1">
              <button
                onClick={() => handleGoToEvent(selectedEvent)}
                className="px-3 flex gap-1 transition-all justify-center py-1 bg-gray-200 text-gray-800 text-xs rounded hover:bg-gray-300"
              >
                Go to
                <img src={arrowRightIcon} className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleEventClick(selectedEvent)}
                className="px-3 flex justify-center gap-1 py-1 bg-black text-white text-xs rounded transition-all hover:bg-gray-800"
              >
                Edit
                <img src={editIcon} className="h-3 w-3 alter invert" />
              </button>
            </div>
          </div>
        )}

        {events.length > 1 && (
          <div className="mb-2">
            <button
              onClick={() => setShowAllEvents(!showAllEvents)}
              className="flex items-center gap-1 px-3 py-1 bg-gray-200 transition-all text-gray-800 text-sm rounded hover:bg-gray-300"
            >
              {showAllEvents ? (
                <>
                  <span>Hide similar events</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Show {events.length - 1} similar events</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}

        {showAllEvents && events.length > 1 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {events
              .filter((event) => event.id !== selectedEvent?.id)
              .map((event) => (
                <div
                  key={event.id}
                  className="p-2.5 rounded-md cursor-pointer transition-all hover:bg-gray-200  bg-gray-100"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex justify-between items-center">
                    <span>{event.title}</span>
                    <span className="text-xs text-gray-500">
                      {dayjs(event.day).format("MMM D")}
                    </span>
                  </div>
                  <div className="flex mt-1">
                    <span className="text-xs text-gray-600 mr-2">
                      {event.timeStart} · {event.timeEnd}
                    </span>
                    {event.category && (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded-sm text-xs text-white"
                        style={{
                          backgroundColor:
                            categoryColors[event.category] || "#9E9E9E",
                        }}
                      >
                        {event.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  // Render suggestions as command texts with highlighted parts
  const SuggestionsSection = () => (
    <div className="flex flex-col justify-end items-end mb-4 mt-3 w-full">
      <div className="text-xs opacity-50 mb-2 ml-1 flex items-center">
        {suggestionsLoading && <span className="spinner-loader mr-2"></span>}
        {suggestionsLoading ? "Getting suggestions..." : "Suggested commands:"}
      </div>

      {suggestionsLoading ? (
        <></>
      ) : (
        <div className="w-[85%] flex flex-col gap-1">
          {suggestions.map((suggestion, index) => {
            // Choose icon based on suggestion type
            const getIcon = (type) => {
              switch (type) {
                case "CREATE_EVENT":
                  return <img src={zapIcon} className="w-4 h-4 opacity-50" />;
                case "FIND_EVENT":
                  return <img src={searchIcon} className="w-4 h-4" />;
                case "LOCAL_EVENTS":
                  return (
                    <img src={mapPinIcon} className="w-4 h-4 opacity-50" />
                  );
                case "TIME_SUGGESTIONS":
                  return <img src={clockIcon} className="w-4 h-4 opacity-50" />;
                default:
                  return <img src={zapIcon} className="w-4 h-4 opacity-50" />;
              }
            };

            return (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`
                  text-left px-2 py-2 w-full
                  flex items-center gap-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all
                `}
              >
                {/* Icon based on suggestion type */}
                <div className="flex-shrink-0 text-gray-600">
                  {getIcon(suggestion.type)}
                </div>
                <div className="flex-grow text-xs text-gray-600">
                  {suggestion.formattedMessage}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // Replace the existing renderFormattedSuggestion function with this simplified version
  const renderFormattedSuggestion = (suggestion) => {
    // Simply return the formatted message as regular text without any special formatting
    return (
      suggestion.formattedMessage ||
      formatMessageText(
        suggestion.messageTemplate.template,
        suggestion.messageTemplate.values
      )
    );
  };

  // Render different message types
  const renderMessage = (msg, index) => {
    let content;

    if (msg.text) {
      // Regular text message
      content = msg.text;
    } else if (msg.content && msg.content.type === "eventOverlap") {
      // Overlap message with interactive elements
      content = (
        <OverlapMessage
          eventData={msg.content.eventData}
          overlappingEvents={msg.content.overlappingEvents}
        />
      );
    } else if (msg.content && msg.content.type === "timeSuggestions") {
      // Time suggestions message with interactive elements
      content = (
        <TimeSuggestionsMessage
          eventData={msg.content.eventData}
          suggestedSlots={msg.content.suggestedSlots}
          message={msg.content.message}
        />
      );
    } else if (msg.content && msg.content.type === "localEvents") {
      // Local events list message
      content = (
        <LocalEventsMessage
          events={msg.content.events}
          timeframe={msg.content.timeframe}
          city={msg.content.city}
        />
      );
    } else if (msg.content && msg.content.type === "eventSearch") {
      // Event search results
      content = (
        <EventSearchMessage
          events={msg.content.events}
          selectedEvent={msg.content.selectedEvent}
          category={msg.content.category}
          message={msg.content.message}
        />
      );
    }

    return (
      <div
        key={index}
        className={`mb-2 ${msg.type === "user" ? "text-right" : ""}`}
      >
        <div
          className={`text-sm text-left inline-block p-3 rounded-xl max-w-[85%] ${
            msg.type === "user"
              ? "bg-gray-100  text-black  border border-gray-200"
              : "bg-white text-black border border-gray-200 "
          }`}
        >
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 h-full border-l border-gray-200 flex flex-col bg-white">
      <div className="py-2 border-b border-gray-200 flex justify-between items-center">
        <h2 className="shrink-0 ml-2 text-lg font-medium">AI Assistant</h2>
        <div className="flex items-center">
          <button
            onClick={handleStartOver}
            className="shrink-0 mx-3 cursor-pointer px-4 border shadow-custom border-gray-200 h-10 rounded-full text-sm active:bg-gray-50 transition-all"
          >
            Start over
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer  shrink-0 mr-4"
            aria-label="Close AI Assistant"
          >
            <img src={xIcon} className="w-5 h-5 " />
          </button>
        </div>
      </div>

      <div className="flex-1 p-2 overflow-y-auto h-full">
        {messages.map((msg, index) => renderMessage(msg, index))}

        {/* Show suggestions after messages with delay */}
        {!loading && (showSuggestions || suggestionsLoading) && (
          <SuggestionsSection />
        )}

        {loading && (
          <div className="mb-2">
            <div className="inline-block p-3 rounded-xl max-w-[85%] border border-gray-200 text-black rounded-tl-none">
              <div className="flex items-center space-x-2">
                <span className="spinner-loader"></span>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center m-2 mt-0 rounded-full shadow-custom border border-gray-200">
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !input.trim()}
          className="text-white hover:opacity-50 transition-all cursor-pointer align-self-end"
        >
          <img src={searchIcon} className="h-6 w-6 mx-2" />
        </button>

        {isListening ? (
          <div className="flex-1 min-h-[40px] py-1 flex items-center justify-center">
            <AudioWaveform isListening={isListening} />
          </div>
        ) : (
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize the textarea
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(
                e.target.scrollHeight,
                130
              )}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading) handleSendMessage();
              }
            }}
            placeholder="Type here..."
            className="flex-1 py-3 focus:outline-none focus:border-black resize-none min-h-[30px] max-h-[150px] overflow-y-auto"
            disabled={loading}
            ref={inputRef}
            rows={1}
          />
        )}

        <button
          onClick={toggleListening}
          disabled={loading || !browserSupportsSpeechRecognition}
          className={`transition align-self-end ${
            isListening ? "text-blue-500" : ""
          }`}
        >
          <img
            src={micIcon}
            className="hover:opacity-50 transition-all cursor-pointer h-6 w-6 mx-2"
          />
        </button>
      </div>
    </div>
  );
};

export default AIChatBox;

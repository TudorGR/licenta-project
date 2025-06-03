import React, { useState, useRef, useEffect, useContext } from "react";
import axios from "axios";
import Context from "../context/Context";
import dayjs from "dayjs";
import searchIcon from "../assets/search.svg";
import searchIcon2 from "../assets/searchInput.svg";
import micIcon from "../assets/mic.svg";
import arrowRightIcon from "../assets/arrow-right.svg";
import editIcon from "../assets/edit.svg";
import zapIcon from "../assets/zap.svg";
import mapPinIcon from "../assets/map-pin.svg";
import clockIcon from "../assets/clock.svg";
import xIcon from "../assets/x.svg";
// Import the speech recognition library
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import AudioWaveform from "./AudioWaveform";
import {
  lightCategoryColors,
  categoryColors,
  darkCategoryColors,
} from "../utils/categoryColors";
import { AuthContext } from "../context/AuthContext";

// Add this new component after the imports and before the AIChatBox component
const TypewriterEffect = ({ text, onComplete, speed = 10 }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prevText) => prevText + text[currentIndex]);
        setCurrentIndex((prevIndex) => prevIndex + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return <span>{displayedText}</span>;
};

// Add this new component with the other custom message components
const DeleteConfirmationMessage = ({
  eventData,
  message,
  setMessages,
  dispatchEvent: dispatchCalendarEvent,
}) => {
  // Add state to track if the event has been restored
  const [isRestored, setIsRestored] = useState(false);

  const handleUndoDelete = async () => {
    try {
      // Convert day from string format to timestamp if needed
      let dayValue = eventData.day;

      // Check if day is a string in date format rather than a timestamp
      if (
        typeof eventData.day === "string" &&
        !isNaN(Date.parse(eventData.day))
      ) {
        // Convert the date string to timestamp (milliseconds)
        dayValue = dayjs(eventData.day).valueOf();
      }

      // Create a clean event object with only the required fields
      const event = {
        title: eventData.title,
        description: eventData.description || "",
        timeStart: eventData.timeStart,
        timeEnd: eventData.timeEnd,
        day: dayValue, // Use the correctly formatted day value
        category: eventData.category || "Other",
      };

      // Restore the deleted event by pushing back only required fields
      await dispatchCalendarEvent({ type: "push", payload: event });

      // Mark as restored to disable the button
      setIsRestored(true);

      // Add a message confirming the restoration
      setMessages((prev) => [
        ...prev,
        {
          type: "system",
          text: `Restored event: ${event.title}`,
          isTyping: true,
          isComplete: false,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Error restoring event:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "system",
          text: "Sorry, I couldn't restore the deleted event.",
          isTyping: true,
          isComplete: false,
          timestamp: new Date(),
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col">
      <div>{message}</div>
      <button
        onClick={handleUndoDelete}
        disabled={isRestored}
        className={`self-start mt-2 px-3 py-1 ${
          isRestored
            ? "bg-gray-50 text-gray-400 cursor-not-allowed"
            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
        } text-sm rounded-xl transition-colors flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
        </svg>
        {isRestored ? "Event Restored" : "Undo"}
      </button>
    </div>
  );
};

// Add this new component after DeleteConfirmationMessage
const CreateConfirmationMessage = ({
  event,
  message,
  setMessages,
  dispatchEvent: dispatchCalendarEvent,
}) => {
  // Add state to track if the event has been undone
  const [isUndone, setIsUndone] = useState(false);

  const handleUndoCreate = async () => {
    try {
      if (event && event.id) {
        // Delete the newly created event
        await dispatchCalendarEvent({ type: "delete", payload: event });

        // Mark as undone to disable the button
        setIsUndone(true);

        // Add a message confirming the undo action
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            text: `Undid creation of event: ${event.title}`,
            isTyping: true,
            isComplete: false,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error undoing event creation:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "system",
          text: "Sorry, I couldn't undo the event creation.",
          isTyping: true,
          isComplete: false,
          timestamp: new Date(),
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col">
      <div>{message}</div>
      <button
        onClick={handleUndoCreate}
        disabled={isUndone}
        className={`self-start mt-2 px-3 py-1 ${
          isUndone
            ? "bg-gray-50 text-gray-400 cursor-not-allowed"
            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
        } text-sm rounded-xl transition-colors flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
        </svg>
        {isUndone ? "Event Removed" : "Undo"}
      </button>
    </div>
  );
};

const AIChatBox = ({ onClose }) => {
  const {
    dispatchEvent,
    setSelectedEvent,
    setShowEventModal,
    savedEvents,
    selectedDate,
    setSelectedDate,
    setSelectedDay,
    setMonthIndex,
    setSelectedWeek,
    workingHoursStart,
    workingHoursEnd,
  } = useContext(Context);

  // Get currentUser from AuthContext instead
  const { currentUser } = useContext(AuthContext);

  // Load saved messages from localStorage if available
  const getInitialMessages = () => {
    if (!currentUser?.id)
      return [
        {
          type: "system",
          text: "Hi! How can I help you with your calendar?",
          isTyping: true, // Add this flag
          isComplete: false, // Add this flag
          timestamp: new Date(),
        },
      ];

    try {
      const savedMessages = localStorage.getItem(
        `chat_messages_${currentUser.id}`
      );
      if (savedMessages) {
        return JSON.parse(savedMessages);
      }
    } catch (error) {
      console.error("Error loading saved messages:", error);
    }

    // Default initial message if no saved messages
    return [
      {
        type: "system",
        text: currentUser?.name
          ? `Hi ${currentUser.name}! How can I help you with your calendar?`
          : "Hi! How can I help you with your calendar?",
        isTyping: true, // Add this flag
        isComplete: false, // Add this flag
        timestamp: new Date(), // Add timestamp to initial message
      },
    ];
  };

  // Update the messages state with the loaded messages
  const [messages, setMessages] = useState(getInitialMessages);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (currentUser?.id && messages.length > 0) {
      localStorage.setItem(
        `chat_messages_${currentUser.id}`,
        JSON.stringify(messages)
      );
    }
  }, [messages, currentUser?.id]);

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

  // NEW EFFECT: Scroll to bottom on initial load with a slight delay
  // This ensures the chat box opens with the most recent messages visible
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 0);

    return () => clearTimeout(scrollTimeout);
  }, []); // Empty dependency array means this runs once on mount

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
    const lastMessage = messages[messages.length - 1];
    const isSystemMessageTyping =
      lastMessage &&
      lastMessage.type === "system" &&
      lastMessage.isTyping === true;

    if (suggestions.length > 0 && !loading && !isSystemMessageTyping) {
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
      }
      // Set suggestionsLoading to true immediately
      setSuggestionsLoading(true);

      suggestionTimer.current = setTimeout(() => {
        // When timer completes, show suggestions and turn off loading
        setShowSuggestions(true);
        setSuggestionsLoading(false);
      }, 1000);
    } else {
      // If conditions are not met (e.g., system message is typing, loading, or no suggestions),
      // clear any existing timer and hide suggestions/loading state.
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
        suggestionTimer.current = null;
      }
      setShowSuggestions(false);
      setSuggestionsLoading(false);
    }

    return () => {
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
        suggestionTimer.current = null;
      }
    };
  }, [suggestions, loading, messages]); // Added 'messages' to dependency array

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

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

  // Update the handleStartOver function to also clear localStorage
  const handleStartOver = async () => {
    // Reset the UI first for better user experience
    const initialMessage = {
      type: "system",
      text: currentUser?.name
        ? `Hi ${currentUser.name}! How can I help you with your calendar?`
        : "Hi! How can I help you with your calendar?",
      isTyping: true, // Add this flag
      isComplete: false, // Add this flag
      timestamp: new Date(), // Add timestamp to initial message
    };

    setMessages([initialMessage]);
    setInput("");
    setSuggestions([]);

    // Clear saved messages in localStorage
    if (currentUser?.id) {
      localStorage.setItem(
        `chat_messages_${currentUser.id}`,
        JSON.stringify([initialMessage])
      );

      // Reset the AI's memory on the server
      try {
        await axios.post("http://localhost:5000/api/chat/reset", {
          userId: currentUser.id,
        });
      } catch (error) {
        console.error("Failed to reset AI memory:", error);
      }
    }

    fetchEventSuggestions(); // Fetch fresh suggestions
  };

  // Update the fetchEventSuggestions function
  const fetchEventSuggestions = async () => {
    if (!savedEvents || savedEvents.length === 0) return;

    try {
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
    }
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

    // Set the selectedDate first (new primary date state)
    setSelectedDate(eventDay);

    // Set the selected day for backward compatibility
    setSelectedDay(eventDay);

    // Set the month index for backward compatibility
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

    // Add timestamp to user message
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: messageToSend,
        timestamp: new Date(), // Add timestamp
      },
    ]);

    setInput("");
    // Reset textarea height after sending
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      // Hide suggestions immediately when sending a message
      setShowSuggestions(false);

      const response = await axios.post("http://localhost:5000/api/chat", {
        text: messageToSend,
        workingHoursStart,
        workingHoursEnd,
        userId: currentUser.id, // Add the user ID from AuthContext
      });

      // Store response timestamp to use for all system messages
      const responseTimestamp = new Date();

      if (response.data.intent === "create_event") {
        const eventData = response.data.eventData;

        try {
          // Create the event
          const event = {
            title: eventData.title,
            description: eventData.description || "",
            day: eventData.day,
            timeStart: eventData.timeStart,
            timeEnd: eventData.timeEnd,
            category: eventData.category || "Other",
          };

          // Create the event and capture the response (should contain the created event with ID)
          const createdEventInfo = await dispatchEvent({
            type: "push",
            payload: event,
          });

          // Add confirmation message with undo button
          setMessages((prev) => [
            ...prev,
            {
              type: "system",
              content: {
                type: "createConfirmation",
                event: createdEventInfo?.eventData || event, // Use the created event with ID
                message:
                  response.data.message ||
                  `Event created: ${event.title} on ${dayjs(event.day).format(
                    "dddd, MMMM D"
                  )} at ${event.timeStart}.`,
              },
              isTyping: true,
              isComplete: false,
              timestamp: responseTimestamp,
            },
          ]);

          // Refresh suggestions after getting a response
          fetchEventSuggestions();
        } catch (error) {
          console.error("Error creating event:", error);
          // Handle error...
        }
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
              message: response.data.message,
            },
            isTyping: true, // Add this flag
            isComplete: false, // Add this flag
            timestamp: responseTimestamp,
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
            isTyping: true, // Add this flag
            isComplete: false, // Add this flag
            timestamp: responseTimestamp,
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
            isTyping: true, // Add this flag
            isComplete: false, // Add this flag
            timestamp: responseTimestamp,
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
            isTyping: true, // Add this flag
            isComplete: false, // Add this flag
            timestamp: responseTimestamp,
          },
        ]);

        // Refresh suggestions after getting a response
        fetchEventSuggestions();
      } else if (response.data.intent === "delete_event_result") {
        // Handle delete event result
        const { selectedEvent, message } = response.data;

        if (selectedEvent) {
          // Delete the event
          await dispatchEvent({ type: "delete", payload: selectedEvent });

          // Add confirmation message with undo button
          setMessages((prev) => [
            ...prev,
            {
              type: "system",
              content: {
                type: "deleteConfirmation",
                event: selectedEvent,
                message: message || `Deleted event: ${selectedEvent.title}`,
              },
              isTyping: true,
              isComplete: false,
              timestamp: responseTimestamp,
            },
          ]);
        } else {
          // No event found to delete
          setMessages((prev) => [
            ...prev,
            {
              type: "system",
              text: message || "I couldn't find that specific event to delete.",
              isTyping: true,
              isComplete: false,
              timestamp: responseTimestamp,
            },
          ]);
        }
        // Refresh suggestions after getting a response
        fetchEventSuggestions();
      } else {
        // For other intents (existing code)
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            text: response.data.message,
            isTyping: true, // Add this flag
            isComplete: false, // Add this flag
            timestamp: responseTimestamp,
          },
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
          timestamp: new Date(),
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
      <ul className="shadow-custom p-2 mt-2 mb-2 border border-gray-200 rounded-2xl flex flex-col gap-2">
        {overlappingEvents.map((event) => (
          <li
            key={event.id}
            onClick={() => handleEventClick(event)}
            className="py-1 px-2 rounded-xl transition-all bg-gray-100 hover:bg-gray-200 cursor-pointer flex justify-between"
          >
            <span className="font-medium">{event.title}</span>
            <span className="text-gray-600">
              {event.timeStart} - {event.timeEnd}
            </span>
          </li>
        ))}
      </ul>
      <div className="text-xxs text-gray-500">
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
          category: eventData.category || "Other",
        };

        await dispatchEvent({ type: "push", payload: event });

        // Add a new confirmation message instead of replacing the current one
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            text: `Event created: ${event.title} on ${dayjs(event.day).format(
              "dddd, MMMM D"
            )} at ${event.timeStart}.`,
            isTyping: true,
            isComplete: false,
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        console.error("Error creating event:", error);
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            text: "Sorry, I encountered an error creating your event.",
            isTyping: true,
            isComplete: false,
            timestamp: new Date(),
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
          <div className="flex flex-row gap-2 flex-wrap items-center shadow-custom rounded-2xl border border-gray-200 p-2">
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
                className={`py-1 px-2 rounded-xl cursor-pointer transition-all ${
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
                  className="py-1 px-2 overflow-x-scroll rounded-xl  bg-gray-100 hover:bg-gray-200 transition-all text-gray-800 flex items-center"
                >
                  more {showAllSlots ? "▲" : "▼"}
                </button>

                {/* Dropdown menu for all slots */}
                {showAllSlots && (
                  <div className="shadow-custom absolute z-10 mt-1 -right-8 bg-white rounded-xl border border-gray-200 py-1 max-h-70 overflow-scroll">
                    {suggestedSlots.slice(3).map((slot, index) => (
                      <button
                        key={index + 3}
                        onClick={() => handleSelectSlot(slot)}
                        className="block text-nowrap w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {slot.timeStart} - {slot.timeEnd}
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
          <div className="text-xxs text-gray-500">
            Click on a time slot to schedule this event
          </div>
        )}
      </div>
    );
  };

  // Custom component for rendering local events list
  const LocalEventsMessage = ({ events, timeframe, city }) => {
    const [expandedEvent, setExpandedEvent] = useState(null);

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
          <div className="space-y-2 max-h-72 overflow-y-auto p-2 rounded-2xl border border-gray-200 shadow-custom">
            {events.map((event, index) => (
              <div
                key={index}
                className="p-2.5 rounded-xl bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
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
                        <span className="inline-block px-2 py-0.5 bg-gray-200 rounded-md text-xs">
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

      // Set the selectedDate first (new primary date state)
      setSelectedDate(eventDay);

      // Set the selected day for backward compatibility
      setSelectedDay(eventDay);

      // Set the month index for backward compatibility
      setMonthIndex(eventDay.month());

      // Calculate and set the week index for week view
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
          <div className="mb-2 p-2 shadow-custom rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-lg">{selectedEvent.title}</span>
              <span className="text-sm text-gray-600">
                {dayjs(selectedEvent.day).format("ddd, MMM D")}
              </span>
            </div>
            <div className="text-sm mb-1 flex flex-wrap gap-1">
              <span className="inline-block text-nowrap bg-gray-100 px-2 py-1 rounded-xl  ">
                {selectedEvent.timeStart} - {selectedEvent.timeEnd}
              </span>
              {selectedEvent.category && (
                <span
                  className="inline-block text-nowrap px-2 py-1 rounded-xl  text-white "
                  style={{
                    backgroundColor:
                      categoryColors[selectedEvent.category] || "#9E9E9E",
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
            <div className="flex justify-end gap-1">
              <button
                onClick={() => handleGoToEvent(selectedEvent)}
                className="px-2 flex gap-1 transition-all justify-center py-1 cursor-pointer bg-gray-100 text-gray-800  rounded-xl hover:bg-gray-200"
              >
                Go to
                <img src={arrowRightIcon} className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleEventClick(selectedEvent)}
                className="px-2 flex items-center justify-center gap-1 py-1 cursor-pointer bg-black text-white  rounded-xl transition-all hover:bg-gray-800"
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
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 transition-all text-gray-800 text-sm rounded-2xl hover:bg-gray-200"
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
          <div className="space-y-2 max-h-72 overflow-y-auto p-2 border border-gray-200 shadow-custom rounded-2xl">
            {events
              .filter((event) => event.id !== selectedEvent?.id)
              .map((event) => (
                <div
                  key={event.id}
                  className="p-2.5 rounded-xl cursor-pointer transition-all hover:bg-gray-200  bg-gray-100"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-xs text-gray-500">
                      {dayjs(event.day).format("MMM D")}
                    </span>
                  </div>
                  <div className="flex">
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
    <div className="flex flex-col justify-end mb-1 items-end mt-3 w-full">
      <div className="text-xs opacity-50 mb-2 ml-1 flex items-center">
        {suggestionsLoading && <span className="spinner-loader mr-2"></span>}
        {suggestionsLoading ? "Getting suggestions..." : "Suggested commands:"}
      </div>

      {suggestionsLoading ? (
        <></>
      ) : (
        <div className="w-[85%]  flex flex-col gap-1">
          {suggestions.slice(0, 3).map((suggestion, index) => {
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
                  flex cursor-pointer items-center gap-2 shadow rounded-xl  hover:bg-gray-50 transition-all
                `}
              >
                {/* Icon based on suggestion type */}
                <div className="flex-shrink-0 text-gray-500">
                  {getIcon(suggestion.type)}
                </div>
                <div className="flex-grow text-xs text-gray-500">
                  {suggestion.formattedMessage}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render different message types
  const renderMessage = (msg, index) => {
    let content;

    // For text messages
    if (msg.text) {
      if (msg.isTyping && msg.type === "system") {
        content = (
          <TypewriterEffect
            text={msg.text}
            onComplete={() => {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[index] = {
                  ...newMessages[index],
                  isTyping: false,
                  isComplete: true,
                };
                return newMessages;
              });
            }}
          />
        );
      } else {
        content = msg.text;
      }
    }
    // For interactive messages
    else if (msg.content) {
      if (msg.isTyping && msg.type === "system") {
        // First animate the message text
        let animateText = msg.content.message || "Here's what I found:";

        content = (
          <TypewriterEffect
            text={animateText}
            onComplete={() => {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[index] = {
                  ...newMessages[index],
                  isTyping: false,
                  isComplete: true,
                };
                return newMessages;
              });
            }}
          />
        );
      } else if (!msg.isTyping || msg.type === "user") {
        // After typing is done or for user messages, show interactive content
        if (msg.content.type === "eventOverlap") {
          content = (
            <div className="flex flex-col">
              {msg.content.message && (
                <div className="mb-2">{msg.content.message}</div>
              )}
              <ul className="shadow-custom p-2 mt-2 mb-2 border border-gray-200 rounded-2xl flex flex-col gap-2">
                {msg.content.overlappingEvents.map((event) => (
                  <li
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="py-1 px-2 rounded-xl transition-all bg-gray-100 hover:bg-gray-200 cursor-pointer flex justify-between"
                  >
                    <span className="font-medium">{event.title}</span>
                    <span className="text-gray-600">
                      {event.timeStart} - {event.timeEnd}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="text-xxs text-gray-500">
                Click on any event to edit it or choose a different time.
              </div>
            </div>
          );
        } else if (msg.content.type === "timeSuggestions") {
          content = (
            <TimeSuggestionsMessage
              eventData={msg.content.eventData}
              suggestedSlots={msg.content.suggestedSlots}
              message={msg.content.message}
            />
          );
        } else if (msg.content.type === "localEvents") {
          content = (
            <LocalEventsMessage
              events={msg.content.events}
              timeframe={msg.content.timeframe}
              city={msg.content.city}
            />
          );
        } else if (msg.content.type === "eventSearch") {
          content = (
            <EventSearchMessage
              events={msg.content.events}
              selectedEvent={msg.content.selectedEvent}
              category={msg.content.category}
              message={msg.content.message}
            />
          );
        } else if (msg.content.type === "deleteConfirmation") {
          content = (
            <DeleteConfirmationMessage
              eventData={msg.content.event}
              message={msg.content.message}
              dispatchEvent={dispatchEvent}
              setMessages={setMessages}
            />
          );
        } else if (msg.content.type === "createConfirmation") {
          content = (
            <CreateConfirmationMessage
              event={msg.content.event}
              message={msg.content.message}
              dispatchEvent={dispatchEvent}
              setMessages={setMessages}
            />
          );
        }
      }
    }

    return (
      <div
        key={index}
        className={`mb-2 ${msg.type === "user" ? "text-right" : ""}`}
      >
        <div
          className={`text-sm text-left inline-block px-3 py-2 rounded-2xl max-w-[85%] ${
            msg.type === "user"
              ? "bg-gray-100 text-black "
              : "bg-white text-black "
          }`}
        >
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 h-full  border-l border-gray-200 flex flex-col bg-white">
      <div className="py-2 border-b border-gray-200 flex justify-between items-center">
        <h2 className="shrink-0 ml-4 text-lg font-medium">AI Assistant</h2>
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

      <div className="flex-1 p-2 pb-16 overflow-y-auto h-full relative">
        <div className="sticky -mt-10 -top-2 left-0 w-full right-0 h-12 pointer-events-none bg-gradient-to-b from-white to-transparent"></div>

        {messages.map((msg, index) => renderMessage(msg, index))}

        {/* Show suggestions after messages with delay */}
        {!loading && (showSuggestions || suggestionsLoading) && (
          <SuggestionsSection />
        )}

        {loading && (
          <div className="mb-2">
            <div className="inline-block p-3 rounded-xl max-w-[85%] text-black rounded-tl-none">
              <div className="flex items-center space-x-2">
                <span className="spinner-loader"></span>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 w-full bg-gradient-to-t from-white to-transparent">
        <div className="bg-white/95 flex items-center m-2 mt-0 rounded-full shadow-custom border border-gray-200">
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            className="text-white hover:opacity-50 transition-all cursor-pointer align-self-end"
          >
            <img src={searchIcon2} className="h-6 w-6 mx-2" />
          </button>

          {isListening ? (
            <div className="flex-1 h-10 py-1 flex items-center justify-center">
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
              className="flex-1 py-2 focus:outline-none focus:border-black resize-none min-h-[30px] max-h-[150px] overflow-y-auto"
              disabled={loading}
              ref={inputRef}
              rows={1}
            />
          )}

          <button
            onMouseDown={() => {
              resetTranscript();
              setShowVoiceInput(true);
              SpeechRecognition.startListening({
                continuous: true,
                language: "en-US",
              });
            }}
            onMouseUp={() => {
              SpeechRecognition.stopListening();
              setShowVoiceInput(false);
              // Small delay to ensure transcript is complete
              setTimeout(() => {
                if (transcript) {
                  // Send directly instead of transferring to input
                  handleSendMessage(transcript);
                }
              }, 300);
            }}
            onMouseLeave={() => {
              if (isListening) {
                SpeechRecognition.stopListening();
                setShowVoiceInput(false);
              }
            }}
            onTouchStart={() => {
              resetTranscript();
              setShowVoiceInput(true);
              SpeechRecognition.startListening({
                continuous: true,
                language: "en-US",
              });
            }}
            onTouchEnd={() => {
              SpeechRecognition.stopListening();
              setShowVoiceInput(false);
              // Small delay to ensure transcript is complete
              setTimeout(() => {
                if (transcript) {
                  // Send directly instead of transferring to input
                  handleSendMessage(transcript);
                }
              }, 300);
            }}
            disabled={loading || !browserSupportsSpeechRecognition}
            className={`transition h-full align-self-end relative ${
              isListening ? "text-blue-500" : ""
            }`}
            title="Press and hold to record voice message"
          >
            <div className="absolute top-0 z-15 cursor-pointer w-full h-full rounded-r-full"></div>
            <img
              src={micIcon}
              className={`h-6 w-6 mx-2 ${
                isListening ? "animate-pulse" : "hover:opacity-50"
              } transition-all cursor-pointer`}
            />
            {isListening && (
              <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded whitespace-nowrap">
                Release to send
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatBox;

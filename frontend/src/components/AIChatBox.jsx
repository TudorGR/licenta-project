import React, { useState, useRef, useEffect, useContext } from "react";
import axios from "axios";
import Context from "../context/Context";
import dayjs from "dayjs";
import sendIcon from "../assets/send-icon.svg";
import { api } from "../services/api.js";

const AIChatBox = () => {
  const [messages, setMessages] = useState([
    { type: "system", text: "Hi! How can I help you with your calendar?" },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const { dispatchEvent, setSelectedEvent, setShowEventModal, savedEvents } =
    useContext(Context);
  const initialLoadDone = useRef(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionTimer = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showSuggestions]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
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

  // Generate suggestions based on past events
  useEffect(() => {
    if (savedEvents && savedEvents.length > 0 && !initialLoadDone.current) {
      fetchEventSuggestions();
      initialLoadDone.current = true;
    }
  }, [savedEvents]);

  // Assign a template to each suggestion when fetched
  const fetchEventSuggestions = async () => {
    if (!savedEvents || savedEvents.length === 0) return;

    try {
      const rawSuggestions = await api.getEventSuggestions(savedEvents);

      // Assign a random template to each suggestion
      const enhancedSuggestions = rawSuggestions.map((suggestion) => {
        const templateIndex = Math.floor(
          Math.random() * suggestionTemplates.length
        );
        const messageTemplate = suggestionTemplates[templateIndex];
        const template = messageTemplate(suggestion);

        return {
          ...suggestion,
          messageTemplate: template,
          formattedMessage: formatMessageText(
            template.template,
            template.values
          ),
          template: template.template,
          values: template.values,
        };
      });

      setSuggestions(enhancedSuggestions);
    } catch (error) {
      console.error("Failed to fetch event suggestions:", error);
    }
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
    // Use the pre-formatted message
    const message = suggestion.formattedMessage;

    // Set the message as input and send it
    setInput(message);

    // Use setTimeout to ensure the state update happens before sending
    setTimeout(() => {
      handleSendMessage(message);

      // Remove this suggestion to avoid duplicates
      setSuggestions((prev) =>
        prev.filter(
          (s) =>
            s.day !== suggestion.day || s.timeStart !== suggestion.timeStart
        )
      );
    }, 0);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
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
      } else {
        // For other intents, just show the response message
        setMessages((prev) => [
          ...prev,
          { type: "system", text: response.data.message },
        ]);
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
    } finally {
      setLoading(false);

      // Fetch new suggestions after processing a message
      if (suggestions.length <= 2) {
        fetchEventSuggestions();
      }
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
              {event.timeStart} - {event.timeEnd}
            </span>
          </li>
        ))}
      </ul>
      <div>Click on any event to edit it or choose a different time.</div>
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
            {/* Display first 3 time slots */}
            {suggestedSlots.slice(0, 3).map((slot, index) => (
              <button
                key={index}
                onClick={() => handleSelectSlot(slot)}
                className={`py-1 px-2 rounded-full cursor-pointer transition-all ${
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
                  className="py-1 overflow-x-scroll rounded-full  text-gray-800 flex items-center"
                >
                  {suggestedSlots.slice(3).length}
                  {showAllSlots ? "▲" : "▼"}
                </button>

                {/* Dropdown menu for all slots */}
                {showAllSlots && (
                  <div className="shadow-custom absolute z-10 mt-1 right-0 bg-white rounded-md border border-gray-100 py-1 w-48">
                    {suggestedSlots.slice(3).map((slot, index) => (
                      <button
                        key={index + 3}
                        onClick={() => handleSelectSlot(slot)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
        <div className="text-xs text-gray-500">
          Click on a time slot to schedule this event
        </div>
      </div>
    );
  };

  // Render suggestions as command texts with highlighted parts
  const SuggestionsSection = () => (
    <div className="flex flex-col justify-end items-end mb-4 mt-3 w-full">
      <div className="text-xs text-gray-500 mb-2 ml-1 font-medium">
        Suggested commands:
      </div>
      <div className="w-[85%] flex flex-col gap-2">
        {suggestions.map((suggestion, index) => {
          // Check if this is a time suggestion (no timeStart/timeEnd) or regular suggestion
          const isTimeSuggestion = !suggestion.values.timeStart;

          return (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`
                text-left px-2 py-2  w-full
                flex items-center gap-2 rounded-xl  bg-gray-50  hover:bg-gray-100 transition-all
              `}
            >
              {/* Icon based on suggestion type */}
              <div
                className={`
                rounded-full p-1.5 flex-shrink-0
                    bg-gray-50 text-gray-600
              `}
              >
                {isTimeSuggestion ? (
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Text content with formatted parts */}
              <div className={`text-xs leading-tight text-gray-600`}>
                {renderFormattedSuggestion(suggestion)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Render a suggestion with bold formatting for key parts
  const renderFormattedSuggestion = (suggestion) => {
    const { template, values } = suggestion.messageTemplate;

    // Create parts of the message by splitting on placeholders
    const parts = template.split(/\{([^}]+)\}/g);

    return parts.map((part, index) => {
      // Every odd index is a placeholder
      if (index % 2 === 1) {
        const key = part;
        const value = values[key];
        return (
          <span key={index} className="font-medium ">
            {value}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
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
    }

    return (
      <div
        key={index}
        className={`mb-2 ${msg.type === "user" ? "text-right" : ""}`}
      >
        <div
          className={`text-sm  inline-block p-3 rounded-lg max-w-[85%] ${
            msg.type === "user"
              ? "bg-black text-white rounded-tr-none"
              : "bg-gray-50 text-black rounded-tl-none border border-gray-100"
          }`}
        >
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 h-full border-l border-gray-100 flex flex-col bg-white">
      <div className="p-3.5 border-b border-gray-100">
        <h2 className="text-lg font-medium">AI Assistant</h2>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {messages.map((msg, index) => renderMessage(msg, index))}

        {/* Show suggestions after messages with delay */}
        {!loading && showSuggestions && <SuggestionsSection />}

        {loading && (
          <div className="mb-2">
            <div className="inline-block p-3 rounded-lg max-w-[85%] bg-gray-100 text-black rounded-tl-none">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-100 ">
        <div className="flex">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize the textarea
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(
                e.target.scrollHeight,
                150
              )}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading) handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className=" flex-1 p-4 focus:outline-none focus:border-black resize-none min-h-[50px] max-h-[150px] overflow-y-auto"
            disabled={loading}
            ref={inputRef}
            rows={1}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            className="text-white m-2 p-2.5 transition align-self-end"
          >
            <img src={sendIcon} alt="Send" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatBox;

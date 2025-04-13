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

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, suggestions]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

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
      const response = await axios.post("http://localhost:5000/api/chat", {
        text: messageToSend,
      });
      console.log(response);

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
            className="py-1 px-2 my-1 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer flex justify-between"
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

  // Render suggestions as command texts with highlighted parts
  const SuggestionsSection = () => (
    <div className="flex flex-col justify-end items-end mb-4 mt-3">
      <div className="text-xs text-gray-500 mb-2">Try asking:</div>
      <div className="max-w-[85%] flex flex-col gap-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(suggestion)}
            className="text-left p-2 hover:bg-gray-50 border border-gray-100 rounded-lg text-sm transition-all w-full"
          >
            <div className="text-xs text-black">
              {renderFormattedSuggestion(suggestion)}
            </div>
          </button>
        ))}
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
        return <strong key={index}>{value}</strong>;
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
    }

    return (
      <div
        key={index}
        className={`mb-2 ${msg.type === "user" ? "text-right" : ""}`}
      >
        <div
          className={`text-sm inline-block p-2 rounded-lg max-w-[85%] ${
            msg.type === "user"
              ? "bg-black text-white rounded-tr-none"
              : "bg-gray-100 text-black rounded-tl-none"
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

        {/* Show suggestions after messages */}
        {!loading && suggestions.length > 0 && <SuggestionsSection />}

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

      <div className="border-t border-gray-100">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !loading && handleSendMessage()
            }
            placeholder="Type a message..."
            className="flex-1 p-4 focus:outline-none focus:border-black"
            disabled={loading}
            ref={inputRef}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            className="text-white m-2 p-2.5 transition"
          >
            <img src={sendIcon} alt="Send" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatBox;

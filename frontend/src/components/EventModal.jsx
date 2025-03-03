import React, { useContext, useEffect, useRef, useState } from "react";
import Context from "../context/Context";
import closeIcon from "../assets/close_icon.svg";
import deleteIcon from "../assets/delete_icon.svg";
import calendar from "../assets/calendar.svg";
import SmallCalendar from "./SmallCalendar";
import dayjs from "dayjs";
import saveIcon from "../assets/save.svg";
import recurringIcon from "../assets/recurring.svg";
import categoryIcon from "../assets/category.svg";
import locationIcon from "../assets/location.svg";
import workoutIcon from "../assets/workout.svg";
import meetingIcon from "../assets/meeting.svg";
import studyIcon from "../assets/study.svg";
import personalIcon from "../assets/personal.svg";
import workIcon from "../assets/work.svg";
import socialIcon from "../assets/social.svg";
import familyIcon from "../assets/family.svg";
import healthIcon from "../assets/health.svg";
import hobbyIcon from "../assets/hobby.svg";
import choresIcon from "../assets/chores.svg";
import travelIcon from "../assets/travel.svg";
import financeIcon from "../assets/finance.svg";
import learningIcon from "../assets/learning.svg";
import selfCareIcon from "../assets/self-care.svg";
import eventsIcon from "../assets/event.svg";

const colors = ["gray", "blue", "green", "purple", "yellow"];
const recurringOptions = ["None", "Daily", "Weekly", "Monthly"];

const categoryIcons = {
  None: null,
  Workout: workoutIcon,
  Meeting: meetingIcon,
  Study: studyIcon,
  Personal: personalIcon,
  Work: workIcon,
  Social: socialIcon,
  Family: familyIcon,
  Health: healthIcon,
  Hobby: hobbyIcon,
  Chores: choresIcon,
  Travel: travelIcon,
  Finance: financeIcon,
  Learning: learningIcon,
  "Self-care": selfCareIcon,
  Events: eventsIcon,
};

export default function EventModal() {
  const {
    savedEvents,
    setShowEventModal,
    selectedDay,
    dispatchEvent,
    selectedEvent,
    setSelectedEvent,
    timeStart,
    timeEnd,
    setTimeStart,
    setTimeEnd,
    categories,
    selectedCategory,
    setSelectedCategory,
  } = useContext(Context);
  const [title, setTitle] = useState(selectedEvent ? selectedEvent.title : "");
  const [description, setDescription] = useState(
    selectedEvent ? selectedEvent.description : ""
  );
  const [startTime, setStartTime] = useState(timeStart ? timeStart : "08:00");
  const [endTime, setEndTime] = useState(timeEnd ? timeEnd : "09:00");
  const [recurring, setRecurring] = useState("");
  const [location, setLocation] = useState(
    selectedEvent ? selectedEvent.location : ""
  );

  const [smallCalendar, setSmallCalendar] = useState(false);
  const [color, setColor] = useState(
    selectedEvent ? colors.find((col) => col === selectedEvent.label) : "gray"
  );
  const [error, setError] = useState(false);
  const inputRef = useRef(0);

  const [suggestions, setSuggestions] = useState([]);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);

  // Add state for dropdown
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate minimum duration
    const getMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    let finalStartTime = startTime;
    let finalEndTime = endTime;
    const duration = getMinutes(endTime) - getMinutes(startTime);

    if (duration < 15) {
      // Add minutes to end time to make it 15 minutes duration
      const startMinutes = getMinutes(startTime);
      const newEndMinutes = startMinutes + 15;
      const newEndHours = Math.floor(newEndMinutes / 60);
      const newEndMins = newEndMinutes % 60;

      finalEndTime = `${newEndHours.toString().padStart(2, "0")}:${newEndMins
        .toString()
        .padStart(2, "0")}`;
    }

    if (!title.trim()) {
      setError(true);
      inputRef.current?.focus();
      return;
    }

    try {
      const baseEvent = {
        title,
        description,
        label: color,
        timeStart: finalStartTime,
        timeEnd: finalEndTime,
        category: selectedCategory || "None",
        location, // Add this
      };

      if (recurring === "None" || recurring === "") {
        // Single event
        const event = {
          ...baseEvent,
          day: selectedDay.valueOf(),
          id: selectedEvent ? selectedEvent.id : undefined,
        };

        if (selectedEvent) {
          await dispatchEvent({ type: "update", payload: event });
        } else {
          await dispatchEvent({ type: "push", payload: event });
        }
      } else {
        // Recurring events
        const events = [];
        for (let i = 0; i < 5; i++) {
          let eventDate;
          switch (recurring) {
            case "Daily":
              eventDate = dayjs(selectedDay).add(i, "day");
              break;
            case "Weekly":
              eventDate = dayjs(selectedDay).add(i, "week");
              break;
            case "Monthly":
              eventDate = dayjs(selectedDay).add(i, "month");
              break;
            default:
              eventDate = selectedDay;
          }

          const event = {
            ...baseEvent,
            day: eventDate.valueOf(),
          };
          await dispatchEvent({ type: "push", payload: event });
        }
      }

      setSelectedEvent(null);
      setShowEventModal(false);
    } catch (error) {
      console.error("Failed to save event:", error);
      alert("Failed to save event. Please try again.");
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSmallCalendar(false);
  }, [selectedDay]);

  useEffect(() => {
    setTimeStart(startTime);
  }, [startTime, setTimeStart]);

  useEffect(() => {
    setTimeEnd(endTime);
  }, [endTime, setTimeEnd]);

  useEffect(() => {
    if (selectedEvent) {
      setSelectedCategory(selectedEvent.category);
    } else {
      setSelectedCategory("");
    }

    const handleKeyDown = (e) => {
      if (e.key === "Delete" && selectedEvent) {
        dispatchEvent({ type: "delete", payload: selectedEvent });
        setShowEventModal(false);
        setSelectedEvent(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedEvent,
    dispatchEvent,
    setShowEventModal,
    setSelectedEvent,
    setSelectedCategory,
  ]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle Escape key
      if (e.key === "Escape") {
        setShowEventModal(false);
        return;
      }

      if (!suggestions.length) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setCurrentSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "ArrowDown":
          e.preventDefault();
          setCurrentSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "Tab":
          e.preventDefault();
          if (suggestions[currentSuggestionIndex]) {
            setTitle(suggestions[currentSuggestionIndex].suggestedTitle);
            setSelectedCategory(suggestions[currentSuggestionIndex].category);
            setLocation(suggestions[currentSuggestionIndex].suggestedLocation);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    suggestions,
    currentSuggestionIndex,
    setTitle,
    selectedCategory,
    setSelectedCategory,
    setShowEventModal,
  ]);

  useEffect(() => {
    const getPastEvents = () => {
      if (!savedEvents || !selectedDay || !timeStart || !timeEnd) return;

      const getMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const selectedStartMinutes = getMinutes(timeStart);
      const selectedEndMinutes = getMinutes(timeEnd);

      const weekDay = selectedDay.day();
      const currentDate = selectedDay.format("YYYY-MM-DD");
      const oneMonthAgo = dayjs(currentDate)
        .subtract(1, "month")
        .format("YYYY-MM-DD");

      const pastEvents = savedEvents.filter((event) => {
        const eventDate = dayjs(event.day);
        const isBeforeToday = eventDate.isBefore(currentDate, "day");
        const isAfterOneMonthAgo = eventDate.isAfter(oneMonthAgo, "day");
        const isSameWeekDay = eventDate.day() === weekDay;

        const eventStartMinutes = getMinutes(event.timeStart);
        const eventEndMinutes = getMinutes(event.timeEnd);
        const hasTimeOverlap =
          (eventStartMinutes < selectedEndMinutes &&
            eventEndMinutes > selectedStartMinutes) ||
          (selectedStartMinutes < eventEndMinutes &&
            selectedEndMinutes > eventStartMinutes);

        return (
          isBeforeToday && isAfterOneMonthAgo && isSameWeekDay && hasTimeOverlap
        );
      });

      const eventsByCategory = pastEvents.reduce((acc, event) => {
        const category = event.category || "None";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(event);
        return acc;
      }, {});

      const categoryFrequency = Object.entries(eventsByCategory)
        .map(([category, events]) => {
          // Find the most common title pattern
          const titleCounts = events.reduce((acc, event) => {
            acc[event.title] = (acc[event.title] || 0) + 1;
            return acc;
          }, {});

          // Find the most common location pattern
          const locationCounts = events.reduce((acc, event) => {
            if (event.location) {
              acc[event.location] = (acc[event.location] || 0) + 1;
            }
            return acc;
          }, {});

          // Get the most frequent title and location
          const mostCommonTitle = Object.entries(titleCounts).sort(
            (a, b) => b[1] - a[1]
          )[0]?.[0];
          const mostCommonLocation = Object.entries(locationCounts).sort(
            (a, b) => b[1] - a[1]
          )[0]?.[0];

          return {
            category,
            count: events.length,
            suggestedTitle: mostCommonTitle || category,
            suggestedLocation: mostCommonLocation || "",
            events: events.sort(
              (a, b) => dayjs(b.day).valueOf() - dayjs(a.day).valueOf()
            ),
          };
        })
        .sort((a, b) => b.count - a.count);

      setSuggestions(categoryFrequency);
      setCurrentSuggestionIndex(0);
    };

    getPastEvents();
  }, [savedEvents, selectedDay, timeStart, timeEnd]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".category-select")) {
        setIsSelectOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex justify-center items-center z-20">
      {smallCalendar && <SmallCalendar />}
      <form
        name="eventModal"
        className="bg-white shadow-2xl w-[500px] rounded-md"
      >
        <header className="border-b-1 border-gray-200 px-4 py-4 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="font-medium text-xl">
              {selectedEvent ? "Update Event" : "Add Event"}
            </h1>
            <p>
              {selectedEvent
                ? "Fill in the data below to update the event"
                : "Fill in the data below to add an event"}
            </p>
          </div>
          <div>
            <button
              onClick={() => {
                setShowEventModal(false);
              }}
              className="cursor-pointer  ml-4 mr-2"
              type="button"
            >
              <img src={closeIcon} className="w-6" />
            </button>
          </div>
        </header>
        <div className="px-4 py-4">
          <div className="grid grid-cols-1/5 items-end gap-y-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                name="eventTitle"
                className={`${
                  error
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-200"
                } border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md`}
                placeholder={
                  suggestions.length > 0
                    ? `Suggestion: ${suggestions[currentSuggestionIndex].suggestedTitle}`
                    : "Add Title..."
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400 select-none">
                  <kbd className="px-2 py-1 bg-gray-100 rounded-md text-sm border border-gray-300">
                    ↑↓
                  </kbd>
                  <span className="text-sm">navigate</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded-md text-sm border border-gray-300">
                    Tab
                  </kbd>
                  <span className="text-sm">select</span>
                </div>
              )}
            </div>
            <div
              onClick={() => {
                setSmallCalendar(true);
              }}
              className="cursor-pointer py-2 px-4 flex border-1 border-gray-200 rounded-md"
            >
              <img src={calendar} className="w-6 mr-4" />
              <p>{selectedDay.format("dddd, MMMM DD")}</p>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="time"
                name="startTime"
                className="modalTime border-gray-200 border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <p>{"-"}</p>
              <input
                type="time"
                name="endTime"
                className="modalTime border-gray-200 border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full">
              <div className="flex-1">
                <div className="relative category-select">
                  {!selectedCategory && !categoryIcons[selectedCategory] && (
                    <img
                      src={categoryIcon}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6"
                      alt="category"
                    />
                  )}
                  <div
                    className={`border-gray-200 border-1 py-2 ${
                      !selectedCategory && !categoryIcons[selectedCategory]
                        ? "pl-9"
                        : "pl-4"
                    } pr-4 outline-0 w-full rounded-md cursor-pointer`}
                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                  >
                    <div className="flex items-center gap-2">
                      {selectedCategory && categoryIcons[selectedCategory] && (
                        <img
                          src={categoryIcons[selectedCategory]}
                          alt={selectedCategory}
                          className="w-5 h-5"
                        />
                      )}
                      {selectedCategory || "Select a category"}
                    </div>
                  </div>
                  {isSelectOpen && (
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto z-50">
                      {categories.map((category) => (
                        <div
                          key={category}
                          className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                            category === selectedCategory ? "bg-gray-50" : ""
                          }`}
                          onClick={() => {
                            setSelectedCategory(category);
                            setIsSelectOpen(false);
                          }}
                        >
                          {categoryIcons[category] && (
                            <img
                              src={categoryIcons[category]}
                              alt={category}
                              className="w-5 h-5"
                            />
                          )}
                          {category}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <img
                    src={recurringIcon}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6"
                    alt="recurring"
                  />
                  <select
                    name="recurring"
                    value={recurring}
                    onChange={(e) => setRecurring(e.target.value)}
                    className="border-gray-200 border-1 py-2 pl-9 pr-4 outline-0 w-full rounded-md "
                  >
                    <option value="" disabled hidden>
                      Add recurring
                    </option>
                    {recurringOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex border-gray-200 border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md">
              <img src={locationIcon} className="w-6 mr-4" />
              <input
                type="text"
                name="location"
                className="outline-0 w-full"
                placeholder={
                  suggestions.length > 0 &&
                  suggestions[currentSuggestionIndex].suggestedLocation
                    ? `Suggestion: ${suggestions[currentSuggestionIndex].suggestedLocation}`
                    : "Add Location..."
                }
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                autoComplete="off"
              />
            </div>
            <input
              type="text"
              name="description"
              className="border-gray-200 border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md"
              placeholder="Add Description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <footer className="flex justify-between items-center border-t-1 border-gray-200 px-4 py-4">
          <div className="flex gap-x-2">
            {colors.map((col, index) => (
              <span
                key={index}
                onClick={() => setColor(col)}
                className={`${
                  col === "blue"
                    ? "blue-bg border-2 border-blue-500"
                    : col === "gray"
                    ? "gray-bg border-2 border-gray-500"
                    : col === "green"
                    ? "green-bg border-2 border-green-500"
                    : col === "purple"
                    ? "purple-bg border-2 border-purple-500"
                    : "yellow-bg  border-2 border-yellow-500"
                } w-5 h-5 rounded-full flex items-center justify-center cursor-pointer`}
              >
                {col === color && (
                  <span className="bg-white w-4 h-4 rounded-full flex items-center justify-center"></span>
                )}
              </span>
            ))}
          </div>
          <div className="flex">
            {selectedEvent ? (
              <button
                onClick={() => {
                  setShowEventModal(false);
                  dispatchEvent({ type: "delete", payload: selectedEvent });
                }}
                className="transition-all border-gray-200 rounded-md mr-4 hover:bg-gray-100 border w-10 h-10 cursor-pointer"
                type="button"
              >
                <img src={deleteIcon} className="w-6 mx-auto" />
              </button>
            ) : (
              ""
            )}
            <button
              onClick={() => {
                setShowEventModal(false);
              }}
              className="transition-all  hover:bg-gray-100 cursor-pointer border w-28 h-10 border-gray-200 rounded-md mr-4"
              type="button"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="transition-all  flex items-center justify-center hover:bg-gray-700 text-white bg-black cursor-pointer border w-28 h-10 border-gray-200 rounded-md"
            >
              <img src={saveIcon} className="w-5 mr-2" />
              <p>Save</p>
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

import React, { useContext, useEffect, useRef, useState } from "react";
import Context from "../context/Context";
import closeIcon from "../assets/close_icon.svg";
import deleteIcon from "../assets/delete_icon.svg";
import calendar from "../assets/calendar.svg";
import dayjs from "dayjs";
import saveIcon from "../assets/save.svg";
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
import clockIcon from "../assets/clock.svg";
import eventsIcon from "../assets/event.svg";
import otherIcon from "../assets/other.svg";
import { categoryColors } from "../utils/categoryColors";

const categoryIcons = {
  Other: otherIcon,
  Work: workIcon,
  Education: learningIcon,
  "Health & Wellness": healthIcon,
  "Finance & Bills": financeIcon,
  "Social & Family": socialIcon,
  "Travel & Commute": travelIcon,
  "Personal Tasks": personalIcon,
  "Leisure & Hobbies": hobbyIcon,
};

const reminderOptions = [
  { label: "No reminder", value: 0 },
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "2 hours before", value: 120 },
];

export default function EventModal() {
  const {
    savedEvents,
    setShowEventModal,
    selectedDay,
    setSelectedDay,
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
  const [location, setLocation] = useState(
    selectedEvent ? selectedEvent.location : ""
  );
  const [error, setError] = useState(false);
  const inputRef = useRef(0);
  const modalRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    selectedDay
      ? selectedDay.format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD")
  );
  const [isVisible, setIsVisible] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(
    selectedEvent ? selectedEvent.reminderEnabled : false
  );
  const [reminderTime, setReminderTime] = useState(
    selectedEvent ? selectedEvent.reminderTime : 15
  );
  const [isReminderSelectOpen, setIsReminderSelectOpen] = useState(false);

  useEffect(() => {
    // Trigger enter animation on mount
    setIsVisible(true);

    return () => {
      // Clean up not needed here since component unmounts
    };
  }, []);

  const closeWithAnimation = () => {
    setShowEventModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const getMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    let finalStartTime = startTime;
    let finalEndTime = endTime;
    const duration = getMinutes(endTime) - getMinutes(startTime);

    if (duration < 15) {
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
        timeStart: finalStartTime,
        timeEnd: finalEndTime,
        category: selectedCategory || "Other", // Changed from "None" to "Other"
        location,
        reminderEnabled,
        reminderTime,
      };

      const event = {
        ...baseEvent,
        day: dayjs(selectedDate).valueOf(),
        id: selectedEvent ? selectedEvent.id : undefined,
      };

      if (selectedEvent) {
        await dispatchEvent({ type: "update", payload: event });
      } else {
        await dispatchEvent({ type: "push", payload: event });
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
      if (!savedEvents || !selectedDate || !timeStart || !timeEnd) return;

      const getMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const selectedStartMinutes = getMinutes(timeStart);
      const selectedEndMinutes = getMinutes(timeEnd);

      const weekDay = dayjs(selectedDate).day();
      const currentDate = dayjs(selectedDate).format("YYYY-MM-DD");
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
          const titleCounts = events.reduce((acc, event) => {
            acc[event.title] = (acc[event.title] || 0) + 1;
            return acc;
          }, {});

          const locationCounts = events.reduce((acc, event) => {
            if (event.location) {
              acc[event.location] = (acc[event.location] || 0) + 1;
            }
            return acc;
          }, {});

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
  }, [savedEvents, selectedDate, timeStart, timeEnd]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".category-select")) {
        setIsSelectOpen(false);
      }
      if (!e.target.closest(".reminder-select")) {
        setIsReminderSelectOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowEventModal(false);
        setIsSelectOpen(false);
        setIsReminderSelectOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowEventModal]);

  const handleDateChange = (e) => {
    const newDate = dayjs(e.target.value);
    setSelectedDate(e.target.value);
    setSelectedDay(newDate);
  };

  return (
    <div className="fixed inset-0 bg-opacity-0 flex justify-center items-center z-40">
      <form
        name="eventModal"
        className={`bg-white border shadow-xl border-gray-200 w-[400px] rounded-3xl relative transform transition-all duration-100 ease-out ${
          isVisible ? "scale-100 " : "scale-97"
        }`}
        ref={modalRef}
      >
        <header className="border-b-1 border-gray-200 h-14 flex justify-between items-center">
          <h1 className="ml-4 text-lg">
            {selectedEvent ? "Update Event" : "Add Event"}
          </h1>
          <div className="flex items-center">
            <button
              onClick={closeWithAnimation}
              className="cursor-pointer mr-4"
              type="button"
            >
              <img src={closeIcon} className="w-5" />
            </button>
          </div>
        </header>
        <div className="">
          <div className="grid grid-cols-1/5 items-end">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                name="eventTitle"
                className={` ${
                  error
                    ? " border-red-500 focus:border-red-500"
                    : " border-gray-200"
                } border-b-1 px-4 h-12 outline-0 w-full`}
                placeholder="Add Title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400 select-none">
                {suggestions.length > 0 && (
                  <>
                    <div className="flex gap-2 items-center">
                      <kbd className="px-2 py-1 bg-gray-100 rounded-sm text-sm border border-gray-300">
                        ↑↓
                      </kbd>
                      <span className="text-sm">navigate</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <kbd className="px-2 py-1 bg-gray-100 rounded-sm text-sm border border-gray-300">
                        Tab
                      </kbd>
                      <span className="text-sm">select</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type="date"
                name="eventDate"
                value={selectedDate}
                onChange={handleDateChange}
                className="modalDay relative border-b-1 border-gray-200 h-12 py-0 pl-10 pr-2 outline-0 w-full cursor-pointer"
              />
              <p className="absolute right-4 top-4 text-sm text-gray-500 ml-2 z-6">
                {dayjs(selectedDate).format("dddd, MMMM DD")}
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="time"
                name="startTime"
                className="relative h-12 modalTime border-gray-200 border-b-1 py-1 px-2 outline-0   w-full"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <div className="h-12 border-r-1 border-gray-200"></div>
              <input
                type="time"
                name="endTime"
                className="relative h-12 modalTime border-gray-200 border-b-1 py-1 px-2 outline-0 w-full"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="flex w-full">
              <div className="flex-1 h-12">
                <div className="relative category-select h-full">
                  {!selectedCategory && !categoryIcons[selectedCategory] && (
                    <img
                      src={categoryIcon}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                      alt="category"
                    />
                  )}
                  <div
                    className={`h-full border-gray-200 border-b-1 py-1 ${
                      !selectedCategory && !categoryIcons[selectedCategory]
                        ? "pl-10"
                        : "pl-4"
                    } pr-4 outline-0 w-full`}
                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                  >
                    <div className="h-full flex items-center gap-2">
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
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-2xl shadow-custom max-h-60 overflow-y-auto z-50">
                      {categories.map((category) => (
                        <div
                          key={category}
                          className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer ${
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
                <div className="relative h-12 border-l-1 border-gray-200">
                  <div className="relative reminder-select h-full">
                    <img
                      src={clockIcon}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                      alt="reminder"
                    />
                    <div
                      className="h-full border-gray-200 border-b-1 py-1 pl-10 pr-4 outline-0 w-full"
                      onClick={() =>
                        setIsReminderSelectOpen(!isReminderSelectOpen)
                      }
                    >
                      <div className="h-full flex items-center">
                        {reminderEnabled
                          ? reminderOptions.find(
                              (opt) => opt.value === reminderTime
                            )?.label
                          : "No reminder"}
                      </div>
                    </div>
                    {isReminderSelectOpen && (
                      <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-2xl shadow-custom max-h-60 overflow-y-auto z-50">
                        {reminderOptions.map((option) => (
                          <div
                            key={option.value}
                            className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                              (reminderEnabled &&
                                option.value === reminderTime) ||
                              (!reminderEnabled && option.value === 0)
                                ? "bg-gray-50"
                                : ""
                            }`}
                            onClick={() => {
                              setReminderTime(option.value);
                              setReminderEnabled(option.value > 0);
                              setIsReminderSelectOpen(false);
                            }}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex h-12 border-gray-200 border-b-1 py-1 px-4 outline-0 pt-3text-xl w-full">
              <img src={locationIcon} className="w-4 mr-2" />
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
              className="h-12 border-gray-200 border-b-1 py-1 px-4 outline-0  w-full"
              placeholder="Add Description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <footer className="flex justify-end items-center h-14">
          <div className="flex">
            {selectedEvent ? (
              <button
                onClick={() => {
                  setShowEventModal(false);
                  dispatchEvent({ type: "delete", payload: selectedEvent });
                }}
                className="transition-all border-gray-200 rounded-full mr-2 shadow-custom active:bg-gray-50 border w-10 h-10 cursor-pointer"
                type="button"
              >
                <img src={deleteIcon} className="w-4 mx-auto" />
              </button>
            ) : (
              ""
            )}
            <button
              onClick={closeWithAnimation}
              className="transition-all  active:bg-gray-50 cursor-pointer border px-4 h-10 shadow-custom border-gray-200 rounded-full mr-2"
              type="button"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="transition-all  flex items-center justify-center active:bg-gray-700 shadow-custom text-white bg-black cursor-pointer px-4 h-10  rounded-full mr-2"
            >
              <img src={saveIcon} className="w-4 mr-2" />
              <p>Save</p>
            </button>
          </div>
        </footer>

        {suggestions.length > 0 && (
          <div className="absolute  left-full top-0 max-w-xs w-50 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.category}-${suggestion.suggestedTitle}`}
                  className={`overflow-clip px-3 py-1 ml-2 shadow-xl mr-4 mt-2 ${
                    index === suggestions.length - 1 ? "mb-10" : ""
                  }  border  rounded-xl cursor-pointer transition-all ${
                    index === currentSuggestionIndex
                      ? "bg-black border-black"
                      : "bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => {
                    setCurrentSuggestionIndex(index);
                    setTitle(suggestion.suggestedTitle);
                    setSelectedCategory(suggestion.category);
                    setLocation(suggestion.suggestedLocation);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {categoryIcons[suggestion.category] && (
                      <img
                        src={categoryIcons[suggestion.category]}
                        alt={suggestion.category}
                        className={`w-4 h-4`}
                      />
                    )}
                    <span
                      className={`font-medium ${
                        index === currentSuggestionIndex
                          ? "text-white"
                          : "text-black"
                      }  text-shadow-white`}
                    >
                      {suggestion.suggestedTitle}
                    </span>
                  </div>
                  <div
                    className={`text-xxs mt-1 ${
                      index === currentSuggestionIndex
                        ? "text-white"
                        : "text-black"
                    }`}
                  >
                    <div className={`flex items-center gap-1`}>
                      <span
                        className={`text-xxs ${
                          index === currentSuggestionIndex
                            ? "text-white"
                            : "text-black"
                        } text-shadow-white`}
                      >
                        Category:
                      </span>
                      <span
                        className={`font-medium text-xxs ${
                          index === currentSuggestionIndex
                            ? "text-white"
                            : "text-black"
                        } text-shadow-white`}
                      >
                        {suggestion.category}
                      </span>
                    </div>
                    {suggestion.suggestedLocation && (
                      <div className={`flex items-center gap-1 mt-1`}>
                        <img
                          src={locationIcon}
                          className={`w-3 h-3  ${
                            index === currentSuggestionIndex
                              ? "alter invert"
                              : ""
                          }`}
                        />
                        <span
                          className={`text-xxs ${
                            index === currentSuggestionIndex
                              ? "text-white"
                              : "text-black"
                          } text-shadow-white`}
                        >
                          {suggestion.suggestedLocation}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

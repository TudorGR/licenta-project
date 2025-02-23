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

const colors = ["gray", "blue", "green", "purple", "yellow"];
const recurringOptions = ["None", "Daily", "Weekly", "Monthly"];

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

  const [smallCalendar, setSmallCalendar] = useState(false);
  const [color, setColor] = useState(
    selectedEvent ? colors.find((col) => col === selectedEvent.label) : "gray"
  );
  const [error, setError] = useState(false);
  const inputRef = useRef(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        timeStart,
        timeEnd,
        category: selectedCategory || "None",
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
        for (let i = 0; i < 10; i++) {
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

      const pastEvents = savedEvents.filter((event) => {
        const eventDate = dayjs(event.day);
        const isBeforeToday = eventDate.isBefore(currentDate, "day");
        const isSameWeekDay = eventDate.day() === weekDay;

        const eventStartMinutes = getMinutes(event.timeStart);
        const eventEndMinutes = getMinutes(event.timeEnd);
        const hasTimeOverlap =
          (eventStartMinutes < selectedEndMinutes &&
            eventEndMinutes > selectedStartMinutes) ||
          (selectedStartMinutes < eventEndMinutes &&
            selectedEndMinutes > eventStartMinutes);

        return isBeforeToday && isSameWeekDay && hasTimeOverlap;
      });

      // Group events by category
      const eventsByCategory = pastEvents.reduce((acc, event) => {
        const category = event.category || "None";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(event);
        return acc;
      }, {});

      // Calculate frequency and sort categories
      const categoryFrequency = Object.entries(eventsByCategory)
        .map(([category, events]) => ({
          category,
          count: events.length,
          events: events.sort(
            (a, b) => dayjs(b.day).valueOf() - dayjs(a.day).valueOf()
          ),
        }))
        .sort((a, b) => b.count - a.count); // Sort by frequency

      console.log(
        `Past events on ${selectedDay.format(
          "dddd"
        )}s between ${timeStart}-${timeEnd}:`
      );

      categoryFrequency.forEach(({ category, count, events }) => {
        console.log(
          `\n[${category}] - ${count} occurrence${count > 1 ? "s" : ""}:`
        );
        events.forEach((event) => {
          console.log(
            `- ${event.title} (${event.timeStart}-${event.timeEnd}) [${dayjs(
              event.day
            ).format("MMM D, YYYY")}]`
          );
        });
      });
    };

    getPastEvents();
  }, [savedEvents, selectedDay, timeStart, timeEnd]);

  return (
    <div className="z-20 h-screen w-full fixed left-0 top-0 flex justify-center items-center">
      {smallCalendar && <SmallCalendar />}
      <form
        name="eventModal"
        className=" bg-white shadow-2xl w-[500px] rounded-md"
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
            <input
              ref={inputRef}
              type="text"
              name="eventTitle"
              className={`${
                error
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-200"
              } border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md`}
              placeholder="Add Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
            />
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
                className="border-gray-200 border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <p>{"-"}</p>
              <input
                type="time"
                name="endTime"
                className="border-gray-200 border-1 py-2 px-4 outline-0 pt-3text-xl pb-2 w-full rounded-md"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full">
              <div className="flex-1">
                <div className="relative">
                  <img
                    src={categoryIcon}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    alt="category"
                  />
                  <select
                    name="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className=" border-gray-200 border-1 py-2 pl-9 pr-4 outline-0 w-full rounded-md"
                  >
                    <option value="" disabled hidden>
                      Select a category
                    </option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <img
                    src={recurringIcon}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
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
                  <span className="bg-white w-3 h-3 rounded-full flex items-center justify-center"></span>
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

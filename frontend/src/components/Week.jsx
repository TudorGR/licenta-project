import React, { useEffect, useRef, useContext, useState, useMemo } from "react";
import DayWeek from "./DayWeek";
import dayjs from "dayjs";
import Context from "../context/Context.js";

const TIME_SLOT_HEIGHT = 50;

const calculateTimePosition = () => {
  const now = dayjs();
  const minutes = now.hour() * 60 + now.minute();
  return (minutes / 60) * TIME_SLOT_HEIGHT;
};

const Week = ({ month, weekIndex }) => {
  const { showHeatmap, dispatchEvent, selectedDate } = useContext(Context);
  const timeGridRef = useRef(null);

  // Calculate week based on selectedDate
  const week = useMemo(() => {
    const startOfWeek = selectedDate.startOf("isoWeek");
    return Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, "day"));
  }, [selectedDate]);

  // Add state for cross-day dragging
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(null);

  // Add this state
  const [currentTime, setCurrentTime] = useState(calculateTimePosition());

  // Function to start dragging an event
  const handleStartEventDrag = (event, offset, dayIndex) => {
    setDraggedEvent(event);
    setDragOffset(offset);
    setIsDraggingEvent(true);
    setCurrentDayIndex(dayIndex);
  };

  // Function to update during drag
  const handleEventDrag = (e, timeString, dayIndex) => {
    if (!isDraggingEvent || !draggedEvent) return;

    // Only update if we've moved to a different day
    if (dayIndex !== currentDayIndex) {
      setCurrentDayIndex(dayIndex);
    }

    setDraggedEvent((prev) => ({
      ...prev,
      timeStart: timeString,
      // Calculate end time based on event duration
      timeEnd: calculateNewEndTime(timeString, prev),
    }));
  };

  // Function to calculate new end time based on event duration
  const calculateNewEndTime = (newStartTime, event) => {
    const getTimeSlot = (time) => {
      const [hour, minute] = time.split(":");
      return parseInt(hour) * 60 + parseInt(minute);
    };

    const eventDuration =
      getTimeSlot(event.timeEnd) - getTimeSlot(event.timeStart);
    const [startHour, startMin] = newStartTime.split(":").map(Number);

    const totalMins = startHour * 60 + startMin + eventDuration;
    const endHours = Math.floor(totalMins / 60);
    const endMins = totalMins % 60;

    return `${endHours.toString().padStart(2, "0")}:${endMins
      .toString()
      .padStart(2, "0")}`;
  };

  // Function to end dragging and update event
  const handleEventDragEnd = () => {
    if (draggedEvent && isDraggingEvent) {
      // Calculate new day timestamp based on currentDayIndex
      const newDay = week[currentDayIndex].valueOf();

      const updatedEvent = {
        ...draggedEvent,
        day: newDay, // Update the day timestamp
      };

      // Dispatch update to save changes
      dispatchEvent({
        type: "update",
        payload: updatedEvent,
      });
    }

    // Reset dragging state
    setDraggedEvent(null);
    setIsDraggingEvent(false);
    setCurrentDayIndex(null);
  };

  useEffect(() => {
    if (timeGridRef.current) {
      const middayPosition = 12 * TIME_SLOT_HEIGHT - 600 / 2;
      timeGridRef.current.scrollTop = middayPosition;
    }
  }, []);

  useEffect(() => {
    if (!isDraggingEvent) return;

    const handleDocumentMouseMove = (e) => {
      // Find which day column the mouse is over
      const columns = document.querySelectorAll(".calendar-day");
      for (let i = 0; i < columns.length; i++) {
        const rect = columns[i].getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          // Get time from y position
          const relativeY = e.clientY - rect.top;

          // Adjust position by the drag offset
          const adjustedY = relativeY - dragOffset.y;

          const minutes = (adjustedY / TIME_SLOT_HEIGHT) * 60;

          // Calculate hours and snap minutes to the nearest 15-minute interval
          const hours = Math.floor(minutes / 60) - 1;
          const mins = Math.round((minutes % 60) / 15) * 15;

          // Ensure values are within valid range
          const validHours = Math.max(0, Math.min(23, hours));
          const validMins = mins === 60 ? 0 : mins; // Reset to 0 if minutes reach 60
          const adjustedHours = mins === 60 ? validHours + 1 : validHours; // Increment hour if minutes reach 60

          const timeString = `${adjustedHours
            .toString()
            .padStart(2, "0")}:${validMins.toString().padStart(2, "0")}`;

          // Update with the day index and time
          handleEventDrag(e, timeString, i);
          break;
        }
      }
    };

    const handleDocumentMouseUp = () => {
      handleEventDragEnd();
    };

    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [isDraggingEvent, draggedEvent]);

  // Add this effect
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(calculateTimePosition());
    };

    updateTime();
    const interval = setInterval(updateTime, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={timeGridRef} className="w-full overflow-y-auto">
      <div
        className="grid w-full"
        style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
      >
        <div className="relative mt-12">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="absolute text-xs text-gray-300"
              style={{
                top: `${i * TIME_SLOT_HEIGHT}px`,
                transform: "translateY(-60%)",
                right: "0",
                background: "white",
                width: "100%",
                textAlign: "center",
              }}
            >
              {`${i.toString().padStart(2, "0")}:00`}
            </div>
          ))}
          <div className="sticky top-0 z-13 mt-[-48px] w-full h-[45px] bg-gradient-to-b from-white to-transparent"></div>
          <div
            className="absolute text-xs font-medium"
            style={{
              top: `${currentTime}px`, // Use state instead of calculateTimePosition()
              transform: "translateY(-55%)",
              right: "0",
              width: "100%",
              textAlign: "center",
              zIndex: 12,
            }}
          >
            {dayjs().format("HH:mm")}
          </div>
        </div>
        {week.map((day, i) => (
          <DayWeek
            key={i}
            day={day}
            index={weekIndex}
            dayIndex={i}
            isDraggingAcrossDays={isDraggingEvent}
            draggedEvent={draggedEvent}
            currentDragDayIndex={currentDayIndex}
            onStartEventDrag={handleStartEventDrag}
            onEventDrag={handleEventDrag}
            onEventDragEnd={handleEventDragEnd}
          />
        ))}
      </div>
    </div>
  );
};

export default Week;

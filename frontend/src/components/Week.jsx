import React, { useEffect, useRef, useContext, useState } from "react";
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
  const { showHeatmap, dispatchEvent } = useContext(Context);
  if (!month || !month[weekIndex]) return null;
  const week = month[weekIndex];
  const timeGridRef = useRef(null);

  // Add state for cross-day dragging
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(null);

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
          const minutes = (relativeY / TIME_SLOT_HEIGHT) * 60;
          const hours = Math.floor(minutes / 60);
          const mins = Math.round((minutes % 60) / 15) * 15;

          const timeString = `${hours.toString().padStart(2, "0")}:${mins
            .toString()
            .padStart(2, "0")}`;

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

  return (
    <div ref={timeGridRef} className="w-full overflow-y-auto">
      <div
        className="grid border-b w-full"
        style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
      >
        <div className="relative mt-12">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="absolute text-xs text-gray-300"
              style={{
                top: `${i * TIME_SLOT_HEIGHT}px`,
                transform: "translateY(-55%)",
                right: "0",
                background: "white",
                width: "100%",
                textAlign: "center",
              }}
            >
              {`${i.toString().padStart(2, "0")}:00`}
            </div>
          ))}

          <div className="sticky top-0 mt-[-48px] w-full h-[45px] border-b-1 border-b-gray-100 bg-white"></div>
          <div
            className="absolute text-xs rounded-xl bg-blue-500 text-white"
            style={{
              top: `${calculateTimePosition()}px`,
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

      {/* Visual overlay for drag event if needed */}
      {isDraggingEvent && draggedEvent && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            // Position with the mouse
            left: "0",
            top: "0",
            width: "100%",
            height: "100%",
          }}
        />
      )}
    </div>
  );
};

export default Week;

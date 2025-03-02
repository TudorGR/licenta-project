import express from "express";
import dayjs from "dayjs";

const router = express.Router();

function checkOverlap(event, existingEvents) {
  const eventStart = getMinutes(event.timeStart);
  const eventEnd = getMinutes(event.timeEnd);

  return existingEvents.some((otherEvent) => {
    // Skip if it's the same event or if the other event is not locked
    if (otherEvent.id === event.id || !otherEvent.locked) return false;

    const otherStart = getMinutes(otherEvent.timeStart);
    const otherEnd = getMinutes(otherEvent.timeEnd);

    return eventStart < otherEnd && eventEnd > otherStart;
  });
}

function getMinutes(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

router.post("/", async (req, res) => {
  try {
    const { events, timeChange, category } = req.body;

    // Get study events and sort them by start time
    const studyEvents = events
      .filter((event) => event.category === category)
      .sort((a, b) => {
        const aStart = getMinutes(a.timeStart);
        const bStart = getMinutes(b.timeStart);
        return aStart - bStart;
      });

    console.log("Study events to process:", studyEvents.length);

    // Try to increase each study event in order
    let increased = false;
    const modifiedEvents = [...events]; // Create a copy of all events

    for (const studyEvent of studyEvents) {
      if (increased) break; // Stop after first successful increase

      // Parse times
      const [endHour, endMin] = studyEvent.timeEnd.split(":").map(Number);
      let endTime = dayjs().hour(endHour).minute(endMin);

      // Calculate new end time
      const newEndTime = endTime.add(timeChange, "minute");

      // Create temporary event to check for overlaps
      const tempEvent = {
        ...studyEvent,
        timeEnd: newEndTime.format("HH:mm"),
      };

      // Check if modification would cause overlap
      if (!checkOverlap(tempEvent, events)) {
        // No overlap - update the event
        console.log(`Successfully increasing event ${studyEvent.id}`);

        // Handle midnight boundary
        if (newEndTime.hour() < endTime.hour()) {
          endTime = dayjs().hour(23).minute(59);
        } else {
          endTime = newEndTime;
        }

        // Update the event in our modified array
        const index = modifiedEvents.findIndex((e) => e.id === studyEvent.id);
        modifiedEvents[index] = {
          ...studyEvent,
          timeEnd: endTime.format("HH:mm"),
        };

        increased = true; // Mark that we've increased an event
      } else {
        console.log(
          `Overlap detected for event ${studyEvent.id}, trying next event`
        );
      }
    }

    if (!increased) {
      console.log("Could not increase any events due to overlaps");
    }

    res.status(200).json(modifiedEvents);
  } catch (error) {
    console.error("Error modifying events:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

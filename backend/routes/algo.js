import express from "express";
import dayjs from "dayjs";
import { Op } from "sequelize";
import Event from "../models/Event.js";

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

// Add new endpoint to get learned parameters
router.get("/learn", async (req, res) => {
  try {
    // Get date range for last 3 months
    const today = dayjs();
    const threeMonthsAgo = today.subtract(3, "month");

    // Fetch all events from last 3 months
    const events = await Event.findAll({
      where: {
        day: {
          [Op.between]: [threeMonthsAgo.valueOf(), today.valueOf()],
        },
      },
    });

    // Add debug logging
    console.log(`Found ${events.length} events for analysis`);

    // Group events by category and day of week
    const categoryAnalysis = {};

    events.forEach((event) => {
      const category = event.category || "None";
      const dayOfWeek = dayjs(parseInt(event.day)).day();
      const startMinutes = getMinutesFromTime(event.timeStart);
      const endMinutes = getMinutesFromTime(event.timeEnd);
      const duration = endMinutes - startMinutes;

      // Initialize category if not exists
      if (!categoryAnalysis[category]) {
        categoryAnalysis[category] = {
          byDay: Array(7)
            .fill()
            .map(() => ({
              timeSlots: Array(24).fill(0),
              commonTimeRanges: [],
            })),
          globalStats: {
            minDuration: Infinity,
            maxDuration: 0,
            averageDuration: 0,
            totalEvents: 0,
          },
        };
      }

      // Update timeSlots
      const hourStart = Math.floor(startMinutes / 60);
      const hourEnd = Math.ceil(endMinutes / 60);
      for (let hour = hourStart; hour < hourEnd; hour++) {
        if (hour < 24) {
          // Prevent array out of bounds
          categoryAnalysis[category].byDay[dayOfWeek].timeSlots[hour]++;
        }
      }

      // Update global stats
      categoryAnalysis[category].globalStats.minDuration = Math.min(
        categoryAnalysis[category].globalStats.minDuration,
        duration
      );
      categoryAnalysis[category].globalStats.maxDuration = Math.max(
        categoryAnalysis[category].globalStats.maxDuration,
        duration
      );
      categoryAnalysis[category].globalStats.totalEvents++;
    });

    // Process common time ranges
    Object.keys(categoryAnalysis).forEach((category) => {
      categoryAnalysis[category].byDay.forEach((day) => {
        day.commonTimeRanges = findCommonTimeRanges(day.timeSlots);
      });

      // Calculate average duration
      const stats = categoryAnalysis[category].globalStats;
      if (stats.totalEvents > 0) {
        stats.averageDuration = Math.round(
          (stats.maxDuration + stats.minDuration) / 2
        );
      }
    });

    // Add debug logging
    console.log("Analysis results:", JSON.stringify(categoryAnalysis, null, 2));

    res.json(categoryAnalysis);
  } catch (error) {
    console.error("Error analyzing events:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function getMinutesFromTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function findCommonTimeRanges(timeSlots) {
  const threshold = Math.max(...timeSlots) / 2; // 50% of max frequency
  const ranges = [];
  let start = null;

  timeSlots.forEach((count, hour) => {
    if (count >= threshold) {
      if (start === null) start = hour;
    } else if (start !== null) {
      ranges.push({
        start: `${start.toString().padStart(2, "0")}:00`,
        end: `${hour.toString().padStart(2, "0")}:00`,
        frequency:
          Math.round(
            (timeSlots.slice(start, hour).reduce((a, b) => a + b, 0) /
              (hour - start)) *
              100
          ) / 100,
      });
      start = null;
    }
  });

  // Handle range that ends at last hour
  if (start !== null) {
    ranges.push({
      start: `${start.toString().padStart(2, "0")}:00`,
      end: "24:00",
      frequency:
        Math.round(
          (timeSlots.slice(start).reduce((a, b) => a + b, 0) / (24 - start)) *
            100
        ) / 100,
    });
  }

  return ranges;
}

export default router;

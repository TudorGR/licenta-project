import express from "express";
import Event from "../models/Event.js";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/isoWeek.js";
import { Op } from "sequelize";
import axios from "axios";
import dotenv from "dotenv";
import { authMiddleware } from "../middleware/auth.js";
dotenv.config();

// Extend dayjs with the weekOfYear plugin
dayjs.extend(weekOfYear);

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const router = express.Router();

// Apply auth middleware to protect event routes
router.use(authMiddleware);

// Get all events for the authenticated user
router.get("/", async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { userId: req.user.userId },
    });
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new event (attach userId)
router.post("/", async (req, res) => {
  try {
    const newEvent = {
      ...req.body,
      userId: req.user.userId,
    };
    const event = await Event.create(newEvent);
    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update routes to check ownership
router.put("/:id", async (req, res) => {
  try {
    const event = await Event.findOne({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found or unauthorized" });
    }

    await event.update(req.body);
    res.json(event);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const event = await Event.findOne({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found or unauthorized" });
    }

    await event.destroy();
    res.json({ message: "Event deleted" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new route to toggle lock status
router.patch("/:id/lock", async (req, res) => {
  try {
    const event = await Event.findOne({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
    });
    if (event) {
      const updatedEvent = await event.update({
        locked: !event.locked,
      });
      res.json(updatedEvent);
    } else {
      res.status(404).json({ error: "Event not found or unauthorized" });
    }
  } catch (error) {
    console.error("Error updating event lock:", error);
    res.status(400).json({ error: error.message });
  }
});

// Add this new route
router.get("/past-events", async (req, res) => {
  try {
    const today = dayjs();
    const threeMonthsAgo = today.subtract(3, "month");

    const pastEvents = await Event.findAll({
      where: {
        day: {
          [Op.between]: [threeMonthsAgo.valueOf(), today.valueOf()],
        },
        userId: req.user.userId,
      },
      order: [["day", "ASC"]],
    });

    // Initialize weeks array
    const weeks = [];
    let currentWeek = Array(7)
      .fill()
      .map(() => []); // Array of 7 empty arrays
    let currentWeekNum = null;

    // Group events by weeks
    pastEvents.forEach((event) => {
      const eventDate = dayjs(parseInt(event.day));
      const weekNum = eventDate.isoWeek();

      if (weekNum !== currentWeekNum) {
        if (currentWeekNum !== null) {
          weeks.push(currentWeek);
        }
        currentWeek = Array(7)
          .fill()
          .map(() => []); // Reset to new array of empty arrays
        currentWeekNum = weekNum;
      }

      // Add event to appropriate day array in current week
      const dayIndex = eventDate.day();
      currentWeek[dayIndex].push(event);
    });

    // Add last week if it has any events
    if (currentWeek.some((dayEvents) => dayEvents.length > 0)) {
      weeks.push(currentWeek);
    }

    res.json(weeks);
  } catch (error) {
    console.error("Error fetching past events:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update the resolve-overlap endpoint's response to include toast message data
router.post("/resolve-overlap", async (req, res) => {
  try {
    const {
      dayOfWeek,
      eventsForDay,
      frequencyVectors,
      generalFrequencyVectors,
      movedEvent,
    } = req.body;

    if (!movedEvent || !movedEvent.id) {
      return res.status(400).json({
        error: "Invalid movedEvent. Ensure it is included in the request body.",
      });
    }

    const simplifiedEvents = eventsForDay.map((event) => ({
      id: event.id,
      category: event.category || "None",
      timeStart: event.timeStart,
      timeEnd: event.timeEnd,
      locked: !!event.locked,
    }));

    const relevantCategories = new Set(simplifiedEvents.map((e) => e.category));
    const optimizedFreqVectors = {};
    const optimizedGeneralFreqVectors = {};

    relevantCategories.forEach((category) => {
      if (frequencyVectors[category]) {
        optimizedFreqVectors[category] = frequencyVectors[category];
      }
      if (generalFrequencyVectors[category]) {
        optimizedGeneralFreqVectors[category] =
          generalFrequencyVectors[category];
      }
    });

    const prompt = `## Calendar Schedule Optimization Task

    Input:
    - Day: ${dayOfWeek}
    - Events: ${JSON.stringify(simplifiedEvents, null, 2)}
    - Day-specific frequency patterns: ${JSON.stringify(
      optimizedFreqVectors,
      null,
      2
    )}
    - General frequency patterns: ${JSON.stringify(
      optimizedGeneralFreqVectors,
      null,
      2
    )}
    - Manually moved event ID: ${movedEvent.id}
    
    Core Requirements:
    1. Your HIGHEST priority is to eliminate ALL event overlaps
    2. Don't write any code
    3. Locked events (locked:true) must remain at their exact times
    4. Don't change the duration of events
    5. Place events during times when that category is typically scheduled according to frequency patterns
    6. Make minimal changes to the original schedule
    
    Using Frequency Patterns:
    - The frequency vectors show when each category is typically scheduled (higher numbers = more common)
    - Try to schedule events in time slots with higher frequency values for their category
    - Day-specific patterns take precedence over general patterns
    
    Output Instructions:
    - Return a JSON array containing ONLY modified events
    - Format: [{"id": "event-id", "timeStart": "HH:MM", "timeEnd": "HH:MM"}, ...]
    - Use 24-hour time format (e.g., "14:30")
    - If conflict resolution is impossible, return an empty array []
    
    Example output:
    \`\`\`json
    [
      {"id": "123", "timeStart": "09:00", "timeEnd": "10:00"},
      {"id": "456", "timeStart": "10:30", "timeEnd": "11:30"}
    ]
    \`\`\``;

    // Call Groq API
    const groqResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama3-70b-8192",
    });

    const aiResponse = groqResponse.choices[0]?.message?.content;

    if (!aiResponse) {
      return res.status(500).json({
        error: "Failed to get response from AI service",
        toast: {
          type: "error",
          message: "Couldn't optimize your schedule. Please try again later.",
        },
      });
    }

    // Extract JSON from AI response
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) ||
      aiResponse.match(/```\n([\s\S]*?)\n```/) || [null, aiResponse];

    let updatedEvents;
    try {
      updatedEvents = JSON.parse(jsonMatch[1] || aiResponse);
    } catch (e) {
      console.error("Failed to parse AI response", aiResponse);
      updatedEvents = resolveOverlapLocally(simplifiedEvents, movedEvent);
    }

    res.json({
      updatedEvents,
      toast: {
        type: "success",
        title: "Schedule adjusted",
        message: `${updatedEvents.length} event${
          updatedEvents.length !== 1 ? "s" : ""
        } rescheduled to resolve overlaps.`,
      },
    });
  } catch (error) {
    console.error("Error resolving overlap:", error);

    const fallbackEvents = resolveOverlapLocally(
      req.body.eventsForDay || [],
      req.body.movedEvent
    );

    res.status(500).json({
      error: error.message || "Failed to resolve event overlap",
      updatedEvents: fallbackEvents,
      toast: {
        type: "warning",
        title: "AI optimization failed",
        message:
          fallbackEvents.length > 0
            ? `${fallbackEvents.length} event${
                fallbackEvents.length !== 1 ? "s" : ""
              } rescheduled using basic optimization`
            : "Couldn't optimize your schedule",
      },
    });
  }
});

// Simple local algorithm for fallback
function resolveOverlapLocally(events, movedEvent) {
  const sortedEvents = [...events].sort((a, b) => {
    if (a.locked && !b.locked) return -1;
    if (!a.locked && b.locked) return 1;
    return 0;
  });

  const updatedEvents = [];
  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (mins) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];

    // Skip the manually moved event unless it overlaps with a locked event
    if (event.id === movedEvent.id) {
      const overlapsLocked = sortedEvents.some(
        (e) =>
          e.locked &&
          timeToMinutes(event.timeStart) < timeToMinutes(e.timeEnd) &&
          timeToMinutes(event.timeEnd) > timeToMinutes(e.timeStart)
      );

      if (!overlapsLocked) {
        continue;
      }
    }

    if (event.locked) continue;

    // Check for overlaps with previous events
    let hasOverlap = false;
    let newStartTime = timeToMinutes(event.timeStart);

    for (let j = 0; j < i; j++) {
      const prevEvent = sortedEvents[j];
      const prevStart = timeToMinutes(prevEvent.timeStart);
      const prevEnd = timeToMinutes(prevEvent.timeEnd);

      if (
        newStartTime < prevEnd &&
        prevStart <
          newStartTime +
            (timeToMinutes(event.timeEnd) - timeToMinutes(event.timeStart))
      ) {
        hasOverlap = true;
        newStartTime = prevEnd + 15; // Add 15 min buffer
        break;
      }
    }

    if (hasOverlap) {
      const duration =
        timeToMinutes(event.timeEnd) - timeToMinutes(event.timeStart);
      updatedEvents.push({
        id: event.id,
        timeStart: minutesToTime(newStartTime),
        timeEnd: minutesToTime(newStartTime + duration),
      });
    }
  }

  return updatedEvents;
}

export default router;

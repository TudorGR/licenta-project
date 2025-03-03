import express from "express";
import Event from "../models/Event.js";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/isoWeek.js";
import { Op } from "sequelize";

// Extend dayjs with the weekOfYear plugin
dayjs.extend(weekOfYear);

const router = express.Router();

// Get all events
router.get("/", async (req, res) => {
  try {
    const events = await Event.findAll();
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create event
router.post("/", async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      day: req.body.day.toString(),
    };
    const event = await Event.create(eventData);
    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update event
router.put("/:id", async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (event) {
      const eventData = {
        ...req.body,
        day: req.body.day.toString(),
      };
      const updatedEvent = await event.update(eventData);
      res.json(updatedEvent);
    } else {
      res.status(404).json({ error: "Event not found" });
    }
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete event
router.delete("/:id", async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (event) {
      await event.destroy();
      res.json({ message: "Event deleted" });
    } else {
      res.status(404).json({ error: "Event not found" });
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(400).json({ error: error.message });
  }
});

// Add a new route to toggle lock status
router.patch("/:id/lock", async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (event) {
      const updatedEvent = await event.update({
        locked: !event.locked,
      });
      res.json(updatedEvent);
    } else {
      res.status(404).json({ error: "Event not found" });
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

export default router;

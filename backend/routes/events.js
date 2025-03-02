import express from "express";
import Event from "../models/Event.js";

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

export default router;

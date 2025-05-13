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

export default router;

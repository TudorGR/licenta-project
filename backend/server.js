import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import sequelize from "./config/database.js";
import eventRoutes from "./routes/events.js";
import algoRoutes from "./routes/algo.js";
import suggestionRoutes from "./routes/suggestions.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Initialize database
sequelize.sync();

// Routes
app.use("/api/events", eventRoutes);
app.use("/api/algo", algoRoutes);
app.use("/api/suggestions", suggestionRoutes);

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

app.post("/api/parse-event", async (req, res) => {
  const userText = req.body.text;
  const currentDate = new Date().toISOString().split("T")[0];

  const prompt = `Parse this text into event details: "${userText}"
  Current date is: ${currentDate}

  Use these default rules when information is missing:
  - If only activity is mentioned (e.g. "Workout"), set time to today 18:00-19:00
  - If only start time is mentioned, set duration to 1 hour
  - If no time is specified, use 10:00-11:00 for morning activities (study, meeting, work) and 18:00-19:00 for evening activities (workout, personal)
  - If no date is specified, assume today
  - Common activity categories mapping:
    - "workout", "gym", "training", "exercise" -> "Workout"
    - "meeting", "call", "interview" -> "Meeting"
    - "study", "homework", "research", "class" -> "Study"
    - "work", "project", "deadline" -> "Work"
    - "personal", "appointment" -> "Personal"
    - "party", "hangout", "meetup", "date" -> "Social"
    - "family", "relatives", "parents", "kids" -> "Family"
    - "doctor", "dentist", "checkup", "medicine" -> "Health"
    - "hobby", "gaming", "reading", "painting" -> "Hobby"
    - "cleaning", "laundry", "grocery", "errands" -> "Chores"
    - "trip", "flight", "vacation", "journey" -> "Travel"
    - "banking", "budget", "investment", "bills" -> "Finance"
    - "course", "tutorial", "workshop", "training" -> "Learning"
    - "meditation", "spa", "relaxation", "wellness" -> "Self-care"
    - "concert", "festival", "conference", "show" -> "Events"
    - anything else -> "None"

  Return ONLY a valid JSON object without any markdown formatting or additional text.
  The response must exactly match this structure and use the current date as reference for relative dates like "tomorrow" or "next week":
  {
    "title": "Event Title",
    "description": "Event description",
    "timeStart": "2024-XX-XXTXX:XX:XX",
    "timeEnd": "2024-XX-XXTXX:XX:XX",
    "category": "None",
    "day": "2024-XX-XX"
  }
  Do not include any explanation or additional text outside the JSON object.`;

  try {
    const response = await axios.post(GEMINI_API_URL, {
      contents: [{ parts: [{ text: prompt }] }],
    });

    const aiResponse = response.data.candidates[0]?.content?.parts[0]?.text;

    const jsonStr = aiResponse.substring(
      aiResponse.indexOf("{"),
      aiResponse.lastIndexOf("}") + 1
    );

    if (jsonStr) {
      const parsedEvent = JSON.parse(jsonStr);
      res.json(parsedEvent);
    } else {
      throw new Error("Invalid response format from Gemini API");
    }
  } catch (error) {
    console.error("Error parsing event:", error);
    res.status(500).json({ error: "Failed to parse event" });
  }
});

app.listen(5000);

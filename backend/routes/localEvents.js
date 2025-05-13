import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get local events
router.get("/:city", async (req, res) => {
  try {
    const { city } = req.params;
    const { timeframe = "this week", startDate, endDate } = req.query;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "You are a helpful assistant that returns information about local events in structured JSON format.",
      tools: [{ googleSearch: {} }],
    });

    // Format date context
    const today = dayjs();

    const prompt = `
      What events are happening in ${city} ${timeframe}.
      Today's date is ${today.format("YYYY-MM-DD")}.
      Return ONLY a JSON array with the following structure for each event:
      [
        {
          "title": "Event Name",
          "description": "Short event description",
          "timeStart": "HH:MM", (24-hour format, if unknown use "00:00")
          "timeEnd": "HH:MM", (24-hour format, if unknown use "23:59")
          "day": "YYYY-MM-DD", (date of event, must be valid date)
          "location": "Event venue/location",
          "category": "One of: Concert, Sports, Art, Food, Conference, Festival, Other"
        }
      ]
      Ensure all events have accurate dates in YYYY-MM-DD format.
      Include only events that occur within the specified date range.
      Do not include any explanatory text, only return valid JSON.
    `;

    // Generate content with Google Search enabled
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON array from the response
    const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
    if (!jsonMatch) {
      throw new Error("Failed to parse events data");
    }

    let events = JSON.parse(jsonMatch[0]);

    // Add default values for time fields if not available
    events = events.map((event) => {
      // Default times if not available
      if (!event.timeStart) event.timeStart = "00:00";
      if (!event.timeEnd) event.timeEnd = "23:59";

      // Ensure day is in the correct format
      if (!event.day) {
        const today = new Date();
        event.day = today.toISOString().split("T")[0]; // YYYY-MM-DD format
      }

      return event;
    });

    res.json(events);
  } catch (error) {
    console.error("Error fetching local events:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

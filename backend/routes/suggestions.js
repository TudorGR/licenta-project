import express from "express";
import dayjs from "dayjs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

// Get schedule suggestions
router.post("/", async (req, res) => {
  try {
    const { events } = req.body;

    // Step 1: Create a frequency matrix (24 hours x 7 days)
    const frequencyMatrix = Array.from({ length: 24 }, () =>
      Array.from({ length: 7 }, () => ({}))
    );

    // Get current week boundaries
    const today = dayjs();
    const startOfWeek = today.startOf("week");
    const endOfWeek = today.endOf("week");

    // Get historical events (past 3 months)
    const threeMonthsAgo = today.subtract(3, "month");

    // Populate frequency matrix from historical events
    events.forEach((event) => {
      const eventDate = dayjs(parseInt(event.day));

      // Skip future events and events older than 3 months
      if (eventDate.isAfter(today) || eventDate.isBefore(threeMonthsAgo)) {
        return;
      }

      // Convert from Sunday=0 to Monday=0 indexing
      const dayOfWeek = (eventDate.day() + 6) % 7; // 0-6, Monday to Sunday
      const category = event.category || "None";

      const startTime = event.timeStart.split(":");
      const endTime = event.timeEnd.split(":");

      const startHour = parseInt(startTime[0]);
      const endHour = parseInt(endTime[0]);

      // Add event to frequency matrix for each hour it spans
      for (let hour = startHour; hour < endHour; hour++) {
        if (!frequencyMatrix[hour][dayOfWeek][category]) {
          frequencyMatrix[hour][dayOfWeek][category] = 0;
        }
        frequencyMatrix[hour][dayOfWeek][category]++;
      }
    });

    // Step 2: Get current week events
    const currentWeekEvents = events.filter((event) => {
      const eventDate = dayjs(parseInt(event.day));
      return eventDate.isAfter(startOfWeek) && eventDate.isBefore(endOfWeek);
    });

    // Step 3: Generate prompt for the AI
    const prompt = `
    You are an AI Calendar Assistant that provides practical, personalized time management suggestions.

    Based on the following data about a user's calendar:

    1. FREQUENCY MATRIX: This shows how often certain categories of events occur at specific times and days (historical data from past 3 months):
    ${JSON.stringify(frequencyMatrix, null, 2)}

    2. CURRENT WEEK EVENTS: These are the events scheduled for the current week:
    ${JSON.stringify(currentWeekEvents, null, 2)}

    Please provide 3-5 specific, actionable suggestions for better time management this week.
    Each suggestion should be specific, actionable and based on patterns from the frequency matrix or observations about the current week's schedule.

    Examples of good suggestions:
    - "You typically have 'Meeting' events on Tuesday mornings. Consider blocking Tuesday 9-11 AM for focused work instead."
    - "Your 'Workout' sessions are inconsistent. Based on your patterns, Wednesday and Friday evenings between 6-7 PM might work best for regular exercise."
    - "You have many small gaps between meetings on Thursday. Try consolidating meetings to create larger blocks of focused work time."
    - "You don't have any 'Personal' time scheduled this week. Consider adding 1 hour on Saturday morning based on your past patterns."

    Return ONLY the list of suggestions, without any introductions or explanations.
    `;

    // Step 4: Call Gemini API for suggestions
    const response = await axios.post(GEMINI_API_URL, {
      contents: [{ parts: [{ text: prompt }] }],
    });

    const aiResponse = response.data.candidates[0]?.content?.parts[0]?.text;

    // Step 5: Process the response
    const suggestions = aiResponse
      .split("\n")
      .filter((line) => line.trim().length > 0 && line.includes("-"))
      .map((line) => line.replace(/^-\s*/, "").trim());

    res.json({ suggestions });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

export default router;

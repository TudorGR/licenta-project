import express from "express";
import dayjs from "dayjs";
import axios from "axios";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";

dotenv.config();
const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

// Get event suggestions based on user patterns
router.post("/event-suggestions", async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || events.length === 0) {
      return res.json({ suggestions: [] });
    }

    // Get events from the past month
    const oneMonthAgo = dayjs().subtract(1, "month").valueOf();
    const pastEvents = events.filter(
      (event) => dayjs(event.day).valueOf() >= oneMonthAgo
    );

    // Group events by category
    const eventsByCategory = {};
    pastEvents.forEach((event) => {
      const category = event.category || "None";
      if (!eventsByCategory[category]) {
        eventsByCategory[category] = [];
      }
      eventsByCategory[category].push(event);
    });

    // Analyze patterns for each category
    const categoryPatterns = {};
    Object.entries(eventsByCategory).forEach(([category, events]) => {
      if (events.length < 2) return;

      // Calculate average duration
      const durations = events.map((event) => {
        const start = event.timeStart.split(":").map(Number);
        const end = event.timeEnd.split(":").map(Number);
        return end[0] * 60 + end[1] - (start[0] * 60 + start[1]);
      });

      const avgDuration = Math.round(
        durations.reduce((a, b) => a + b, 0) / durations.length
      );

      // Determine typical time of day
      const timeSlots = events.map((event) => {
        const hour = parseInt(event.timeStart.split(":")[0]);
        if (hour < 12) return "morning";
        if (hour < 17) return "midday";
        return "afternoon";
      });

      const timeOfDay = findMostCommon(timeSlots);

      categoryPatterns[category] = {
        avgDuration,
        timeOfDay,
        sampleTitles: events.map((event) => event.title),
      };
    });

    // Find empty slots in the next week
    const slots = findEmptyTimeSlots(events);

    // Generate suggestions by matching patterns to slots
    const possibleSuggestions = [];

    Object.entries(categoryPatterns).forEach(([category, pattern]) => {
      // Find slots that match this category's preferred time of day
      const matchingSlots = slots.filter((slot) => {
        const hour = slot.hour;
        if (pattern.timeOfDay === "morning" && hour >= 6 && hour < 12)
          return true;
        if (pattern.timeOfDay === "midday" && hour >= 12 && hour < 17)
          return true;
        if (pattern.timeOfDay === "afternoon" && hour >= 17 && hour < 22)
          return true;
        return false;
      });

      if (matchingSlots.length > 0) {
        // Pick a random sample title
        const sampleTitle =
          pattern.sampleTitles[
            Math.floor(Math.random() * pattern.sampleTitles.length)
          ];

        // Create suggestion for each matching slot
        matchingSlots.forEach((slot) => {
          possibleSuggestions.push({
            category,
            title: sampleTitle,
            day: slot.day,
            timeStart: `${slot.hour}:00`,
            timeEnd: `${slot.hour + Math.ceil(pattern.avgDuration / 60)}:00`,
            durationMins: pattern.avgDuration,
          });
        });
      }
    });

    // Randomly select up to 5 suggestions
    const shuffled = possibleSuggestions.sort(() => 0.5 - Math.random());
    const suggestions = shuffled.slice(0, 5);

    res.json({ suggestions });
  } catch (error) {
    console.error("Error generating event suggestions:", error);
    res.status(500).json({ error: "Failed to generate event suggestions" });
  }
});

// New endpoint for GROQ-powered suggestions
router.post("/smart-suggestions", async (req, res) => {
  try {
    const { pastEvents, futureEvents, currentDate } = req.body;

    // Enhanced current date with day of week
    const enhancedCurrentDate = {
      date: currentDate,
      dayOfWeek: dayjs(currentDate).format("dddd"),
    };

    // Format past events with enhanced metadata
    const pastEventsFormatted = pastEvents.map((event) => {
      // Calculate duration in minutes
      const startTimeParts = event.timeStart.split(":").map(Number);
      const endTimeParts = event.timeEnd.split(":").map(Number);
      const startMinutes = startTimeParts[0] * 60 + startTimeParts[1];
      const endMinutes = endTimeParts[0] * 60 + endTimeParts[1];
      const durationMinutes = endMinutes - startMinutes;

      const eventDay = dayjs(event.day);

      return {
        title: event.title,
        day: eventDay.format("YYYY-MM-DD"),
        dayOfWeek: eventDay.format("dddd"),
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
        durationMinutes: durationMinutes,
        category: event.category || "None",
      };
    });

    // Format future events with enhanced metadata
    const futureEventsFormatted = futureEvents.map((event) => {
      // Calculate duration in minutes
      const startTimeParts = event.timeStart.split(":").map(Number);
      const endTimeParts = event.timeEnd.split(":").map(Number);
      const startMinutes = startTimeParts[0] * 60 + startTimeParts[1];
      const endMinutes = endTimeParts[0] * 60 + endTimeParts[1];
      const durationMinutes = endMinutes - startMinutes;

      const eventDay = dayjs(event.day);

      return {
        title: event.title,
        day: eventDay.format("YYYY-MM-DD"),
        dayOfWeek: eventDay.format("dddd"),
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
        durationMinutes: durationMinutes,
        category: event.category || "None",
      };
    });

    const prompt = `
You are an AI assistant for a smart calendar app. Generate 3-5 natural language command suggestions that anticipate what the user might want to do based on their past behavior patterns.

CURRENT DATE: ${enhancedCurrentDate.date} (${enhancedCurrentDate.dayOfWeek})

PAST 3 MONTHS EVENTS (for reference):
${JSON.stringify(pastEventsFormatted, null, 2)}

NEXT 3 MONTHS EVENTS (for reference):
${JSON.stringify(futureEventsFormatted, null, 2)}

Generate suggestions in these categories:
1. CREATE_EVENT: Example: "Schedule a [event] [day of week]/[date] from 2PM to 4PM"
2. FIND_EVENT: Example: "When is my next/was my last [event]?"
3. LOCAL_EVENTS: Example: "What events are happening in the city today/this week/this month?"
4. TIME_SUGGESTIONS: Example: "When is the best time to schedule/add/create a [event] on [day of week/date]?"

IMPORTANT:
- Analyze the user's calendar to identify clear patterns and preferences:
  * Recurring event titles or topics
  * Preferred times of day for specific activities
  * Typical event durations by category
  * Weekly patterns (specific days of week for certain activities)
  * Monthly patterns and upcoming gaps
- Predict what the user is most likely to want based on their established patterns
- Suggest creating events similar to ones they've scheduled before
- Suggest reasonable times based on:
  * When they typically schedule similar events (day of week, time of day)
  * How long they typically schedule these events for (use duration data)
  * Gaps in their upcoming schedule
- Use actual event titles from their past (or very similar themes)
- CREATE_EVENT cannot create if it is overlapping with another event
- Make suggestions sound natural, as if typed by a user
- Each suggestion should be complete enough to be processed by the calendar
- Provide exactly 3-5 suggestions total, ensuring good variety across categories

Format your response as a JSON array of suggestion objects:
[
  {
    "type": "CREATE_EVENT|FIND_EVENT|LOCAL_EVENTS|TIME_SUGGESTIONS",
    "suggestion": "The complete natural language suggestion"
  }
]`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const suggestions = JSON.parse(response.choices[0].message.content);

    res.json(suggestions);
  } catch (error) {
    console.error("Error generating smart suggestions:", error);
    res.status(500).json({ error: "Failed to generate smart suggestions" });
  }
});

// Helper function to find most common item in array
const findMostCommon = (arr) => {
  const counts = {};
  arr.forEach((item) => {
    counts[item] = (counts[item] || 0) + 1;
  });
  let maxCount = 0;
  let maxItem = null;
  Object.entries(counts).forEach(([item, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxItem = item;
    }
  });
  return maxItem;
};

// Find empty time slots in the next week
const findEmptyTimeSlots = (events) => {
  const slots = [];
  const today = dayjs().startOf("day");

  // Check for the next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = today.add(dayOffset, "day");
    const dayEvents = events.filter(
      (event) =>
        dayjs(event.day).format("YYYY-MM-DD") ===
        currentDay.format("YYYY-MM-DD")
    );

    // Check each hour from 8am to 8pm
    for (let hour = 8; hour <= 20; hour++) {
      const hourTaken = dayEvents.some((event) => {
        const startHour = parseInt(event.timeStart.split(":")[0]);
        const endHour = parseInt(event.timeEnd.split(":")[0]);
        return hour >= startHour && hour < endHour;
      });

      if (!hourTaken) {
        slots.push({
          day: currentDay.valueOf(),
          hour,
        });
      }
    }
  }

  return slots;
};

export default router;

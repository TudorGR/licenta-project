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

// New endpoint for smart suggestions (without LLM)
router.post("/smart-suggestions", async (req, res) => {
  try {
    const { pastEvents, futureEvents, currentDate } = req.body;
    const today = dayjs(currentDate);
    const suggestions = [];

    // Get events from the past month
    const oneMonthAgo = today.subtract(1, "month");
    const pastMonthEvents = pastEvents.filter(
      (event) =>
        dayjs(event.day).isAfter(oneMonthAgo) ||
        dayjs(event.day).isSame(oneMonthAgo)
    );

    // 1. CREATE_EVENT suggestions
    createEventSuggestions(suggestions, pastMonthEvents, futureEvents, today);

    // 2. FIND_EVENT suggestions
    findEventSuggestions(suggestions, pastMonthEvents);

    // 3. LOCAL_EVENTS suggestions
    localEventSuggestions(suggestions, pastMonthEvents, today);

    // 4. TIME_SUGGESTIONS
    timeEventSuggestions(suggestions, pastMonthEvents, today);

    // Ensure we have 3-5 suggestions total with diversity
    const finalSuggestions = diversifyAndLimitSuggestions(suggestions);

    res.json(finalSuggestions);
  } catch (error) {
    console.error("Error generating smart suggestions:", error);
    res.status(500).json({ error: "Failed to generate smart suggestions" });
  }
});

// Helper functions for each suggestion type
function createEventSuggestions(
  suggestions,
  pastMonthEvents,
  futureEvents,
  today
) {
  // Group past events by category to find common event types
  const eventsByCategory = {};
  pastMonthEvents.forEach((event) => {
    const category = event.category || "None";
    if (!eventsByCategory[category]) {
      eventsByCategory[category] = [];
    }
    eventsByCategory[category].push(event);
  });

  // Find the most common categories
  const categoryCounts = Object.entries(eventsByCategory)
    .map(([category, events]) => ({ category, count: events.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // Get top 3 categories

  categoryCounts.forEach(({ category }) => {
    if (category === "None") return;

    const categoryEvents = eventsByCategory[category];
    const titleCounts = {};

    // Count occurrences of each title
    categoryEvents.forEach((event) => {
      titleCounts[event.title] = (titleCounts[event.title] || 0) + 1;
    });

    // Find most common title
    const mostCommonTitle =
      Object.entries(titleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      category;

    // Find typical day of week and time
    const dayOfWeekCounts = {};
    categoryEvents.forEach((event) => {
      const dayOfWeek = dayjs(event.day).format("dddd");
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
    });

    const mostCommonDay = Object.entries(dayOfWeekCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    // Find next occurrence of this day
    let nextDay = today;
    for (let i = 0; i < 7; i++) {
      if (nextDay.format("dddd") === mostCommonDay) break;
      nextDay = nextDay.add(1, "day");
    }

    suggestions.push({
      type: "CREATE_EVENT",
      suggestion: `Schedule a ${mostCommonTitle} on ${nextDay.format(
        "dddd"
      )} ${nextDay.format("MMM D")}`,
    });
  });
}

function findEventSuggestions(suggestions, pastMonthEvents) {
  // Get unique titles from past month events
  const uniqueTitles = [
    ...new Set(pastMonthEvents.map((event) => event.title)),
  ];

  // If we have titles, randomly select up to 2 to suggest searching for
  if (uniqueTitles.length > 0) {
    const shuffledTitles = uniqueTitles.sort(() => 0.5 - Math.random());
    const selectedTitles = shuffledTitles.slice(
      0,
      Math.min(2, uniqueTitles.length)
    );

    selectedTitles.forEach((title) => {
      const randomChoice = Math.random();

      if (randomChoice < 0.5) {
        suggestions.push({
          type: "FIND_EVENT",
          suggestion: `When is my next ${title}?`,
        });
      } else {
        suggestions.push({
          type: "FIND_EVENT",
          suggestion: `When was my last ${title}?`,
        });
      }
    });
  }
}

function localEventSuggestions(suggestions, pastMonthEvents, today) {
  // Find "Social & Family" events
  const socialEvents = pastMonthEvents.filter(
    (event) => event.category === "Social & Family"
  );

  // If we have social events, find common days of week
  if (socialEvents.length > 0) {
    const dayOfWeekCounts = {};
    socialEvents.forEach((event) => {
      const dayOfWeek = dayjs(event.day).format("dddd");
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
    });

    const sortedDays = Object.entries(dayOfWeekCounts)
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);

    if (sortedDays.length > 0) {
      const commonDay = sortedDays[0];
      suggestions.push({
        type: "LOCAL_EVENTS",
        suggestion: `What events are happening in the city this ${commonDay.toLowerCase()}?`,
      });
    }
  }

  // Add hardcoded suggestions
  const hardcodedOptions = [
    "What events are happening in the city today?",
    "Show me local events for this week",
    "Any interesting events this weekend?",
  ];

  // Add one hardcoded option
  const randomIndex = Math.floor(Math.random() * hardcodedOptions.length);
  suggestions.push({
    type: "LOCAL_EVENTS",
    suggestion: hardcodedOptions[randomIndex],
  });
}

function timeEventSuggestions(suggestions, pastMonthEvents, today) {
  // Group events by day of week
  const eventsByDayOfWeek = {};
  pastMonthEvents.forEach((event) => {
    const dayOfWeek = dayjs(event.day).format("dddd");
    if (!eventsByDayOfWeek[dayOfWeek]) {
      eventsByDayOfWeek[dayOfWeek] = [];
    }
    eventsByDayOfWeek[dayOfWeek].push(event);
  });

  // For each day, find the most common event types
  const dayOptions = [];

  Object.entries(eventsByDayOfWeek).forEach(([dayOfWeek, events]) => {
    // Count event titles
    const titleCounts = {};
    events.forEach((event) => {
      titleCounts[event.title] = (titleCounts[event.title] || 0) + 1;
    });

    // Get the top 2 most common events for this day
    const topEvents = Object.entries(titleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map((entry) => entry[0]);

    topEvents.forEach((title) => {
      // Find the next occurrence of this day of week
      let nextDay = today;
      for (let i = 0; i < 7; i++) {
        if (nextDay.format("dddd") === dayOfWeek) break;
        nextDay = nextDay.add(1, "day");
      }

      dayOptions.push({
        title,
        dayOfWeek,
        nextDate: nextDay.format("MMM D"),
      });
    });
  });

  // Randomly select up to 2 day-event combinations
  if (dayOptions.length > 0) {
    const shuffledOptions = dayOptions.sort(() => 0.5 - Math.random());
    const selectedOptions = shuffledOptions.slice(
      0,
      Math.min(2, dayOptions.length)
    );

    selectedOptions.forEach((option) => {
      suggestions.push({
        type: "TIME_SUGGESTIONS",
        suggestion: `When is the best time to schedule a ${option.title} on ${option.dayOfWeek} ${option.nextDate}?`,
      });
    });
  }
}

function diversifyAndLimitSuggestions(suggestions) {
  // Ensure we have a diverse set of suggestions with at least one of each type
  const result = [];
  const types = [
    "CREATE_EVENT",
    "FIND_EVENT",
    "LOCAL_EVENTS",
    "TIME_SUGGESTIONS",
  ];

  // Shuffle the suggestion types to randomize their priority
  const shuffledTypes = [...types].sort(() => 0.5 - Math.random());

  // Randomly decide how many different types to include (2-4)
  const typesToInclude = Math.floor(Math.random() * 3) + 2; // Random number between 2-4
  const selectedTypes = shuffledTypes.slice(0, typesToInclude);

  // Get suggestions for our randomly selected types
  selectedTypes.forEach((type) => {
    const typeOptions = suggestions.filter((s) => s.type === type);
    if (typeOptions.length > 0) {
      // Add 1-2 suggestions of this type depending on availability
      const numToAdd = Math.min(
        1 + Math.floor(Math.random() * 2), // 1 or 2
        typeOptions.length
      );

      // Shuffle the options to get random ones
      const shuffledOptions = [...typeOptions].sort(() => 0.5 - Math.random());

      // Add the randomly selected suggestions
      for (let i = 0; i < numToAdd && result.length < 5; i++) {
        result.push(shuffledOptions[i]);
      }
    }
  });

  // Ensure we have at least 3 suggestions by adding more if needed
  if (result.length < 3) {
    // Get all suggestions that aren't already in result
    const remainingSuggestions = suggestions.filter(
      (s) => !result.some((r) => r.suggestion === s.suggestion)
    );

    // Shuffle and add them until we reach at least 3
    const shuffled = remainingSuggestions.sort(() => 0.5 - Math.random());
    for (let i = 0; i < shuffled.length && result.length < 3; i++) {
      result.push(shuffled[i]);
    }
  }

  // Final shuffle to randomize the order
  return result.sort(() => 0.5 - Math.random()).slice(0, 5);
}

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

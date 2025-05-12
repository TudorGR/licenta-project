import express from "express";
import dayjs from "dayjs";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

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

export default router;

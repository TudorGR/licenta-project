import express from "express";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Event from "../models/Event.js";
import { Op } from "sequelize";
import axios from "axios";

dotenv.config();
const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/", async (req, res) => {
  const {
    text,
    workingHoursStart = "08:00",
    workingHoursEnd = "20:00",
    userId,
  } = req.body;

  const currentDate = dayjs().format("YYYY-MM-DD");

  // Generate date mapping for the upcoming week
  const dateMapping = [];
  const today = dayjs();
  const currentDayOfWeek = today.day(); // 0 is Sunday, 6 is Saturday

  // Loop through next 7 days to create mapping
  for (let i = 0; i < 7; i++) {
    // Calculate the date for each day of the week starting from current day
    const date = today.add(i, "day");
    const dayOfWeek = date.format("dddd").toLowerCase(); // e.g. "monday"
    const formattedDate = date.format("YYYY-MM-DD");
    dateMapping.push(`${dayOfWeek}: ${formattedDate}`);
  }

  let systemPrompt = `You are a calendar assistant that outputs JSON only.
  Extract the function and it's parameters from the user message, and provide a short but useful message for completion or missing any parameters.
  These are all your possible function:
  - createEvent(title,startTime,endTime,date)
  - local_events(timeframe)
  - findEvent(timeframe)
  - unknownFuntion()
  Formats:
  createEvent format: {'function': 'createEvent', 'parameters': [title,startTime,endTime,date], 'category': "", 'message': ""}.
  local_events format: {'function': 'local_events', 'parameters': [timeframe], 'message': ""}.
  findEvent format: {'function': 'findEvent', 'parameters': [timeframe], 'category': "", 'message': ""}
  unknownFuntion format: {'message': ""}
  RULES:
  createEvent rules:
  - if the user asks to find the best time or when to schedule it refers to createEvent function
  - the parameters should be in the order: title(string), startTime(24hr format), endTime(24hr format), date(YYYY-MM-DD)
  - some valid formats are these [add a (event) today] [put (event) from 10 to 12] [when to schedule a (event)?] etc. ex: "add meeting today"
  - ignore formats like "now", "in 2 hours", "before that", etc.
  local_events rules:
  - if the user asks about what events are happening, local events, or similar queries, use local_events function
  - for local_events, timeframe can be "today", "this week", "this month", day of week or a date
  findEvent rules:
  - if the user asks about when an event will happen, or when was the last time, or to find specific events, use findEvent function
  - for findEvent, category is gonna be the event category and timeframe is gonna be "future" or "past" but not explicitly mentioned
  general rules:
  - date parameter is by default ${currentDate} if it is not specified
  - if a parameter is not specified ask for it and make the parameter empty in the list
  - days of week map to these specific dates for the next 7 days:
    ${dateMapping.join("\n    ")}
  - when a day of week is mentioned (like "monday", "tuesday", etc.) use the corresponding date from the mapping above
  - you are gonna choose the category: Work, Education, Health & Wellness, Finance & Bills, Social & Family, Travel & Commute, Personal Tasks, Leisure & Hobbies, Other`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `The user's message is: "${text}"` },
  ];

  try {
    const response = await groq.chat.completions.create({
      messages: messages,
      model: "llama3-70b-8192",
      // response_format: { type: "json_object" },
      temperature: 0,
    });

    const assistantResponse = JSON.parse(response.choices[0].message.content);

    // Create params array from direct properties if parameters doesn't exist
    let params = assistantResponse.parameters;
    if (!params && assistantResponse.function === "createEvent") {
      params = [
        assistantResponse.title,
        assistantResponse.startTime,
        assistantResponse.endTime,
        assistantResponse.date,
      ];
    }

    const category = assistantResponse.category;

    if (assistantResponse.function === "createEvent") {
      if (params && params.every(Boolean)) {
        const title = params[0];
        const timeStart = params[1];
        const timeEnd = params[2];
        const date = params[3];
        const dayValue = dayjs(date).valueOf();

        // Check for overlapping events
        const overlappingEvents = await checkEventOverlaps(
          dayValue,
          timeStart,
          timeEnd,
          userId
        );

        if (overlappingEvents.length > 0) {
          // Return overlapping events
          return res.json({
            intent: "event_overlap",
            eventData: {
              title: title,
              description: "",
              day: dayValue,
              timeStart: timeStart,
              timeEnd: timeEnd,
              category: category || "Other", // Add default "Other" category
            },
            overlappingEvents: overlappingEvents.map((event) => ({
              id: event.id,
              title: event.title,
              timeStart: event.timeStart,
              timeEnd: event.timeEnd,
              category: event.category || "Other",
            })),
            message: `Creating "${title}" on ${dayjs(date).format(
              "YYYY-MM-DD"
            )} from ${timeStart} to ${timeEnd} would overlap with ${
              overlappingEvents.length
            } existing event(s).`,
          });
        }

        // No overlaps, return event data for creation
        return res.json({
          intent: "create_event",
          eventData: {
            title: title,
            description: "",
            day: dayValue,
            timeStart: timeStart,
            timeEnd: timeEnd,
            category: category,
          },
          message: `I can create an event "${title}" on ${dayjs(date).format(
            "YYYY-MM-DD"
          )} from ${timeStart} to ${timeEnd}.`,
        });
      } else if (params[0] && !params[1] && !params[2] && params[3]) {
        // User provided title and date, but no time slots - suggest optimal times
        const title = params[0];
        const date = params[3];
        const dayValue = dayjs(date).valueOf();
        const eventCategory = assistantResponse.category || "Other";
        const dayOfWeek = dayjs(date).day(); // 0 is Sunday, 6 is Saturday

        // Find free slots for the day (pass userId!)
        const freeSlots = await findFreeSlotsForDay(
          dayValue,
          workingHoursStart,
          workingHoursEnd,
          userId // <-- adaugă userId aici
        );

        // Get category patterns to find optimal slots
        const categoryPatterns = await getCategoryPatterns(
          eventCategory,
          userId
        );

        // Find the average duration for this category (minimum 30 minutes)
        const avgDuration = categoryPatterns
          ? Math.max(
              Math.ceil(categoryPatterns.averageDurationMinutes / 30) * 30,
              30
            )
          : 60;

        // Rank the free slots based on patterns
        const rankedSlots = rankSlotsByPattern(
          freeSlots,
          eventCategory,
          dayOfWeek,
          avgDuration,
          categoryPatterns
        );

        // Return all suggestions instead of just top 3
        return res.json({
          intent: "time_suggestions",
          eventData: {
            title: title,
            description: "",
            day: dayValue,
            category: eventCategory,
          },
          // Send all slots, but mark top 3 as recommended
          suggestedSlots: rankedSlots.map((slot, index) => ({
            timeStart: slot.timeStart,
            timeEnd: slot.timeEnd,
            score: slot.score,
            isRecommended: index < 3, // Mark top 3 as recommended
          })),
          message: `Here are the best times to schedule "${title}" on ${dayjs(
            date
          ).format("YYYY-MM-DD")} based on your patterns.`,
        });
      }
    }

    if (assistantResponse.function === "local_events") {
      const timeframe = params[0] || "this week";
      const cityName = "Iasi Romania"; // City is hardcoded as specified in requirements

      try {
        // Get events using the existing endpoint with timeframe parameter
        const events = await getLocalEvents(cityName, timeframe);

        return res.json({
          intent: "local_events",
          events: events,
          timeframe: timeframe,
          city: cityName,
          message: `Here are the events in ${cityName} for ${timeframe}`,
        });
      } catch (error) {
        console.error("Error fetching local events:", error);
        return res.json({
          intent: "error",
          message: "Sorry, I couldn't fetch the local events at this time.",
        });
      }
    }

    // Add this condition after the other function checks
    if (assistantResponse.function === "findEvent") {
      const timeframe = params.includes("future") ? "future" : "past";

      try {
        // Get events matching the category and timeframe
        const matchingEvents = await findEventsByCategory(
          category,
          timeframe,
          userId
        );

        if (matchingEvents.length === 0) {
          return res.json({
            intent: "find_event_result",
            events: [],
            category: category,
            timeframe: timeframe,
            message: `I couldn't find any ${category} events ${
              timeframe === "future"
                ? "coming up"
                : timeframe === "past"
                ? "in the past"
                : ""
            }.`,
          });
        }

        // Prepare the events for sending to Groq
        let formattedEvents = matchingEvents.map((event) => ({
          id: event.id,
          title: event.title,
          day: dayjs(parseInt(event.day)).format("YYYY-MM-DD"),
          timeStart: event.timeStart,
          timeEnd: event.timeEnd,
          category: event.category,
          location: event.location || "",
        }));

        // Order events based on timeframe direction
        if (timeframe === "future") {
          // Soonest first
          formattedEvents = formattedEvents.sort((a, b) => {
            if (a.day === b.day) {
              return a.timeStart.localeCompare(b.timeStart);
            }
            return a.day.localeCompare(b.day);
          });
        } else {
          // Most recent first
          formattedEvents = formattedEvents.sort((a, b) => {
            if (a.day === b.day) {
              return b.timeStart.localeCompare(a.timeStart);
            }
            return b.day.localeCompare(a.day);
          });
        }

        // Create a prompt for Groq to match the events with the user's query
        const currentDateTime = dayjs().format("YYYY-MM-DD HH:mm");
        const matchPrompt = `You are an AI assistant that helps find the most relevant event from a list based on a user's query.

User's original query: "${text}"
Category: ${category}
Timeframe: ${timeframe}
Current date and time: ${currentDateTime}

Available events:
${JSON.stringify(formattedEvents, null, 2)}

Please analyze these events and determine which ONE is most relevant to the user's original query.
Consider factors like event title, timing, and any specific details mentioned in the user's query.

Your response must be a JSON that follows this exact format:
{
  "eventId": "id of the selected event",
  "message": "A short message of when you found the event."
}`;

        // Call Groq to find the most relevant event
        const groqResponse = await groq.chat.completions.create({
          messages: [{ role: "user", content: matchPrompt }],
          model: "llama3-70b-8192",
          response_format: { type: "json_object" },
          temperature: 0,
        });

        const matchResult = JSON.parse(groqResponse.choices[0].message.content);

        // Check if eventId is null or undefined
        if (!matchResult.eventId) {
          return res.json({
            intent: "find_event_result",
            events: formattedEvents,
            selectedEvent: null,
            category: category,
            timeframe: timeframe,
            message: matchResult.message || "No matching event found.",
          });
        }

        // Find the selected event
        const selectedEvent = formattedEvents.find(
          (e) => e.id.toString() === matchResult.eventId.toString()
        );

        return res.json({
          intent: "find_event_result",
          events: formattedEvents,
          selectedEvent: selectedEvent,
          category: category,
          timeframe: timeframe,
          message: matchResult.message,
        });
      } catch (error) {
        console.error("Error finding events:", error);
        return res.json({
          intent: "error",
          message: "Sorry, I encountered an error while searching for events.",
        });
      }
    }

    // For other intents
    res.json({
      intent: "unknown",
      message: assistantResponse.message,
    });
  } catch (error) {
    console.error("Error processing chat message:", error);
    res.status(500).json({ error: "Failed to process your request" });
  }
});

// Helper function to check for overlapping events
async function checkEventOverlaps(day, timeStart, timeEnd, userId) {
  try {
    // Find events on the same day FOR THE CURRENT USER
    const eventsOnSameDay = await Event.findAll({
      where: {
        day: day.toString(),
        userId: userId, // Add user ID filter
      },
    });

    // Rest of the function remains the same...
    const getTimeInMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const newStartMinutes = getTimeInMinutes(timeStart);
    const newEndMinutes = getTimeInMinutes(timeEnd);

    return eventsOnSameDay.filter((event) => {
      const eventStartMinutes = getTimeInMinutes(event.timeStart);
      const eventEndMinutes = getTimeInMinutes(event.timeEnd);

      return (
        newStartMinutes < eventEndMinutes && eventStartMinutes < newEndMinutes
      );
    });
  } catch (error) {
    console.error("Error checking for event overlaps:", error);
    return []; // Return empty array if there's an error
  }
}

// Helper function to find free slots on a specific day
async function findFreeSlotsForDay(
  day,
  workingHoursStart = "08:00",
  workingHoursEnd = "20:00",
  userId
) {
  try {
    // Get all events for the day FOR THE CURRENT USER
    const eventsOnDay = await Event.findAll({
      where: { day: day.toString(), userId: userId }, // <-- filtrează după userId
    });

    // Convert events to time ranges (in minutes)
    const busyRanges = eventsOnDay
      .map((event) => {
        const startMinutes = getTimeInMinutes(event.timeStart);
        const endMinutes = getTimeInMinutes(event.timeEnd);
        return { start: startMinutes, end: endMinutes };
      })
      .sort((a, b) => a.start - b.start);

    // Define the working day using the provided parameters
    const dayStart = getTimeInMinutes(workingHoursStart);
    const dayEnd = getTimeInMinutes(workingHoursEnd);

    // Find free ranges
    const freeRanges = [];
    let currentStart = dayStart;

    for (const range of busyRanges) {
      // If there's a gap before this event, add it to free ranges
      if (range.start > currentStart) {
        freeRanges.push({
          start: currentStart,
          end: range.start,
        });
      }
      // Move current start to the end of this busy period
      currentStart = Math.max(currentStart, range.end);
    }

    // Add the final free slot if applicable
    if (currentStart < dayEnd) {
      freeRanges.push({
        start: currentStart,
        end: dayEnd,
      });
    }

    // Convert free ranges back to time slots with at least 30 min duration
    return freeRanges
      .filter((range) => range.end - range.start >= 30)
      .map((range) => {
        return {
          timeStart: minutesToTimeString(range.start),
          timeEnd: minutesToTimeString(range.end),
          durationMinutes: range.end - range.start,
        };
      });
  } catch (error) {
    console.error("Error finding free slots:", error);
    return [];
  }
}

// Helper function to get category patterns from database or cache
async function getCategoryPatterns(category, userId) {
  try {
    const today = dayjs();
    const threeMonthsAgo = today.subtract(3, "month").valueOf();

    // Get all events in this category from past month FOR THE CURRENT USER
    const pastEvents = await Event.findAll({
      where: {
        category: category,
        userId: userId, // Add user ID filter
        day: {
          [Op.between]: [threeMonthsAgo, today.valueOf()],
        },
      },
    });

    if (pastEvents.length === 0) {
      return null;
    }

    // Calculate average duration
    let totalDuration = 0;
    const hourFrequency = Array(24).fill(0);
    const dayOfWeekFrequency = {};

    for (let i = 0; i < 7; i++) {
      dayOfWeekFrequency[i] = Array(24).fill(0);
    }

    pastEvents.forEach((event) => {
      const startTime = event.timeStart.split(":").map(Number);
      const endTime = event.timeEnd.split(":").map(Number);
      const duration =
        endTime[0] * 60 + endTime[1] - (startTime[0] * 60 + startTime[1]);

      totalDuration += duration;

      const eventDate = dayjs(Number(event.day));
      const dayOfWeek = eventDate.day(); // 0 is Sunday, 6 is Saturday

      const startHour = startTime[0];
      const endHour = endTime[0] + (endTime[1] > 0 ? 1 : 0);

      for (let hour = startHour; hour < endHour; hour++) {
        if (hour < 24) {
          hourFrequency[hour]++;
          dayOfWeekFrequency[dayOfWeek][hour]++;
        }
      }
    });

    return {
      averageDurationMinutes: Math.round(totalDuration / pastEvents.length),
      frequencyByHour: hourFrequency,
      frequencyByDayOfWeek: dayOfWeekFrequency,
    };
  } catch (error) {
    console.error("Error getting category patterns:", error);
    return null;
  }
}

// Rank available slots based on pattern matching
function rankSlotsByPattern(
  freeSlots,
  category,
  dayOfWeek,
  duration,
  patterns
) {
  if (!patterns) {
    // Without patterns, just return slots sorted by start time
    return freeSlots
      .filter((slot) => slot.durationMinutes >= duration)
      .map((slot) => {
        return {
          timeStart: slot.timeStart,
          timeEnd: minutesToTimeString(
            getTimeInMinutes(slot.timeStart) + duration
          ),
          score: 1,
          durationMinutes: duration,
        };
      })
      .sort(
        (a, b) => getTimeInMinutes(a.timeStart) - getTimeInMinutes(b.timeStart)
      );
  }

  // With patterns, score slots based on historical frequency
  const scoredSlots = freeSlots
    .filter((slot) => slot.durationMinutes >= duration)
    .flatMap((slot) => {
      // For each slot, generate potential start times at 30-minute intervals
      const startMinutes = getTimeInMinutes(slot.timeStart);
      const endMinutes = getTimeInMinutes(slot.timeEnd); // Use the full slot duration

      const options = [];
      for (let min = startMinutes; min <= endMinutes - duration; min += 30) {
        const timeStart = minutesToTimeString(min);
        const timeEnd = minutesToTimeString(min + duration);

        // Calculate score based on frequency patterns
        const startHour = Math.floor(min / 60);
        const endHour = Math.ceil((min + duration) / 60);

        let score = 0;
        let daySpecificScore = 0;
        let generalScore = 0;

        // Use both general patterns and day-specific patterns
        for (let h = startHour; h < endHour; h++) {
          if (h < 24) {
            // Fixed: Properly handle the day-specific and general scores
            const daySpecificValue =
              patterns.frequencyByDayOfWeek[dayOfWeek][h] || 0;
            const generalValue = patterns.frequencyByHour[h] || 0;

            daySpecificScore += daySpecificValue * 3;
            generalScore += generalValue;
          }
        }

        score = daySpecificScore + generalScore;

        options.push({
          timeStart,
          timeEnd,
          score: score || 1, // Ensure minimum score of 1
          durationMinutes: duration,
        });
      }

      return options;
    })
    .sort((a, b) => b.score - a.score); // Higher score first

  return scoredSlots;
}

// Helper function to convert minutes to time string (HH:MM)
function minutesToTimeString(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

// Helper function to get time in minutes from HH:MM string
function getTimeInMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Helper function to fetch local events
async function getLocalEvents(city, timeframe) {
  try {
    // Pass timeframe as a query parameter to the local-events endpoint
    const response = await axios.get(
      `http://localhost:5000/api/local-events/${encodeURIComponent(
        city
      )}?timeframe=${encodeURIComponent(timeframe)}`
    );
    return response.data;
  } catch (error) {
    console.error("Error in getLocalEvents:", error);
    return [];
  }
}

// Helper function to find events by category and time range
async function findEventsByCategory(category, timeframe, userId) {
  try {
    const now = dayjs();
    const today = now.startOf("day");
    const currentTime = now.format("HH:mm");

    let startDate, endDate;

    // Determine time range based on timeframe
    if (timeframe === "future") {
      startDate = today.subtract(1, "day").valueOf();
      endDate = today.add(3, "month").valueOf();
    } else {
      startDate = today.subtract(3, "month").valueOf();
      endDate = today.add(1, "day").valueOf();
    }

    // Fetch events in the specified time range FOR THE CURRENT USER
    const events = await Event.findAll({
      where: {
        day: {
          [Op.between]: [startDate, endDate],
        },
        category: category,
        userId: userId, // Add user ID filter
      },
      order: [
        ["day", "ASC"],
        ["timeStart", "ASC"],
      ],
    });

    // Rest of the function remains the same...
    return events.filter((event) => {
      const eventDay = dayjs(parseInt(event.day));
      const isToday =
        eventDay.format("YYYY-MM-DD") === today.format("YYYY-MM-DD");

      if (!isToday) {
        return timeframe === "future"
          ? eventDay.isAfter(today)
          : eventDay.isBefore(today);
      }

      if (timeframe === "future") {
        return event.timeStart >= currentTime;
      } else {
        return event.timeStart < currentTime;
      }
    });
  } catch (error) {
    console.error("Error finding events by category:", error);
    return [];
  }
}

export default router;

import express from "express";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Event from "../models/Event.js";
import { Op } from "sequelize"; // Add this import for Sequelize operators

dotenv.config();
const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/", async (req, res) => {
  const { text } = req.body;

  const currentDate = dayjs().format("YYYY-MM-DD");

  let systemPrompt = `You are a calendar assistant that outputs JSON only.
  Extract the function and it's parameters from the user message, and provide a short but useful message for completion or missing any parameters.
  These are all your possible function: "
createEvent(title,startTime,endTime,date)
unknownFuntion()"
  Example format: {function: '', parameters: ['','',...], category: "", message: ""}.
  RULES:
  - the parameters should be in the order: title(string), startTime(24hr format), endTime(24hr format), date(YYYY-MM-DD)
  - if a parameter is not specified ask for it and make the parameter empty in the list
  - ignore day of week if mentioned
  - ignore formats like "now", "in 2 hours", "before that", etc.
  - date is by default currentDate if it is not specified
  - currentDate = ${currentDate}
  - you are gonna choose the category: Meeting, Workout, Study, Personal, Work, Social, Family, Health, Hobby, Chores, Travel, Finance, Learning, Self-care, Events, None`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `The user's message is: "${text}"` },
  ];

  try {
    const response = await groq.chat.completions.create({
      messages: messages,
      model: "llama3-70b-8192",
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const assistantResponse = JSON.parse(response.choices[0].message.content);
    const params = assistantResponse.parameters;
    const category = assistantResponse.category;

    if (assistantResponse.function === "createEvent") {
      if (params.every(Boolean)) {
        const title = params[0];
        const timeStart = params[1];
        const timeEnd = params[2];
        const date = params[3];
        const dayValue = dayjs(date).valueOf();

        // Check for overlapping events
        const overlappingEvents = await checkEventOverlaps(
          dayValue,
          timeStart,
          timeEnd
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
              category: category,
            },
            overlappingEvents: overlappingEvents.map((event) => ({
              id: event.id,
              title: event.title,
              timeStart: event.timeStart,
              timeEnd: event.timeEnd,
              category: event.category || "None",
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
async function checkEventOverlaps(day, timeStart, timeEnd) {
  try {
    // Find events on the same day
    const eventsOnSameDay = await Event.findAll({
      where: { day: day.toString() },
    });

    // Check for time overlaps using the same logic as elsewhere in the codebase
    const getTimeInMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const newStartMinutes = getTimeInMinutes(timeStart);
    const newEndMinutes = getTimeInMinutes(timeEnd);

    // Filter events that overlap with the proposed time slot
    return eventsOnSameDay.filter((event) => {
      const eventStartMinutes = getTimeInMinutes(event.timeStart);
      const eventEndMinutes = getTimeInMinutes(event.timeEnd);

      // Standard interval overlap check
      return (
        newStartMinutes < eventEndMinutes && eventStartMinutes < newEndMinutes
      );
    });
  } catch (error) {
    console.error("Error checking for event overlaps:", error);
    return []; // Return empty array if there's an error
  }
}

export default router;

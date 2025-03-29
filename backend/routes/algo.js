import express from "express";
import dayjs from "dayjs";
import { col, EmptyResultError, Op } from "sequelize";
import Event from "../models/Event.js";

const router = express.Router();

// Main algorithm endpoint
router.post("/", async (req, res) => {
  try {
    const { events, workingHoursStart, workingHoursEnd, category } = req.body;

    // Fetch historical events
    const today = dayjs();
    const oneMonthAgo = today.subtract(1, "month");
    const currentWeekEnd = dayjs().isoWeekday(7);

    const historicalEvents = await Event.findAll({
      where: {
        day: {
          [Op.between]: [
            oneMonthAgo.valueOf(),
            currentWeekEnd.endOf("day").valueOf(),
          ],
        },
      },
    });

    // Initialize a 24x7 matrix (rows: hours, columns: weekdays) for category frequency
    const categoryFrequencyMatrix = Array.from({ length: 24 }, () =>
      Array(7).fill(0)
    );

    // Populate the category frequency matrix
    historicalEvents.forEach((event) => {
      const { day, timeStart, timeEnd, category: eventCategory } = event;

      if (eventCategory !== category) return; // Skip events not in the specified category

      const eventDay = dayjs(parseInt(day)); // Convert day to a Day.js object
      const dayOfWeek = eventDay.isoWeekday() - 1; // Convert to 0-based index (Monday = 0)

      const startHour = parseInt(timeStart.split(":")[0]);
      const endHour = parseInt(timeEnd.split(":")[0]);

      // Increment the matrix for each hour the event spans
      for (let hour = startHour; hour < endHour; hour++) {
        categoryFrequencyMatrix[hour][dayOfWeek]++;
      }
    });

    // Initialize data structures
    const categoryDurations = {}; // To store event durations by category

    // Calculate durations and group by category
    historicalEvents.forEach((event) => {
      const { category, timeStart, timeEnd } = event.dataValues;

      const startHour = parseInt(timeStart.split(":")[0]);
      const startMinute = parseInt(timeStart.split(":")[1]);
      const endHour = parseInt(timeEnd.split(":")[0]);
      const endMinute = parseInt(timeEnd.split(":")[1]);

      const startTime = startHour + startMinute / 60; // Convert to hours
      const endTime = endHour + endMinute / 60; // Convert to hours
      const duration = endTime - startTime; // Duration in hours

      if (!categoryDurations[category]) {
        categoryDurations[category] = [];
      }
      categoryDurations[category].push(duration);
    });

    // Helper function to remove outliers using IQR
    const removeOutliers = (durations) => {
      durations.sort((a, b) => a - b); // Sort durations
      const q1 = durations[Math.floor(durations.length / 4)]; // First quartile
      const q3 = durations[Math.floor((durations.length * 3) / 4)]; // Third quartile
      const iqr = q3 - q1; // Interquartile range
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      return durations.filter(
        (duration) => duration >= lowerBound && duration <= upperBound
      );
    };

    // Calculate average durations and find min/max averages for each category
    const categoryStats = {};
    Object.keys(categoryDurations).forEach((category) => {
      const filteredDurations = removeOutliers(categoryDurations[category]);

      // Store min and max averages for each category
      categoryStats[category] = {
        minAverage: Math.min(...filteredDurations),
        maxAverage: Math.max(...filteredDurations),
      };
    });

    // Initialize a 24x7 matrix (rows: hours, columns: weekdays)
    const eventMatrix = Array.from({ length: 24 }, () => Array(7).fill(null));

    // Populate the matrix with events from the current week
    events.forEach((event) => {
      const { day, timeStart, timeEnd } = event;

      const eventDay = dayjs(parseInt(day)); // Convert day to a Day.js object
      const dayOfWeek = eventDay.isoWeekday() - 1; // Convert to 0-based index (Monday = 0)

      const startHour = parseInt(timeStart.split(":")[0]);
      const endHour = parseInt(timeEnd.split(":")[0]);

      // Populate the matrix for each hour the event spans
      for (let hour = startHour; hour < endHour; hour++) {
        eventMatrix[hour][dayOfWeek] = event; // Assign the event to the matrix cell
      }
    });

    // Initialize the rank object
    const rank = {};

    // Phase 1: Rank events based on room to increase
    events.forEach((event) => {
      const { day, timeStart, timeEnd, category: eventCategory, id } = event;

      if (eventCategory !== category) return; // Skip events not in the specified category

      const eventDay = dayjs(parseInt(day));
      const dayOfWeek = eventDay.isoWeekday() - 1; // Convert to 0-based index (Monday = 0)

      const startHour = parseInt(timeStart.split(":")[0]);
      const endHour = parseInt(timeEnd.split(":")[0]);

      // Check the previous and next slots in the frequency matrix
      const previousSlot =
        startHour > 0 && eventMatrix[startHour - 1][dayOfWeek] === null // Ensure no event in the previous slot
          ? categoryFrequencyMatrix[startHour - 1][dayOfWeek]
          : 0;
      const nextSlot =
        endHour < 24 && eventMatrix[endHour][dayOfWeek] === null // Ensure no event in the next slot
          ? categoryFrequencyMatrix[endHour][dayOfWeek]
          : 0;

      // Determine the maximum score for this event
      const maxScore = Math.max(previousSlot, nextSlot);

      if (!rank[id]) {
        rank[id] = [];
      }

      // Add the event's rank to the rank object
      rank[id].push({
        maxScore: maxScore,
        direction: previousSlot > nextSlot ? "backward" : "forward",
      });
    });

    // Rank empty slots in the event matrix
    const rankForEmptySlots = [];

    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        // Check if the slot is empty
        if (eventMatrix[hour][day] === null) {
          // Check if there is enough room for the minimum average length
          let hasRoom = true;
          for (let i = 0; i < categoryStats.minAverage; i++) {
            if (hour + i >= 24 || eventMatrix[hour + i][day] !== null) {
              hasRoom = false;
              break;
            }
          }

          if (hasRoom) {
            // Save the slot and its rank
            rankForEmptySlots.push({
              hour,
              day,
              rank: categoryFrequencyMatrix[hour][day],
            });
          }
        }
      }
    }

    // Find the maximum rank from both rank and rankForEmptySlots
    let maxRank = -Infinity;
    let maxRankCase = null;

    // Find the maximum rank from the rank dictionary
    Object.entries(rank).forEach(([eventId, eventRanks]) => {
      // Calculate the maximum score for this event
      const maxEventRank = eventRanks.reduce(
        (max, rankEntry) => {
          return rankEntry.maxScore > max.maxScore ? rankEntry : max;
        },
        { maxScore: -Infinity, direction: null }
      );

      // Compare with the global maxRank
      if (maxEventRank.maxScore > maxRank) {
        maxRank = maxEventRank.maxScore;
        maxRankCase = {
          max: maxRank,
          type: "event",
          eventId,
          direction: maxEventRank.direction, // Remember the direction
        };
      }
    });

    // Check the rankForEmptySlots array for the maximum rank
    rankForEmptySlots.forEach((slot) => {
      if (slot.rank > maxRank) {
        maxRank = slot.rank;
        maxRankCase = {
          type: "slot",
          hour: slot.hour,
          day: slot.day,
        }; // Store the hour and day
      }
    });

    // Log the case with the maximum rank and take action

    // Return the updated events
    res.status(200).json({
      events: events,
    });
  } catch (error) {
    console.error("Error increasing events:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

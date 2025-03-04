import express from "express";
import dayjs from "dayjs";
import { Op } from "sequelize";
import Event from "../models/Event.js";
import isBetween from "dayjs/plugin/isBetween.js";

// Extend dayjs with the isBetween plugin
dayjs.extend(isBetween);

const router = express.Router();

// Helper function for time calculations
function getMinutesFromTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

// Check if event overlaps with locked events
function checkOverlap(event, existingEvents) {
  const eventStart = getMinutesFromTime(event.timeStart);
  const eventEnd = getMinutesFromTime(event.timeEnd);
  const eventId = event.id;
  const eventDay = event.day; // Get the event's day

  console.log(
    `Checking overlap for event ID=${eventId}, Day=${dayjs(
      parseInt(eventDay)
    ).format("ddd DD/MM")}, Time=${event.timeStart}-${event.timeEnd}`
  );

  // Make sure event end time is after start time
  if (eventEnd <= eventStart) {
    console.warn(
      `Event has invalid time range: start=${event.timeStart}, end=${event.timeEnd}`
    );
    return true; // Consider this an overlap to prevent invalid events
  }

  for (const otherEvent of existingEvents) {
    // Skip if it's the same event or if the other event is not locked
    if (otherEvent.id === eventId || !otherEvent.locked) continue;

    // Skip if events are on different days
    if (otherEvent.day !== eventDay) continue;

    const otherStart = getMinutesFromTime(otherEvent.timeStart);
    const otherEnd = getMinutesFromTime(otherEvent.timeEnd);

    // Skip events with invalid time ranges
    if (otherEnd <= otherStart) {
      console.warn(
        `Other event has invalid time range: ID=${otherEvent.id}, start=${otherEvent.timeStart}, end=${otherEvent.timeEnd}`
      );
      continue;
    }

    // Check for overlap
    const hasOverlap = eventStart < otherEnd && eventEnd > otherStart;

    if (hasOverlap) {
      console.log(
        `Overlap detected with locked event ID=${otherEvent.id}, Day=${dayjs(
          parseInt(otherEvent.day)
        ).format("ddd DD/MM")}, Time=${otherEvent.timeStart}-${
          otherEvent.timeEnd
        }`
      );
      return true;
    }
  }

  console.log(`No overlaps found for event ID=${eventId}`);
  return false;
}

// Main algorithm endpoint
router.post("/", async (req, res) => {
  try {
    const { events, timeChange, category } = req.body;

    console.log("Algorithm input:");
    console.log(`Category to increase: "${category}"`);
    console.log(`Time change amount: ${timeChange} minutes`);
    console.log(`Total events received: ${events.length}`);

    // Debug all events to see what's coming from the frontend
    console.log("All events received:");
    events.forEach((event, i) => {
      console.log(
        `Event ${i + 1}: ID=${event.id}, Category=${event.category}, Day=${
          event.day
        }, Time=${event.timeStart}-${event.timeEnd}, Locked=${event.locked}`
      );
    });

    // Get study events and sort them chronologically
    const studyEvents = events
      .filter((event) => event.category === category)
      .sort((a, b) => {
        // First compare by day using dayjs to properly parse timestamps
        const dayA = dayjs(parseInt(a.day));
        const dayB = dayjs(parseInt(b.day));

        if (!dayA.isSame(dayB, "day")) {
          return dayA.valueOf() - dayB.valueOf();
        }

        // If same day, sort by start time
        const aStart = getMinutesFromTime(a.timeStart);
        const bStart = getMinutesFromTime(b.timeStart);
        return aStart - bStart;
      });

    console.log(
      `Found ${studyEvents.length} events with category "${category}"`
    );

    if (studyEvents.length === 0) {
      return res.status(200).json({
        events,
        message: `No ${category} events found to increase.`,
        increase: { success: false },
      });
    }

    // Make a deep copy of the events array
    const modifiedEvents = JSON.parse(JSON.stringify(events));

    // Track results of operations
    let increasedEvent = null;
    let failedEvents = 0;

    // Get historical data for the category to make smarter decisions
    const today = dayjs();
    const threeMonthsAgo = today.subtract(3, "month");
    const currentWeekStart = today.startOf("week").add(1, "day");
    const currentWeekEnd = currentWeekStart.add(6, "day");

    // Fetch historical events for this category
    const historicalEvents = await Event.findAll({
      where: {
        category: category,
        day: {
          [Op.between]: [
            threeMonthsAgo.valueOf(),
            currentWeekStart.subtract(1, "day").valueOf(),
          ],
        },
      },
    });

    // Process historical data to get patterns
    const categoryAnalysis = processHistoricalData(historicalEvents);

    // Log the events of the specified category for the current week
    const currentWeekEvents = studyEvents.filter((event) => {
      const eventDay = dayjs(parseInt(event.day));
      return eventDay.isBetween(currentWeekStart, currentWeekEnd, null, "[]");
    });

    console.log("Current week events:");
    currentWeekEvents.forEach((event, i) => {
      console.log(
        `Event ${i + 1}: ID=${event.id}, Day=${dayjs(
          parseInt(event.day)
        ).format("ddd DD/MM")}, Time=${event.timeStart}-${
          event.timeEnd
        }, Locked=${event.locked}`
      );
    });

    // Function to process a single event with a specific strategy
    function processEventWithStrategy(studyEvent, strategy) {
      const eventDay = dayjs(parseInt(studyEvent.day)).day();
      const eventStart = getMinutesFromTime(studyEvent.timeStart);
      const eventEnd = getMinutesFromTime(studyEvent.timeEnd);

      // Store original times for logging
      const originalStartTime = studyEvent.timeStart;
      const originalEndTime = studyEvent.timeEnd;

      // Define variables for both forward and backward extension
      let forwardEndMinutes = eventEnd + timeChange;
      let backwardStartMinutes = Math.max(0, eventStart - timeChange);

      // Handle day boundary
      forwardEndMinutes = Math.min(forwardEndMinutes, 24 * 60 - 1);

      // Variables to track best pattern matches
      let bestForwardFit = null;
      let bestBackwardFit = null;
      let bestForwardScore = -1;
      let bestBackwardScore = -1;
      let forwardStrategy = "none";
      let backwardStrategy = "none";

      // Try daily patterns if that's the requested strategy
      if (
        strategy === "daily" &&
        categoryAnalysis &&
        categoryAnalysis.byDay &&
        categoryAnalysis.byDay[eventDay] &&
        categoryAnalysis.byDay[eventDay].commonTimeRanges.length > 0
      ) {
        const dailyPatterns = categoryAnalysis.byDay[eventDay].commonTimeRanges;

        // Check patterns for forward extension
        for (const pattern of dailyPatterns) {
          const patternStart = getMinutesFromTime(pattern.start);
          const patternEnd = getMinutesFromTime(pattern.end);

          // If event overlaps with this pattern
          if (eventStart < patternEnd && patternStart < eventEnd) {
            // Calculate how much the event is already within this pattern
            const overlapStart = Math.max(eventStart, patternStart);
            const overlapEnd = Math.min(eventEnd, patternEnd);
            const overlapDuration = overlapEnd - overlapStart;

            // Calculate how much we can grow within this pattern (forward)
            const roomToGrowForward = patternEnd - eventEnd;
            if (roomToGrowForward > 0) {
              // Score is based on overlap + room to grow + frequency
              const forwardScore =
                overlapDuration +
                Math.min(roomToGrowForward, timeChange) +
                pattern.frequency * 10;

              // Keep the best matching pattern
              if (forwardScore > bestForwardScore) {
                bestForwardScore = forwardScore;
                bestForwardFit = pattern;
                forwardStrategy = "daily-pattern";
              }
            }

            // Calculate how much we can grow within this pattern (backward)
            const roomToGrowBackward = eventStart - patternStart;
            if (roomToGrowBackward > 0) {
              // Score is based on overlap + room to grow + frequency
              const backwardScore =
                overlapDuration +
                Math.min(roomToGrowBackward, timeChange) +
                pattern.frequency * 10;

              // Keep the best matching pattern
              if (backwardScore > bestBackwardScore) {
                bestBackwardScore = backwardScore;
                bestBackwardFit = pattern;
                backwardStrategy = "daily-pattern";
              }
            }
          }
        }
      }

      // Try weekly patterns if that's the requested strategy
      else if (strategy === "weekly" && categoryAnalysis) {
        const weeklyPatterns = getWeeklyPatterns(categoryAnalysis);

        // Check patterns for forward extension
        for (const pattern of weeklyPatterns) {
          const patternStart = getMinutesFromTime(pattern.start);
          const patternEnd = getMinutesFromTime(pattern.end);

          // If event overlaps with this pattern
          if (eventStart < patternEnd && patternStart < eventEnd) {
            // Calculate how much the event is already within this pattern
            const overlapStart = Math.max(eventStart, patternStart);
            const overlapEnd = Math.min(eventEnd, patternEnd);
            const overlapDuration = overlapEnd - overlapStart;

            // Calculate how much we can grow within this pattern (forward)
            const roomToGrowForward = patternEnd - eventEnd;
            if (roomToGrowForward > 0) {
              // Score is based on overlap + room to grow + frequency
              const forwardScore =
                overlapDuration +
                Math.min(roomToGrowForward, timeChange) +
                pattern.frequency * 10;

              // Keep the best matching pattern
              if (forwardScore > bestForwardScore) {
                bestForwardScore = forwardScore;
                bestForwardFit = pattern;
                forwardStrategy = "weekly-pattern";
              }
            }

            // Calculate how much we can grow within this pattern (backward)
            const roomToGrowBackward = eventStart - patternStart;
            if (roomToGrowBackward > 0) {
              // Score is based on overlap + room to grow + frequency
              const backwardScore =
                overlapDuration +
                Math.min(roomToGrowBackward, timeChange) +
                pattern.frequency * 10;

              // Keep the best matching pattern
              if (backwardScore > bestBackwardScore) {
                bestBackwardScore = backwardScore;
                bestBackwardFit = pattern;
                backwardStrategy = "weekly-pattern";
              }
            }
          }
        }
      }

      // Use default strategy if that's the requested strategy
      else if (strategy === "default") {
        forwardStrategy = "default";
      }

      // Decide on which direction to use based on score
      let tempEvent = null;
      let newStartTime = originalStartTime;
      let newEndTime = originalEndTime;
      let directionUsed = null;
      let increaseStrategy = "none";

      // If both directions have patterns, choose the better one
      if (bestForwardScore > 0 && bestBackwardScore > 0) {
        if (bestForwardScore >= bestBackwardScore) {
          // Use forward extension
          if (bestForwardFit) {
            const patternEnd = getMinutesFromTime(bestForwardFit.end);
            forwardEndMinutes = Math.min(forwardEndMinutes, patternEnd);
          }

          // Format new end time
          const newEndHours = Math.floor(forwardEndMinutes / 60);
          const newEndMins = forwardEndMinutes % 60;
          newEndTime = `${newEndHours.toString().padStart(2, "0")}:${newEndMins
            .toString()
            .padStart(2, "0")}`;

          tempEvent = {
            ...studyEvent,
            timeEnd: newEndTime,
          };

          increaseStrategy = forwardStrategy;
          directionUsed = "forward";
        } else {
          // Use backward extension
          if (bestBackwardFit) {
            const patternStart = getMinutesFromTime(bestBackwardFit.start);
            backwardStartMinutes = Math.max(backwardStartMinutes, patternStart);
          }

          // Format new start time
          const newStartHours = Math.floor(backwardStartMinutes / 60);
          const newStartMins = backwardStartMinutes % 60;
          newStartTime = `${newStartHours
            .toString()
            .padStart(2, "0")}:${newStartMins.toString().padStart(2, "0")}`;

          tempEvent = {
            ...studyEvent,
            timeStart: newStartTime,
          };

          increaseStrategy = backwardStrategy;
          directionUsed = "backward";
        }
      }
      // Only forward pattern available
      else if (bestForwardScore > 0 || forwardStrategy === "default") {
        if (bestForwardFit) {
          const patternEnd = getMinutesFromTime(bestForwardFit.end);
          forwardEndMinutes = Math.min(forwardEndMinutes, patternEnd);
        }

        // Format new end time
        const newEndHours = Math.floor(forwardEndMinutes / 60);
        const newEndMins = forwardEndMinutes % 60;
        newEndTime = `${newEndHours.toString().padStart(2, "0")}:${newEndMins
          .toString()
          .padStart(2, "0")}`;

        tempEvent = {
          ...studyEvent,
          timeEnd: newEndTime,
        };

        increaseStrategy = forwardStrategy;
        directionUsed = "forward";
      }
      // Only backward pattern available
      else if (bestBackwardScore > 0) {
        if (bestBackwardFit) {
          const patternStart = getMinutesFromTime(bestBackwardFit.start);
          backwardStartMinutes = Math.max(backwardStartMinutes, patternStart);
        }

        // Format new start time
        const newStartHours = Math.floor(backwardStartMinutes / 60);
        const newStartMins = backwardStartMinutes % 60;
        newStartTime = `${newStartHours
          .toString()
          .padStart(2, "0")}:${newStartMins.toString().padStart(2, "0")}`;

        tempEvent = {
          ...studyEvent,
          timeStart: newStartTime,
        };

        increaseStrategy = backwardStrategy;
        directionUsed = "backward";
      }

      if (tempEvent === null) {
        return {
          increased: false,
          strategy: "none",
          message: "No applicable pattern found",
        };
      }

      // Check if we're actually changing the time (don't consider it an increase if times are the same)
      if (directionUsed === "forward" && newEndTime === originalEndTime) {
        return {
          increased: false,
          strategy: increaseStrategy,
          message: "Cannot extend beyond end of day",
        };
      }

      if (directionUsed === "backward" && newStartTime === originalStartTime) {
        return {
          increased: false,
          strategy: increaseStrategy,
          message: "Cannot extend before start of day",
        };
      }

      // Check if modification would cause overlap with locked events
      if (!checkOverlap(tempEvent, modifiedEvents)) {
        // Return success
        return {
          increased: true,
          strategy: increaseStrategy,
          direction: directionUsed,
          originalStartTime: originalStartTime,
          originalEndTime: originalEndTime,
          newStartTime: newStartTime,
          newEndTime: newEndTime,
          eventId: studyEvent.id,
          day: dayjs(parseInt(studyEvent.day)).format("ddd DD/MM"),
        };
      } else {
        // Return failure due to overlap
        return {
          increased: false,
          strategy: increaseStrategy,
          message: "Overlap with locked event detected",
        };
      }
    }

    // Group events by day for easier tracking
    const eventsByDay = studyEvents.reduce((acc, event) => {
      const day = dayjs(parseInt(event.day)).format("YYYY-MM-DD");
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(event);
      return acc;
    }, {});

    // Sort days chronologically
    // The existing sort() method sorts lexicographically, which is fine for YYYY-MM-DD format,
    // but let's be extra safe by sorting using dayjs
    const sortedDays = Object.keys(eventsByDay).sort((a, b) => {
      return dayjs(a).valueOf() - dayjs(b).valueOf();
    });

    console.log("Sorted days to process:", sortedDays);

    // Try each phase in order
    const tryPhase = (strategy) => {
      let phaseSuccess = false;

      // Go through each day in the week
      for (const day of sortedDays) {
        const dayEvents = eventsByDay[day];
        console.log(`Trying ${strategy} strategy for ${day}`);

        // Try each event for this day
        for (const studyEvent of dayEvents) {
          const result = processEventWithStrategy(studyEvent, strategy);
          console.log(
            `- Event ${studyEvent.id}: ${
              result.increased ? "SUCCESS" : "FAILED - " + result.message
            }`
          );

          if (result.increased) {
            // Update the event in modifiedEvents array
            const index = modifiedEvents.findIndex(
              (e) => e.id === studyEvent.id
            );
            if (index !== -1) {
              if (result.direction === "forward") {
                modifiedEvents[index].timeEnd = result.newEndTime;
              } else {
                modifiedEvents[index].timeStart = result.newStartTime;
              }

              // Store info about the increased event
              increasedEvent = result;
              phaseSuccess = true;

              // Return immediately after finding one event to increase
              return true; // <-- This is the key change
            }
          }
        }
      }

      return phaseSuccess;
    };

    // Try each phase in order
    console.log("Starting Phase 1: Daily Patterns");
    const dailyPhaseSuccess = tryPhase("daily");

    if (!dailyPhaseSuccess) {
      console.log("Starting Phase 2: Weekly Patterns");
      const weeklyPhaseSuccess = tryPhase("weekly");

      if (!weeklyPhaseSuccess) {
        console.log("Starting Phase 3: Default Strategy");
        tryPhase("default");
      }
    }

    // Debug info after all phases
    console.log("Debug info for algorithm execution:");
    console.log(`Total study events found: ${studyEvents.length}`);
    console.log(`Events successfully increased: ${increasedEvent ? 1 : 0}`);
    console.log(`Failed events: ${failedEvents}`);

    // Log details about each study event (to see if they're valid candidates)
    console.log("Study events candidates:");
    studyEvents.forEach((event, index) => {
      console.log(
        `Event ${index + 1}: ID=${event.id}, Day=${dayjs(
          parseInt(event.day)
        ).format("ddd DD/MM")}, Time=${event.timeStart}-${
          event.timeEnd
        }, Locked=${event.locked}`
      );

      // Test each event with each strategy to see why it's failing
      const dailyResult = processEventWithStrategy(event, "daily");
      const weeklyResult = processEventWithStrategy(event, "weekly");
      const defaultResult = processEventWithStrategy(event, "default");

      console.log(
        `  Daily strategy: ${
          dailyResult.increased ? "SUCCESS" : `FAILED - ${dailyResult.message}`
        }`
      );
      console.log(
        `  Weekly strategy: ${
          weeklyResult.increased
            ? "SUCCESS"
            : `FAILED - ${weeklyResult.message}`
        }`
      );
      console.log(
        `  Default strategy: ${
          defaultResult.increased
            ? "SUCCESS"
            : `FAILED - ${defaultResult.message}`
        }`
      );
    });

    // Prepare the summary message
    let summaryMessage;
    if (increasedEvent) {
      summaryMessage = `Successfully increased ${category} event on ${increasedEvent.day} using ${increasedEvent.strategy} strategy.`;

      if (increasedEvent.direction === "forward") {
        summaryMessage += ` Extended end time from ${increasedEvent.originalEndTime} to ${increasedEvent.newEndTime}.`;
      } else {
        summaryMessage += ` Extended start time from ${increasedEvent.originalStartTime} to ${increasedEvent.newStartTime}.`;
      }
    } else {
      summaryMessage = `Could not increase any ${category} events due to overlaps or constraints.`;
    }

    // Prepare detailed response
    const responseData = {
      events: modifiedEvents,
      message: summaryMessage,
      increase: {
        success: increasedEvent !== null,
        totalIncreased: increasedEvent ? 1 : 0,
        totalFailed: failedEvents,
        timeChange: timeChange,
        category: category,
        results: increasedEvent ? [increasedEvent] : [],
        patternsConsidered: {
          daily: categoryAnalysis
            ? categoryAnalysis.byDay.reduce(
                (sum, day) => sum + day.commonTimeRanges.length,
                0
              )
            : 0,
          weekly: categoryAnalysis
            ? getWeeklyPatterns(categoryAnalysis).length
            : 0,
        },
      },
    };

    console.log(summaryMessage);
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error modifying events:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/learn", async (req, res) => {
  try {
    const today = dayjs();
    const threeMonthsAgo = today.subtract(3, "month");
    const currentWeekStart = today.startOf("week").add(1, "day");

    const historicalEvents = await Event.findAll({
      where: {
        day: {
          [Op.between]: [
            threeMonthsAgo.valueOf(),
            currentWeekStart.subtract(1, "day").valueOf(),
          ],
        },
      },
    });

    const eventsByCategory = {};
    historicalEvents.forEach((event) => {
      if (!eventsByCategory[event.category]) {
        eventsByCategory[event.category] = [];
      }
      eventsByCategory[event.category].push(event);
    });

    const learningData = {};
    for (const [category, events] of Object.entries(eventsByCategory)) {
      const categoryAnalysis = processHistoricalData(events);

      if (categoryAnalysis) {
        learningData[category] = {
          dailyPatterns: categoryAnalysis.byDay.map((day, index) => ({
            day: index,
            patterns: day.commonTimeRanges,
          })),
          weeklyPatterns: getWeeklyPatterns(categoryAnalysis),
          stats: categoryAnalysis.globalStats,
        };
      }
    }

    res.status(200).json({
      success: true,
      data: learningData,
      message: "Learning parameters retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting learning parameters:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to find common time ranges
function findCommonTimeRanges(timeSlots) {
  if (timeSlots.every((slot) => slot === 0)) {
    return [];
  }

  const maxValue = Math.max(...timeSlots);
  const threshold = maxValue > 0 ? maxValue / 2 : 0;
  const ranges = [];
  let start = null;

  timeSlots.forEach((count, slotIndex) => {
    if (count >= threshold) {
      if (start === null) start = slotIndex;
    } else if (start !== null) {
      ranges.push({
        start: formatMinuteSlot(start),
        end: formatMinuteSlot(slotIndex),
        frequency:
          Math.round(
            (timeSlots.slice(start, slotIndex).reduce((a, b) => a + b, 0) /
              (slotIndex - start)) *
              100
          ) / 100,
      });
      start = null;
    }
  });

  // Handle range that ends at last slot
  if (start !== null) {
    ranges.push({
      start: formatMinuteSlot(start),
      end: "24:00",
      frequency:
        Math.round(
          (timeSlots.slice(start).reduce((a, b) => a + b, 0) / (96 - start)) *
            100
        ) / 100,
    });
  }

  return ranges;
}

// Helper function to format minute slot index to time string
function formatMinuteSlot(slotIndex) {
  const totalMinutes = slotIndex * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

// Update processHistoricalData to track 15-minute intervals
function processHistoricalData(events) {
  if (events.length === 0) return null;

  const categoryAnalysis = {
    byDay: Array(7)
      .fill()
      .map(() => ({
        timeSlots: Array(96).fill(0), // 96 slots for 24 hours in 15-min intervals
        commonTimeRanges: [],
      })),
    globalStats: {
      minDuration: Infinity,
      maxDuration: 0,
      averageDuration: 0,
      totalEvents: 0,
    },
  };

  events.forEach((event) => {
    const dayOfWeek = dayjs(parseInt(event.day)).day();
    const startMinutes = getMinutesFromTime(event.timeStart);
    const endMinutes = getMinutesFromTime(event.timeEnd);
    const duration = endMinutes - startMinutes;

    // Update timeSlots with 15-minute granularity
    const startSlot = Math.floor(startMinutes / 15);
    const endSlot = Math.ceil(endMinutes / 15);

    for (let slot = startSlot; slot < endSlot; slot++) {
      if (slot < 96) {
        // 96 fifteen-minute slots in a day
        const slotStartMinute = slot * 15;
        const slotEndMinute = (slot + 1) * 15;
        const overlapStart = Math.max(startMinutes, slotStartMinute);
        const overlapEnd = Math.min(endMinutes, slotEndMinute);
        const overlapDuration = overlapEnd - overlapStart;

        if (overlapDuration > 0) {
          categoryAnalysis.byDay[dayOfWeek].timeSlots[slot] +=
            overlapDuration / 15; // Normalize to 15-min slot
        }
      }
    }

    // Update global stats
    categoryAnalysis.globalStats.minDuration = Math.min(
      categoryAnalysis.globalStats.minDuration,
      duration
    );
    categoryAnalysis.globalStats.maxDuration = Math.max(
      categoryAnalysis.globalStats.maxDuration,
      duration
    );
    categoryAnalysis.globalStats.totalEvents++;
  });

  // Process common time ranges
  categoryAnalysis.byDay.forEach((day) => {
    day.commonTimeRanges = findCommonTimeRanges(day.timeSlots);
  });

  return categoryAnalysis;
}

// Helper function to extract weekly patterns
function getWeeklyPatterns(categoryAnalysis) {
  const allTimeRanges = categoryAnalysis.byDay.flatMap((day) =>
    day.commonTimeRanges.filter((range) => range.frequency > 0)
  );

  // Group by time range and average frequencies
  const rangeMap = new Map();
  allTimeRanges.forEach((range) => {
    const key = `${range.start}-${range.end}`;
    if (!rangeMap.has(key)) {
      rangeMap.set(key, {
        start: range.start,
        end: range.end,
        frequencies: [],
      });
    }
    rangeMap.get(key).frequencies.push(range.frequency);
  });

  // Calculate average frequency for each time range
  return Array.from(rangeMap.values())
    .map(({ start, end, frequencies }) => ({
      start,
      end,
      frequency: frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

export default router;

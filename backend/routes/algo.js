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

// Add a new helper function to find free time slots within a pattern
function findFreeSlotInPattern(pattern, day, allEvents, defaultMinDuration) {
  // Use pattern-specific minimum duration if available, otherwise fall back to global
  const minDuration = pattern.minDuration || defaultMinDuration;

  const patternStart = getMinutesFromTime(pattern.start);
  const patternEnd = getMinutesFromTime(pattern.end);

  // Get all events for this day
  const eventsForDay = allEvents.filter((event) =>
    dayjs(parseInt(event.day)).isSame(dayjs(day), "day")
  );

  // Sort events by start time
  eventsForDay.sort(
    (a, b) => getMinutesFromTime(a.timeStart) - getMinutesFromTime(b.timeStart)
  );

  // Build timeline of occupied slots
  let freeSlots = [{ start: patternStart, end: patternEnd }];

  // Remove occupied time slots
  for (const event of eventsForDay) {
    const eventStart = getMinutesFromTime(event.timeStart);
    const eventEnd = getMinutesFromTime(event.timeEnd);

    // Skip events outside our pattern
    if (eventEnd <= patternStart || eventStart >= patternEnd) continue;

    // Process each existing free slot
    const newFreeSlots = [];
    for (const slot of freeSlots) {
      // Event completely overlaps slot - remove this slot
      if (eventStart <= slot.start && eventEnd >= slot.end) {
        continue;
      }
      // Event is in the middle of slot - split into two
      else if (eventStart > slot.start && eventEnd < slot.end) {
        newFreeSlots.push({ start: slot.start, end: eventStart });
        newFreeSlots.push({ start: eventEnd, end: slot.end });
      }
      // Event overlaps beginning of slot
      else if (eventStart <= slot.start && eventEnd > slot.start) {
        newFreeSlots.push({ start: eventEnd, end: slot.end });
      }
      // Event overlaps end of slot
      else if (eventStart < slot.end && eventEnd >= slot.end) {
        newFreeSlots.push({ start: slot.start, end: eventStart });
      }
      // No overlap, keep slot as is
      else {
        newFreeSlots.push(slot);
      }
    }
    freeSlots = newFreeSlots;
  }

  // Find the best free slot (longest one that meets minimum duration)
  let bestSlot = null;
  let bestLength = 0;

  for (const slot of freeSlots) {
    const duration = slot.end - slot.start;
    if (duration >= minDuration && duration > bestLength) {
      bestSlot = slot;
      bestLength = duration;
    }
  }

  if (bestSlot) {
    // Calculate end time (either end of slot or start + minDuration)
    const endMinutes = Math.min(bestSlot.start + minDuration, bestSlot.end);

    const startHours = Math.floor(bestSlot.start / 60);
    const startMins = bestSlot.start % 60;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;

    return {
      startTime: `${startHours.toString().padStart(2, "0")}:${startMins
        .toString()
        .padStart(2, "0")}`,
      endTime: `${endHours.toString().padStart(2, "0")}:${endMins
        .toString()
        .padStart(2, "0")}`,
    };
  }

  return null;
}

// Helper function to check for overlaps
function checkOverlap(event, existingEvents) {
  const eventStart = getMinutesFromTime(event.timeStart);
  const eventEnd = getMinutesFromTime(event.timeEnd);
  const eventId = event.id;
  const eventDay = event.day;

  if (eventEnd <= eventStart) {
    console.warn(
      `Event has invalid time range: start=${event.timeStart}, end=${event.timeEnd}`
    );
    return true;
  }

  for (const otherEvent of existingEvents) {
    if (otherEvent.id === eventId || !otherEvent.locked) continue;
    if (otherEvent.day !== eventDay) continue;

    const otherStart = getMinutesFromTime(otherEvent.timeStart);
    const otherEnd = getMinutesFromTime(otherEvent.timeEnd);

    if (otherEnd <= otherStart) {
      console.warn(
        `Other event has invalid time range: ID=${otherEvent.id}, start=${otherEvent.timeStart}, end=${otherEvent.timeEnd}`
      );
      continue;
    }

    const hasOverlap = eventStart < otherEnd && eventEnd > otherStart;

    if (hasOverlap) {
      return true;
    }
  }

  return false;
}

// Add this new function to check for ANY overlap (not just with locked events)
function checkAnyOverlap(newEvent, allEvents) {
  const eventStart = getMinutesFromTime(newEvent.timeStart);
  const eventEnd = getMinutesFromTime(newEvent.timeEnd);
  // Convert to dayjs for consistent comparison
  const eventDayjs = dayjs(parseInt(newEvent.day));

  if (eventEnd <= eventStart) {
    console.warn(
      `Event has invalid time range: start=${newEvent.timeStart}, end=${newEvent.timeEnd}`
    );
    return true;
  }

  for (const otherEvent of allEvents) {
    if (otherEvent.id === newEvent.id) continue;

    // Convert other event's day to dayjs for comparison
    const otherDayjs = dayjs(parseInt(otherEvent.day));

    // Compare using isSame to handle edge cases
    if (!eventDayjs.isSame(otherDayjs, "day")) continue;

    const otherStart = getMinutesFromTime(otherEvent.timeStart);
    const otherEnd = getMinutesFromTime(otherEvent.timeEnd);

    if (otherEnd <= otherStart) {
      console.warn(
        `Other event has invalid time range: ID=${otherEvent.id}, start=${otherEvent.timeStart}, end=${otherEvent.timeEnd}`
      );
      continue;
    }

    const hasOverlap = eventStart < otherEnd && eventEnd > otherStart;

    if (hasOverlap) {
      return true;
    }
  }

  return false;
}

// Helper function to check for duplicates
function isDuplicateEvent(newEvent, allEvents) {
  const newEventDayjs = dayjs(parseInt(newEvent.day));

  return allEvents.some((event) => {
    const sameTime =
      event.timeStart === newEvent.timeStart &&
      event.timeEnd === newEvent.timeEnd;
    const sameDay = dayjs(parseInt(event.day)).isSame(newEventDayjs, "day");
    const sameCategory = event.category === newEvent.category;

    return sameTime && sameDay && sameCategory;
  });
}

// Main algorithm endpoint
router.post("/", async (req, res) => {
  try {
    const { events, timeChange, category } = req.body;

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
    // Start from Monday by adding 1 day to start of week
    const currentWeekStart = today.startOf("week").add(1, "day");
    const currentWeekEnd = currentWeekStart.add(6, "day");

    // Fetch historical events for this category - EXCLUDE current week
    const historicalEvents = await Event.findAll({
      where: {
        category: category,
        day: {
          [Op.between]: [
            threeMonthsAgo.valueOf(),
            // Use the day before current week starts as the end boundary
            currentWeekStart.subtract(1, "day").endOf("day").valueOf(),
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

    // Function to process a single event with a specific strategy
    function processEventWithStrategy(studyEvent, strategy) {
      const eventDay = dayjs(parseInt(studyEvent.day)).day();
      const eventStart = getMinutesFromTime(studyEvent.timeStart);
      const eventEnd = getMinutesFromTime(studyEvent.timeEnd);

      const originalStartTime = studyEvent.timeStart;
      const originalEndTime = studyEvent.timeEnd;

      let forwardEndMinutes = eventEnd + timeChange;
      let backwardStartMinutes = Math.max(0, eventStart - timeChange);

      forwardEndMinutes = Math.min(forwardEndMinutes, 24 * 60 - 1);

      let bestForwardFit = null;
      let bestBackwardFit = null;
      let bestForwardScore = -1;
      let bestBackwardScore = -1;
      let forwardStrategy = "none";
      let backwardStrategy = "none";

      if (
        strategy === "daily" &&
        categoryAnalysis &&
        categoryAnalysis.byDay &&
        categoryAnalysis.byDay[eventDay] &&
        categoryAnalysis.byDay[eventDay].commonTimeRanges.length > 0
      ) {
        const dailyPatterns = categoryAnalysis.byDay[eventDay].commonTimeRanges;

        for (const pattern of dailyPatterns) {
          const patternStart = getMinutesFromTime(pattern.start);
          const patternEnd = getMinutesFromTime(pattern.end);

          if (eventStart < patternEnd && patternStart < eventEnd) {
            const overlapStart = Math.max(eventStart, patternStart);
            const overlapEnd = Math.min(eventEnd, patternEnd);
            const overlapDuration = overlapEnd - overlapStart;

            const roomToGrowForward = patternEnd - eventEnd;
            if (roomToGrowForward > 0) {
              const forwardScore =
                overlapDuration +
                Math.min(roomToGrowForward, timeChange) +
                pattern.frequency * 10;
              if (forwardScore > bestForwardScore) {
                bestForwardScore = forwardScore;
                bestForwardFit = pattern;
                forwardStrategy = "daily-pattern";
              }
            }

            const roomToGrowBackward = eventStart - patternStart;
            if (roomToGrowBackward > 0) {
              const backwardScore =
                overlapDuration +
                Math.min(roomToGrowBackward, timeChange) +
                pattern.frequency * 10;
              if (backwardScore > bestBackwardScore) {
                bestBackwardScore = backwardScore;
                bestBackwardFit = pattern;
                backwardStrategy = "daily-pattern";
              }
            }
          }
        }
      } else if (strategy === "weekly" && categoryAnalysis) {
        const weeklyPatterns = getWeeklyPatterns(categoryAnalysis);

        for (const pattern of weeklyPatterns) {
          const patternStart = getMinutesFromTime(pattern.start);
          const patternEnd = getMinutesFromTime(pattern.end);

          if (eventStart < patternEnd && patternStart < eventEnd) {
            const overlapStart = Math.max(eventStart, patternStart);
            const overlapEnd = Math.min(eventEnd, patternEnd);
            const overlapDuration = overlapEnd - overlapStart;

            const roomToGrowForward = patternEnd - eventEnd;
            if (roomToGrowForward > 0) {
              const forwardScore =
                overlapDuration +
                Math.min(roomToGrowForward, timeChange) +
                pattern.frequency * 10;
              if (forwardScore > bestForwardScore) {
                bestForwardScore = forwardScore;
                bestForwardFit = pattern;
                forwardStrategy = "weekly-pattern";
              }
            }

            const roomToGrowBackward = eventStart - patternStart;
            if (roomToGrowBackward > 0) {
              const backwardScore =
                overlapDuration +
                Math.min(roomToGrowBackward, timeChange) +
                pattern.frequency * 10;
              if (backwardScore > bestBackwardScore) {
                bestBackwardScore = backwardScore;
                bestBackwardFit = pattern;
                backwardStrategy = "weekly-pattern";
              }
            }
          }
        }
      } else if (strategy === "default") {
        forwardStrategy = "default";
      }

      let tempEvent = null;
      let newStartTime = originalStartTime;
      let newEndTime = originalEndTime;
      let directionUsed = null;
      let increaseStrategy = "none";

      if (bestForwardScore > 0 && bestBackwardScore > 0) {
        if (bestForwardScore >= bestBackwardScore) {
          if (bestForwardFit) {
            const patternEnd = getMinutesFromTime(bestForwardFit.end);
            forwardEndMinutes = Math.min(forwardEndMinutes, patternEnd);
          }

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
          if (bestBackwardFit) {
            const patternStart = getMinutesFromTime(bestBackwardFit.start);
            backwardStartMinutes = Math.max(backwardStartMinutes, patternStart);
          }

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
      } else if (bestForwardScore > 0 || forwardStrategy === "default") {
        if (bestForwardFit) {
          const patternEnd = getMinutesFromTime(bestForwardFit.end);
          forwardEndMinutes = Math.min(forwardEndMinutes, patternEnd);
        }

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
      } else if (bestBackwardScore > 0) {
        if (bestBackwardFit) {
          const patternStart = getMinutesFromTime(bestBackwardFit.start);
          backwardStartMinutes = Math.max(backwardStartMinutes, patternStart);
        }

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

      if (!checkOverlap(tempEvent, modifiedEvents)) {
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
        if (strategy === "default") {
          return {
            increased: false,
            strategy: increaseStrategy,
            message: "Overlap with locked event detected",
            createNewEvent: true,
          };
        }

        return {
          increased: false,
          strategy: increaseStrategy,
          message: "Overlap with locked event detected",
        };
      }
    }

    // Group events by day for easier tracking
    // Ensure all days of the week are represented in the event groups
    const ensureAllWeekDays = () => {
      const weekDays = {};
      // Start from Monday by adding 1 day to start of week
      const weekStart = currentWeekStart.startOf("week").add(1, "day");

      // Debug logging

      // Create array for all 7 days starting from Monday
      for (let i = 0; i < 7; i++) {
        const day = weekStart.add(i, "day");
        weekDays[day.format("YYYY-MM-DD")] = [];
      }

      // Filter and group study events
      studyEvents.forEach((event) => {
        const eventDay = dayjs(parseInt(event.day));
        const day = eventDay.format("YYYY-MM-DD");

        // Only include category-specific events
        if (event.category === category) {
          if (!weekDays[day]) {
            weekDays[day] = [];
          }
          weekDays[day].push(event);
        }
      });

      // Sort events within each day
      Object.values(weekDays).forEach((dayEvents) => {
        dayEvents.sort(
          (a, b) =>
            getMinutesFromTime(a.timeStart) - getMinutesFromTime(b.timeStart)
        );
      });

      return weekDays;
    };

    // Replace the existing event grouping with our new function
    const eventsByDay = ensureAllWeekDays();

    // Sort days chronologically - this remains the same
    const sortedDays = Object.keys(eventsByDay).sort((a, b) => {
      return dayjs(a).valueOf() - dayjs(b.valueOf());
    });

    // Try each phase in order
    const tryPhase = (strategy) => {
      let phaseSuccess = false;

      // Go through each day in the week
      for (const day of sortedDays) {
        const dayEvents = eventsByDay[day];

        // Skip days with no events
        if (dayEvents.length === 0) {
          continue;
        }

        // Try each event for this day
        for (const studyEvent of dayEvents) {
          const result = processEventWithStrategy(studyEvent, strategy);

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
              return true;
            }
          }
        }
      }

      return phaseSuccess;
    };

    // Create two versions of the createNewEventIfNeeded function
    const createNewPatternEvent = () => {
      if (!increasedEvent && categoryAnalysis) {
        // Keep track of newly created events during this operation
        const createdEventsInThisRun = [];

        // Get weekly patterns first since they're more reliable across the week
        const weeklyPatterns = getWeeklyPatterns(categoryAnalysis);
        // Get minimum duration from historical events
        const minDuration = categoryAnalysis.globalStats.minDuration || 15;

        // Try each day
        for (const day of sortedDays) {
          const dayDate = dayjs(day);
          const dayOfWeek = dayDate.day();
          const dayTimestamp = dayDate.valueOf();

          // Check against both existing events and newly created ones
          const allEventsToCheck = [
            ...modifiedEvents,
            ...createdEventsInThisRun,
          ];

          // First try weekly patterns
          for (const pattern of weeklyPatterns) {
            if (pattern.frequency < 0.3) continue;

            // Find free slot in the pattern time range
            const freeSlot = findFreeSlotInPattern(
              pattern,
              dayTimestamp,
              allEventsToCheck,
              minDuration
            );

            if (freeSlot) {
              const potentialEvent = {
                timeStart: freeSlot.startTime,
                timeEnd: freeSlot.endTime,
                day: dayTimestamp,
              };

              // Now check if this specific time doesn't cause any overlaps
              // (it shouldn't since we found a free slot, but double-check)
              if (!checkAnyOverlap(potentialEvent, allEventsToCheck)) {
                const fullEventDetails = {
                  ...potentialEvent,
                  category: category,
                };

                if (!isDuplicateEvent(fullEventDetails, allEventsToCheck)) {
                  const newEvent = {
                    title: `${category}`,
                    description: "Auto-generated from weekly pattern",
                    category: category,
                    label: "purple",
                    timeStart: freeSlot.startTime,
                    timeEnd: freeSlot.endTime,
                    day: dayTimestamp,
                    location: "",
                    locked: false,
                    id: `new-${Date.now()}`,
                    isNewlyCreated: true,
                    createdAt: new Date().toISOString(),
                  };

                  // Add to tracking arrays
                  createdEventsInThisRun.push(newEvent);
                  modifiedEvents.push(newEvent);

                  increasedEvent = {
                    increased: true,
                    strategy: "new-weekly-pattern",
                    originalEvent: null,
                    newEventDay: dayDate.format("ddd DD/MM"),
                    newEventTime: `${freeSlot.startTime}-${freeSlot.endTime}`,
                    eventId: newEvent.id,
                    isNewlyCreated: true,
                    patternFrequency: pattern.frequency,
                  };

                  return true;
                }
              }
            }
          }
        }
      }
      return false;
    };

    const createNewAnySlotEvent = () => {
      if (!increasedEvent && categoryAnalysis) {
        // Get all existing events for this day to check duplicates
        const existingEvents = new Set();

        // Track created events to prevent duplicates within the same operation
        for (const day of sortedDays) {
          for (const studyEvent of eventsByDay[day]) {
            const result = processEventWithStrategy(studyEvent, "default");

            if (result.createNewEvent) {
              const eventKey = `${studyEvent.day}-${studyEvent.timeStart}-${studyEvent.timeEnd}`;

              // Skip if we already processed this time slot
              if (existingEvents.has(eventKey)) {
                continue;
              }

              existingEvents.add(eventKey);

              // Find the next available time slot
              const nextTimeSlot = findNextAvailableTimeSlot(
                studyEvent,
                modifiedEvents,
                categoryAnalysis
              );

              if (nextTimeSlot) {
                // Double check this slot isn't already used
                const newEventKey = `${nextTimeSlot.day}-${nextTimeSlot.startTime}-${nextTimeSlot.endTime}`;
                if (existingEvents.has(newEventKey)) {
                  continue;
                }

                // Create new event
                const newEvent = {
                  title: studyEvent.title,
                  description: studyEvent.description || "",
                  category: studyEvent.category,
                  label: studyEvent.label,
                  timeStart: nextTimeSlot.startTime,
                  timeEnd: nextTimeSlot.endTime,
                  day: nextTimeSlot.day,
                  location: studyEvent.location || "",
                  locked: false,
                  id: `new-${Date.now()}`,
                  isNewlyCreated: true,
                  createdAt: new Date().toISOString(),
                };

                // Add to tracking set
                existingEvents.add(newEventKey);

                // Add to modified events
                modifiedEvents.push(newEvent);

                increasedEvent = {
                  increased: true,
                  strategy: "new-fallback-event",
                  originalEvent: studyEvent.id,
                  newEventDay: dayjs(parseInt(nextTimeSlot.day)).format(
                    "ddd DD/MM"
                  ),
                  newEventTime: `${nextTimeSlot.startTime}-${nextTimeSlot.endTime}`,
                  eventId: newEvent.id,
                  isNewlyCreated: true,
                };

                return true;
              }
              break; // Only try one new event creation per iteration
            }
          }
          if (increasedEvent) break;
        }
      }
      return false;
    };

    // Try each phase in order
    const dailyPhaseSuccess = tryPhase("daily");

    if (!dailyPhaseSuccess) {
      const weeklyPhaseSuccess = tryPhase("weekly");

      if (!weeklyPhaseSuccess) {
        const patternEventSuccess = createNewPatternEvent();

        if (!patternEventSuccess) {
          const defaultPhaseSuccess = tryPhase("default");

          if (!defaultPhaseSuccess) {
            createNewAnySlotEvent();
          }
        }
      }
    }

    // Prepare the summary message
    let summaryMessage;
    if (increasedEvent) {
      if (increasedEvent.isNewlyCreated) {
        summaryMessage = `Created new ${category} event on ${increasedEvent.newEventDay} at ${increasedEvent.newEventTime}.`;
      } else {
        summaryMessage = `Successfully increased ${category} event on ${increasedEvent.day} using ${increasedEvent.strategy} strategy.`;

        if (increasedEvent.direction === "forward") {
          summaryMessage += ` Extended end time from ${increasedEvent.originalEndTime} to ${increasedEvent.newEndTime}.`;
        } else {
          summaryMessage += ` Extended start time from ${increasedEvent.originalStartTime} to ${increasedEvent.newStartTime}.`;
        }
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
        newEventCreated: increasedEvent && increasedEvent.isNewlyCreated,
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

    // Fetch all events without category filter
    const historicalEvents = await Event.findAll({
      where: {
        day: {
          [Op.between]: [
            threeMonthsAgo.valueOf(),
            // Use the day before current week starts as the end boundary
            currentWeekStart.subtract(1, "day").endOf("day").valueOf(),
          ],
        },
      },
    });

    // Group events by category
    const eventsByCategory = {};
    historicalEvents.forEach((event) => {
      if (!eventsByCategory[event.category]) {
        eventsByCategory[event.category] = [];
      }
      eventsByCategory[event.category].push(event);
    });

    // Process each category's events
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

// Update the findCommonTimeRanges function to track min/max durations in each pattern
function findCommonTimeRanges(timeSlots, eventsByTimeRange) {
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
      const rangeStart = formatMinuteSlot(start);
      const rangeEnd = formatMinuteSlot(slotIndex);

      // Calculate pattern-specific statistics
      let minDuration = Infinity;
      let maxDuration = 0;

      // Find events that fall within this range
      const rangeEvents = eventsByTimeRange.filter((event) => {
        const eventStart = getMinutesFromTime(event.timeStart);
        const eventEnd = getMinutesFromTime(event.timeEnd);
        const rangeStartMinutes = start * 15;
        const rangeEndMinutes = slotIndex * 15;

        // Check for significant overlap with the range
        const overlapStart = Math.max(eventStart, rangeStartMinutes);
        const overlapEnd = Math.min(eventEnd, rangeEndMinutes);
        return overlapEnd - overlapStart > 0;
      });

      // Calculate min/max duration for events in this pattern
      if (rangeEvents.length > 0) {
        rangeEvents.forEach((event) => {
          const duration =
            getMinutesFromTime(event.timeEnd) -
            getMinutesFromTime(event.timeStart);
          minDuration = Math.min(minDuration, duration);
          maxDuration = Math.max(maxDuration, duration);
        });
      } else {
        minDuration = 30; // Default if no events in range
      }

      ranges.push({
        start: rangeStart,
        end: rangeEnd,
        frequency:
          Math.round(
            (timeSlots.slice(start, slotIndex).reduce((a, b) => a + b, 0) /
              (slotIndex - start)) *
              100
          ) / 100,
        minDuration,
        maxDuration,
      });

      start = null;
    }
  });

  // Handle range that ends at last slot
  if (start !== null) {
    // Similar code for the last range
    // ...
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
        timeSlots: Array(96).fill(0),
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
    // Keep Sunday as 0, no conversion needed
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

  // Group events by day of week for pattern-specific analysis
  const eventsByDay = Array(7)
    .fill()
    .map(() => []);
  events.forEach((event) => {
    const dayOfWeek = dayjs(parseInt(event.day)).day();
    eventsByDay[dayOfWeek].push(event);
  });

  // Process common time ranges with event data
  categoryAnalysis.byDay.forEach((day, index) => {
    day.commonTimeRanges = findCommonTimeRanges(
      day.timeSlots,
      eventsByDay[index]
    );
  });

  return categoryAnalysis;
}

// Helper function to extract weekly patterns
// Update the getWeeklyPatterns function to preserve pattern-specific durations
function getWeeklyPatterns(categoryAnalysis) {
  const allTimeRanges = categoryAnalysis.byDay.flatMap((day, index) =>
    day.commonTimeRanges
      .filter((range) => range.frequency > 0)
      .map((range) => ({
        ...range,
        dayOfWeek: index,
      }))
  );

  // Group by time range and track durations along with frequencies
  const rangeMap = new Map();
  allTimeRanges.forEach((range) => {
    const key = `${range.start}-${range.end}`;
    if (!rangeMap.has(key)) {
      rangeMap.set(key, {
        start: range.start,
        end: range.end,
        frequencies: [],
        minDurations: [],
        maxDurations: [],
      });
    }
    rangeMap.get(key).frequencies.push(range.frequency);
    rangeMap.get(key).minDurations.push(range.minDuration);
    rangeMap.get(key).maxDurations.push(range.maxDuration);
  });

  // Calculate average frequency and min/max durations for each time range
  return Array.from(rangeMap.values())
    .map(({ start, end, frequencies, minDurations, maxDurations }) => {
      // For minimum duration, take the minimum of all minimums
      const minDuration = Math.min(...minDurations);
      // For maximum duration, take the maximum of all maximums
      const maxDuration = Math.max(...maxDurations);

      return {
        start,
        end,
        frequency: frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
        minDuration,
        maxDuration,
      };
    })
    .sort((a, b) => b.frequency - a.frequency);
}

function findNextAvailableTimeSlot(originalEvent, allEvents, categoryAnalysis) {
  const eventDate = dayjs(parseInt(originalEvent.day));
  const minDuration = categoryAnalysis.globalStats.minDuration || 30; // Default to 30 minutes

  // Try each day starting from the day after the original event
  for (let i = 1; i <= 7; i++) {
    const nextDay = eventDate.add(i, "day");
    const dayOfWeek = nextDay.day();
    const dayTimestamp = nextDay.valueOf();

    // First try to use daily patterns for this day of week
    if (
      categoryAnalysis.byDay[dayOfWeek] &&
      categoryAnalysis.byDay[dayOfWeek].commonTimeRanges.length > 0
    ) {
      const patterns = categoryAnalysis.byDay[dayOfWeek].commonTimeRanges;

      for (const pattern of patterns) {
        const startTime = pattern.start;
        // Calculate end time as the minimum of:
        // 1. Pattern end time, or
        // 2. Start time + minimum duration
        const startMinutes = getMinutesFromTime(startTime);
        const patternEndMinutes = getMinutesFromTime(pattern.end);
        const proposedEndMinutes = startMinutes + minDuration;
        const actualEndMinutes = Math.min(
          proposedEndMinutes,
          patternEndMinutes
        );
        const endHours = Math.floor(actualEndMinutes / 60);
        const endMins = actualEndMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
          .toString()
          .padStart(2, "0")}`;

        // Create potential new event
        const potentialEvent = {
          timeStart: startTime,
          timeEnd: endTime,
          day: dayTimestamp,
        };

        // Check if this time slot doesn't overlap with ANY existing events (locked or not)
        if (!checkAnyOverlap(potentialEvent, allEvents)) {
          // Also check if this would create a duplicate
          const fullEventDetails = {
            ...potentialEvent,
            category: originalEvent.category,
          };

          if (!isDuplicateEvent(fullEventDetails, allEvents)) {
            return {
              startTime,
              endTime,
              day: dayTimestamp,
            };
          } else {
          }
        }
      }
    }

    // If no daily pattern works, try weekly patterns
    const weeklyPatterns = getWeeklyPatterns(categoryAnalysis);

    for (const pattern of weeklyPatterns) {
      const startTime = pattern.start;
      // Calculate end time as the minimum of:
      // 1. Pattern end time, or
      // 2. Start time + minimum duration
      const startMinutes = getMinutesFromTime(startTime);
      const patternEndMinutes = getMinutesFromTime(pattern.end);
      const proposedEndMinutes = startMinutes + minDuration;
      const actualEndMinutes = Math.min(proposedEndMinutes, patternEndMinutes);
      const endHours = Math.floor(actualEndMinutes / 60);
      const endMins = actualEndMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
        .toString()
        .padStart(2, "0")}`;

      // Create potential new event
      const potentialEvent = {
        timeStart: startTime,
        timeEnd: endTime,
        day: dayTimestamp,
      };

      // Check if this time slot doesn't overlap with ANY existing events
      if (!checkAnyOverlap(potentialEvent, allEvents)) {
        // Also check if this would create a duplicate
        const fullEventDetails = {
          ...potentialEvent,
          category: originalEvent.category,
        };

        if (!isDuplicateEvent(fullEventDetails, allEvents)) {
          return {
            startTime,
            endTime,
            day: dayTimestamp,
          };
        } else {
        }
      }
    }

    // If no pattern works, try 15-minute intervals throughout the working day (8:00 AM to 5:00 PM)
    // Start from 8:00 and check every 15 minutes until 17:00
    for (let hour = 8; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const startTime = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const startMinutes = hour * 60 + minute;
        const endMinutes = startMinutes + minDuration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
          .toString()
          .padStart(2, "0")}`;

        const potentialEvent = {
          timeStart: startTime,
          timeEnd: endTime,
          day: dayTimestamp,
        };

        // Check against ALL events
        if (!checkAnyOverlap(potentialEvent, allEvents)) {
          // Also check if this would create a duplicate
          const fullEventDetails = {
            ...potentialEvent,
            category: originalEvent.category,
          };

          if (!isDuplicateEvent(fullEventDetails, allEvents)) {
            return {
              startTime,
              endTime,
              day: dayTimestamp,
            };
          } else {
          }
        }
      }
    }
  }

  // No suitable time slot found
  return null;
}

// In backend/routes/algo.js, create a modified version of findNextAvailableTimeSlot that only uses patterns:
function findNextAvailablePatternTimeSlot(
  originalEvent,
  allEvents,
  categoryAnalysis
) {
  const eventDate = dayjs(parseInt(originalEvent.day));
  const minDuration = categoryAnalysis.globalStats.minDuration || 30; // Default to 30 minutes

  // Try each day starting from the day after the original event
  for (let i = 1; i <= 7; i++) {
    const nextDay = eventDate.add(i, "day");
    const dayOfWeek = nextDay.day();
    const dayTimestamp = nextDay.valueOf();

    // First try to use daily patterns for this day of week
    if (
      categoryAnalysis.byDay[dayOfWeek] &&
      categoryAnalysis.byDay[dayOfWeek].commonTimeRanges.length > 0
    ) {
      const patterns = categoryAnalysis.byDay[dayOfWeek].commonTimeRanges;

      for (const pattern of patterns) {
        const startTime = pattern.start;
        // Calculate end time as the minimum of:
        // 1. Pattern end time, or
        // 2. Start time + minimum duration
        const startMinutes = getMinutesFromTime(startTime);
        const patternEndMinutes = getMinutesFromTime(pattern.end);
        const proposedEndMinutes = startMinutes + minDuration;
        const actualEndMinutes = Math.min(
          proposedEndMinutes,
          patternEndMinutes
        );
        const endHours = Math.floor(actualEndMinutes / 60);
        const endMins = actualEndMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
          .toString()
          .padStart(2, "0")}`;

        // Create potential new event
        const potentialEvent = {
          timeStart: startTime,
          timeEnd: endTime,
          day: dayTimestamp,
        };

        // Check if this time slot doesn't overlap with ANY existing events
        if (!checkAnyOverlap(potentialEvent, allEvents)) {
          // Also check if this would create a duplicate
          const fullEventDetails = {
            ...potentialEvent,
            category: originalEvent.category,
          };

          if (!isDuplicateEvent(fullEventDetails, allEvents)) {
            return {
              startTime,
              endTime,
              day: dayTimestamp,
            };
          } else {
          }
        }
      }
    }

    // If no daily pattern works, try weekly patterns
    const weeklyPatterns = getWeeklyPatterns(categoryAnalysis);

    for (const pattern of weeklyPatterns) {
      const startTime = pattern.start;
      // Calculate end time as the minimum of:
      // 1. Pattern end time, or
      // 2. Start time + minimum duration
      const startMinutes = getMinutesFromTime(startTime);
      const patternEndMinutes = getMinutesFromTime(pattern.end);
      const proposedEndMinutes = startMinutes + minDuration;
      const actualEndMinutes = Math.min(proposedEndMinutes, patternEndMinutes);
      const endHours = Math.floor(actualEndMinutes / 60);
      const endMins = actualEndMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
        .toString()
        .padStart(2, "0")}`;

      // Create potential new event
      const potentialEvent = {
        timeStart: startTime,
        timeEnd: endTime,
        day: dayTimestamp,
      };

      // Check if this time slot doesn't overlap with ANY existing events
      if (!checkAnyOverlap(potentialEvent, allEvents)) {
        // Also check if this would create a duplicate
        const fullEventDetails = {
          ...potentialEvent,
          category: originalEvent.category,
        };

        if (!isDuplicateEvent(fullEventDetails, allEvents)) {
          return {
            startTime,
            endTime,
            day: dayTimestamp,
          };
        } else {
        }
      }
    }
  }

  // No suitable pattern-based time slot found
  return null;
}

export default router;

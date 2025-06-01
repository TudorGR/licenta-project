import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "axios";

// Register the relativeTime plugin
dayjs.extend(relativeTime);

// Weather condition mapping to advice
const WEATHER_ADVICE = {
  rain: "Don't forget to grab an umbrella!",
  snow: "Dress warmly and watch for snow!",
  thunderstorm: "Be careful, thunderstorms are expected!",
  hot: "It's hot today, dress accordingly!",
  cold: "It's cold today, bring a jacket!",
  windy: "It's windy today, secure loose items!",
  clear: "Weather looks great for your event!",
  cloudy: "Expect cloudy conditions for your event.",
};

class ReminderService {
  constructor() {
    this.reminders = new Map();
    this.checkInterval = null;
    this.weatherCache = new Map(); // Cache for weather data
  }

  initialize(events) {
    // Clear any existing reminders
    this.clearAll();

    // Set up reminders for all events
    events.forEach((event) => {
      if (event.reminderEnabled && event.reminderTime > 0) {
        this.scheduleReminder(event);
      }
    });

    // Check every minute instead of every 15 seconds
    this.checkInterval = setInterval(() => this.checkReminders(), 60000);

    // Initial check immediately after setting up
    this.checkReminders();
  }

  scheduleReminder(event) {
    if (!event.reminderEnabled || !event.reminderTime) return;

    const eventDay = dayjs(parseInt(event.day));
    const [hours, minutes] = event.timeStart.split(":").map(Number);
    const eventTime = eventDay.hour(hours).minute(minutes);

    // Calculate reminder time (subtract reminder minutes from event time)
    const reminderTime = eventTime.subtract(event.reminderTime, "minute");
    const now = dayjs();

    // Only schedule future reminders
    if (reminderTime.isAfter(now)) {
      // Store the reminder with the event ID as the key
      this.reminders.set(event.id, {
        eventId: event.id,
        title: event.title,
        reminderTime: reminderTime.valueOf(),
        location: event.location || null, // Store location if available
        notified: false,
      });
    }
  }

  updateReminder(event) {
    // Remove existing reminder if present
    this.reminders.delete(event.id);

    // Schedule new reminder if enabled
    if (event.reminderEnabled && event.reminderTime > 0) {
      this.scheduleReminder(event);
    }
  }

  removeReminder(eventId) {
    this.reminders.delete(eventId);
  }

  async checkReminders() {
    const now = dayjs().valueOf();

    for (const [eventId, reminder] of this.reminders.entries()) {
      if (!reminder.notified && reminder.reminderTime <= now) {
        // Check weather if location is provided
        let weatherAdvice = "";
        if (reminder.location) {
          try {
            weatherAdvice = await this.getWeatherAdvice(reminder.location);
          } catch (error) {
            console.error("Failed to get weather advice:", error);
          }
        }

        // Trigger notification with weather advice if available
        this.showNotification(reminder, weatherAdvice);

        // Mark as notified
        reminder.notified = true;
      }
    }
  }

  async getWeatherAdvice(location) {
    try {
      // Log for debugging
      console.log("Getting weather advice for location:", location);

      // First, get coordinates from the location string
      const coordsResponse = await axios.post(
        "http://localhost:5000/api/travel/location-to-coords",
        {
          location,
        }
      );
      const { latitude, longitude } = coordsResponse.data;

      if (!latitude || !longitude) {
        console.log("No coordinates found for location:", location);
        return ""; // No coordinates found
      }

      // Use our backend proxy instead of calling Open Meteo directly
      const weatherResponse = await axios.get(
        `http://localhost:5000/api/travel/weather?latitude=${latitude}&longitude=${longitude}`
      );

      const data = weatherResponse.data;
      if (!data || !data.hourly) {
        console.log("No weather data found");
        return "";
      }

      // Get current hour's data
      const currentHour = new Date().getHours();
      const weatherCode = data.hourly.weathercode[currentHour];
      const temperature = data.hourly.temperature_2m[currentHour];
      const precipitation = data.hourly.precipitation[currentHour];

      // Determine weather condition and advice
      let advice = "";

      if (precipitation > 0.5) {
        advice = WEATHER_ADVICE.rain;
      } else if (weatherCode >= 71 && weatherCode <= 77) {
        advice = WEATHER_ADVICE.snow;
      } else if (weatherCode >= 95) {
        advice = WEATHER_ADVICE.thunderstorm;
      } else if (temperature > 28) {
        advice = WEATHER_ADVICE.hot;
      } else if (temperature < 5) {
        advice = WEATHER_ADVICE.cold;
      } else if (weatherCode === 0) {
        advice = WEATHER_ADVICE.clear;
      } else {
        advice = WEATHER_ADVICE.cloudy;
      }

      // Cache the result
      this.weatherCache.set(location, {
        advice,
        timestamp: Date.now(),
      });

      return advice;
    } catch (error) {
      console.error("Error getting weather advice:", error);
      return ""; // Return empty string on error
    }
  }

  showNotification(reminder, weatherAdvice = "") {
    // Log to console when notification is shown
    console.log(
      `🔔 NOTIFICATION: "${
        reminder.title
      }" at ${new Date().toLocaleTimeString()}`
    );

    // Add weather advice if available
    const message = weatherAdvice
      ? `Your event is starting soon. ${weatherAdvice}`
      : "Your event is starting soon";

    // Display browser notification if supported
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`Event Reminder: ${reminder.title}`, {
          body: message,
          icon: "/logo.png",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            this.showNotification(reminder, weatherAdvice);
          }
        });
      }
    }
  }

  clearAll() {
    this.reminders.clear();
    this.weatherCache.clear();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const reminderService = new ReminderService();

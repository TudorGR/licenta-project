import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// Register the relativeTime plugin
dayjs.extend(relativeTime);

class ReminderService {
  constructor() {
    this.reminders = new Map();
    this.checkInterval = null;
    this.debug = false;
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

  checkReminders() {
    const now = dayjs().valueOf();

    this.reminders.forEach((reminder, eventId) => {
      if (!reminder.notified && reminder.reminderTime <= now) {
        // Trigger notification
        this.showNotification(reminder);

        // Mark as notified
        reminder.notified = true;
      }
    });
  }

  showNotification(reminder) {
    // Log to console when notification is shown
    console.log(
      `🔔 NOTIFICATION: "${
        reminder.title
      }" at ${new Date().toLocaleTimeString()}`
    );

    // Display browser notification if supported
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`Event Reminder: ${reminder.title}`, {
          body: "Your event is starting soon",
          icon: "/vite.svg", // You can replace this with a custom icon
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            this.showNotification(reminder);
          }
        });
      }
    }

    // Also show an alert as a fallback
    // alert(`Reminder: ${reminder.title} is starting soon!`);s
  }

  clearAll() {
    this.reminders.clear();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Add function to create a test reminder that will fire shortly
  createTestReminder(secondsFromNow = 10) {
    const testEvent = {
      id: "test-" + Date.now(),
      title: `Test Reminder (in ${secondsFromNow} seconds)`,
      day: Date.now().toString(),
      timeStart: dayjs()
        .add(secondsFromNow + 1, "second")
        .format("HH:mm"),
      reminderEnabled: true,
      reminderTime: 1, // 1 minute before
    };

    // Force the reminder time to be secondsFromNow from now
    this.scheduleReminder(testEvent);

    // Override the calculated reminder time to be closer
    const reminder = this.reminders.get(testEvent.id);
    if (reminder) {
      reminder.reminderTime = dayjs().add(secondsFromNow, "second").valueOf();
    }

    return testEvent.id;
  }
}

export const reminderService = new ReminderService();

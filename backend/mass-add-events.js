// Mass add events using your calendar API
import axios from "axios";
import dayjs from "dayjs";

const API_URL = "http://localhost:5000/api";

const massAddEvents = async () => {
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1MTU1NTU0NywiZXhwIjoxNzUyMTYwMzQ3fQ.7ZtndnaMuIlExmX1kWqyOvva39BBS4bQldeo_M_nl6o";

  //hardcoded events with no overlaps
  const events = [
    // June 14, 2025 (Saturday)
    {
      title: "Farmers Market",
      description: "Fresh summer produce",
      timeStart: "09:00",
      timeEnd: "10:30",
      category: "Personal Tasks",
      location: "Downtown Market",
      day: dayjs("2025-06-14").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Garden Planting",
      description: "Summer flowers",
      timeStart: "11:30",
      timeEnd: "13:30",
      category: "Leisure & Hobbies",
      location: "Backyard",
      day: dayjs("2025-06-14").valueOf(),
      reminderEnabled: false,
      reminderTime: 0,
    },
    {
      title: "Summer Concert",
      description: "Outdoor music festival",
      timeStart: "19:00",
      timeEnd: "22:00",
      category: "Leisure & Hobbies",
      location: "City Park",
      day: dayjs("2025-06-14").valueOf(),
      reminderEnabled: true,
      reminderTime: 120,
    },

    // June 15, 2025 (Sunday - Father's Day)
    {
      title: "Father's Day Brunch",
      description: "Celebration with dad",
      timeStart: "11:00",
      timeEnd: "13:00",
      category: "Social & Family",
      location: "Dad's Favorite Restaurant",
      day: dayjs("2025-06-15").valueOf(),
      reminderEnabled: true,
      reminderTime: 1440,
    },
    {
      title: "Gift Giving",
      description: "Father's Day presents",
      timeStart: "14:00",
      timeEnd: "15:00",
      category: "Social & Family",
      location: "Parents' House",
      day: dayjs("2025-06-15").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },
    {
      title: "Week Planning",
      description: "Organize upcoming week",
      timeStart: "19:00",
      timeEnd: "20:00",
      category: "Personal Tasks",
      location: "Home Office",
      day: dayjs("2025-06-15").valueOf(),
      reminderEnabled: false,
      reminderTime: 0,
    },

    // June 16, 2025 (Monday)
    {
      title: "Morning Commute",
      description: "Drive to office",
      timeStart: "08:00",
      timeEnd: "08:45",
      category: "Travel & Commute",
      location: "Highway Route",
      day: dayjs("2025-06-16").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Weekly Team Meeting",
      description: "Summer project kickoff",
      timeStart: "10:00",
      timeEnd: "11:30",
      category: "Work",
      location: "Conference Room A",
      day: dayjs("2025-06-16").valueOf(),
      reminderEnabled: true,
      reminderTime: 15,
    },
    {
      title: "Gym Session",
      description: "Upper body workout",
      timeStart: "18:00",
      timeEnd: "19:30",
      category: "Health & Wellness",
      location: "Fitness Center",
      day: dayjs("2025-06-16").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },

    // June 17, 2025 (Tuesday)
    {
      title: "Client Meeting",
      description: "Q3 project requirements",
      timeStart: "11:00",
      timeEnd: "12:30",
      category: "Work",
      location: "Client Office",
      day: dayjs("2025-06-17").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },
    {
      title: "Internet Bill Payment",
      description: "Monthly bill",
      timeStart: "17:00",
      timeEnd: "17:30",
      category: "Finance & Bills",
      location: "Online Banking",
      day: dayjs("2025-06-17").valueOf(),
      reminderEnabled: true,
      reminderTime: 1440,
    },
    {
      title: "Cooking Class",
      description: "Summer recipes",
      timeStart: "19:00",
      timeEnd: "21:00",
      category: "Education",
      location: "Community Center",
      day: dayjs("2025-06-17").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },

    // June 18, 2025 (Wednesday)
    {
      title: "Department Standup",
      description: "Weekly alignment",
      timeStart: "09:30",
      timeEnd: "10:00",
      category: "Work",
      location: "Office",
      day: dayjs("2025-06-18").valueOf(),
      reminderEnabled: true,
      reminderTime: 10,
    },
    {
      title: "Lunch with Mentor",
      description: "Career guidance",
      timeStart: "12:30",
      timeEnd: "13:30",
      category: "Work",
      location: "Restaurant",
      day: dayjs("2025-06-18").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Evening Run",
      description: "Summer training",
      timeStart: "18:30",
      timeEnd: "19:30",
      category: "Health & Wellness",
      location: "Riverside Path",
      day: dayjs("2025-06-18").valueOf(),
      reminderEnabled: true,
      reminderTime: 15,
    },

    // June 19, 2025 (Thursday - Juneteenth)
    {
      title: "Juneteenth Celebration",
      description: "Community event",
      timeStart: "11:00",
      timeEnd: "14:00",
      category: "Social & Family",
      location: "Community Center",
      day: dayjs("2025-06-19").valueOf(),
      reminderEnabled: true,
      reminderTime: 120,
    },
    {
      title: "History Discussion Group",
      description: "Juneteenth special session",
      timeStart: "16:00",
      timeEnd: "17:30",
      category: "Education",
      location: "Local Library",
      day: dayjs("2025-06-19").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },
    {
      title: "Documentary Screening",
      description: "Historical perspective",
      timeStart: "19:00",
      timeEnd: "21:00",
      category: "Education",
      location: "Community Theater",
      day: dayjs("2025-06-19").valueOf(),
      reminderEnabled: true,
      reminderTime: 45,
    },

    // June 20, 2025 (Friday)
    {
      title: "One-on-One",
      description: "Performance check-in",
      timeStart: "10:00",
      timeEnd: "10:30",
      category: "Work",
      location: "Manager's Office",
      day: dayjs("2025-06-20").valueOf(),
      reminderEnabled: true,
      reminderTime: 15,
    },
    {
      title: "Team Lunch",
      description: "Friday social",
      timeStart: "12:30",
      timeEnd: "14:00",
      category: "Social & Family",
      location: "Local Bistro",
      day: dayjs("2025-06-20").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Outdoor Movie Night",
      description: "Summer film series",
      timeStart: "20:00",
      timeEnd: "22:30",
      category: "Leisure & Hobbies",
      location: "City Park",
      day: dayjs("2025-06-20").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },

    // June 21, 2025 (Saturday - Summer Solstice)
    {
      title: "Summer Solstice Hike",
      description: "Longest day celebration",
      timeStart: "06:00",
      timeEnd: "09:00",
      category: "Health & Wellness",
      location: "Mountain Trail",
      day: dayjs("2025-06-21").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },
    {
      title: "Farmers Market",
      description: "Fresh summer produce",
      timeStart: "10:30",
      timeEnd: "12:00",
      category: "Personal Tasks",
      location: "Downtown Market",
      day: dayjs("2025-06-21").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Summer Solstice Party",
      description: "Seasonal celebration",
      timeStart: "19:00",
      timeEnd: "23:00",
      category: "Social & Family",
      location: "Friend's Backyard",
      day: dayjs("2025-06-21").valueOf(),
      reminderEnabled: true,
      reminderTime: 120,
    },

    // June 22, 2025 (Sunday)
    {
      title: "Morning Yoga",
      description: "Outdoor session",
      timeStart: "08:00",
      timeEnd: "09:00",
      category: "Health & Wellness",
      location: "City Park",
      day: dayjs("2025-06-22").valueOf(),
      reminderEnabled: true,
      reminderTime: 15,
    },
    {
      title: "Family Lunch",
      description: "Monthly gathering",
      timeStart: "13:00",
      timeEnd: "15:00",
      category: "Social & Family",
      location: "Parents' House",
      day: dayjs("2025-06-22").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },
    {
      title: "Week Planning",
      description: "Organize upcoming week",
      timeStart: "19:00",
      timeEnd: "20:00",
      category: "Personal Tasks",
      location: "Home Office",
      day: dayjs("2025-06-22").valueOf(),
      reminderEnabled: false,
      reminderTime: 0,
    },

    // June 23, 2025 (Monday)
    {
      title: "Morning Commute",
      description: "Drive to office",
      timeStart: "08:00",
      timeEnd: "08:45",
      category: "Travel & Commute",
      location: "Highway Route",
      day: dayjs("2025-06-23").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Team Standup",
      description: "Weekly kickoff",
      timeStart: "09:30",
      timeEnd: "10:00",
      category: "Work",
      location: "Conference Room A",
      day: dayjs("2025-06-23").valueOf(),
      reminderEnabled: true,
      reminderTime: 15,
    },
    {
      title: "Swimming",
      description: "Summer workout routine",
      timeStart: "18:00",
      timeEnd: "19:00",
      category: "Health & Wellness",
      location: "Community Pool",
      day: dayjs("2025-06-23").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },

    // June 24, 2025 (Tuesday)
    {
      title: "Project Planning",
      description: "Q3 strategy",
      timeStart: "10:00",
      timeEnd: "11:30",
      category: "Work",
      location: "Office",
      day: dayjs("2025-06-24").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Car Insurance Payment",
      description: "Quarterly premium",
      timeStart: "16:00",
      timeEnd: "16:30",
      category: "Finance & Bills",
      location: "Online",
      day: dayjs("2025-06-24").valueOf(),
      reminderEnabled: true,
      reminderTime: 1440,
    },
    {
      title: "Language Exchange",
      description: "Conversation practice",
      timeStart: "19:00",
      timeEnd: "20:30",
      category: "Education",
      location: "Language Cafe",
      day: dayjs("2025-06-24").valueOf(),
      reminderEnabled: true,
      reminderTime: 45,
    },

    // June 25, 2025 (Wednesday)
    {
      title: "Mid-Week Review",
      description: "Project status",
      timeStart: "10:00",
      timeEnd: "11:00",
      category: "Work",
      location: "Conference Room B",
      day: dayjs("2025-06-25").valueOf(),
      reminderEnabled: true,
      reminderTime: 15,
    },
    {
      title: "Doctor Appointment",
      description: "Annual checkup",
      timeStart: "15:00",
      timeEnd: "16:00",
      category: "Health & Wellness",
      location: "Medical Center",
      day: dayjs("2025-06-25").valueOf(),
      reminderEnabled: true,
      reminderTime: 120,
    },
    {
      title: "Yoga Class",
      description: "Stress relief",
      timeStart: "18:30",
      timeEnd: "19:30",
      category: "Health & Wellness",
      location: "Yoga Studio",
      day: dayjs("2025-06-25").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },

    // June 26, 2025 (Thursday)
    {
      title: "Client Presentation",
      description: "Project proposal",
      timeStart: "14:00",
      timeEnd: "15:30",
      category: "Work",
      location: "Client Office",
      day: dayjs("2025-06-26").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },
    {
      title: "Rent Payment",
      description: "Monthly rent",
      timeStart: "16:00",
      timeEnd: "16:30",
      category: "Finance & Bills",
      location: "Online Banking",
      day: dayjs("2025-06-26").valueOf(),
      reminderEnabled: true,
      reminderTime: 1440,
    },
    {
      title: "Coding Workshop",
      description: "New frameworks",
      timeStart: "19:00",
      timeEnd: "21:00",
      category: "Education",
      location: "Tech Hub",
      day: dayjs("2025-06-26").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },

    // June 27, 2025 (Friday)
    {
      title: "Weekly Report",
      description: "Team performance",
      timeStart: "11:00",
      timeEnd: "12:00",
      category: "Work",
      location: "Office",
      day: dayjs("2025-06-27").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Happy Hour",
      description: "Weekly social",
      timeStart: "17:30",
      timeEnd: "19:00",
      category: "Social & Family",
      location: "Local Pub",
      day: dayjs("2025-06-27").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Summer Concert Series",
      description: "Jazz night",
      timeStart: "20:00",
      timeEnd: "22:00",
      category: "Leisure & Hobbies",
      location: "City Amphitheater",
      day: dayjs("2025-06-27").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },

    // June 28, 2025 (Saturday)
    {
      title: "Beach Day",
      description: "Summer relaxation",
      timeStart: "10:00",
      timeEnd: "16:00",
      category: "Leisure & Hobbies",
      location: "City Beach",
      day: dayjs("2025-06-28").valueOf(),
      reminderEnabled: true,
      reminderTime: 120,
    },
    {
      title: "Grocery Shopping",
      description: "Weekly essentials",
      timeStart: "17:30",
      timeEnd: "18:30",
      category: "Personal Tasks",
      location: "Supermarket",
      day: dayjs("2025-06-28").valueOf(),
      reminderEnabled: false,
      reminderTime: 0,
    },
    {
      title: "Backyard BBQ",
      description: "Summer gathering",
      timeStart: "19:30",
      timeEnd: "22:30",
      category: "Social & Family",
      location: "Home",
      day: dayjs("2025-06-28").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },

    // June 29, 2025 (Sunday)
    {
      title: "Morning Meditation",
      description: "Mindfulness practice",
      timeStart: "08:30",
      timeEnd: "09:00",
      category: "Health & Wellness",
      location: "Home",
      day: dayjs("2025-06-29").valueOf(),
      reminderEnabled: true,
      reminderTime: 10,
    },
    {
      title: "Farmers Market",
      description: "Fresh produce",
      timeStart: "11:00",
      timeEnd: "12:30",
      category: "Personal Tasks",
      location: "Downtown Market",
      day: dayjs("2025-06-29").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Home Maintenance",
      description: "Summer repairs",
      timeStart: "14:00",
      timeEnd: "16:00",
      category: "Personal Tasks",
      location: "Home",
      day: dayjs("2025-06-29").valueOf(),
      reminderEnabled: false,
      reminderTime: 0,
    },
    {
      title: "Week Planning",
      description: "Prepare for upcoming week",
      timeStart: "20:00",
      timeEnd: "21:00",
      category: "Personal Tasks",
      location: "Home Office",
      day: dayjs("2025-06-29").valueOf(),
      reminderEnabled: false,
      reminderTime: 0,
    },

    // June 30, 2025 (Monday)
    {
      title: "Morning Commute",
      description: "Drive to office",
      timeStart: "08:00",
      timeEnd: "08:45",
      category: "Travel & Commute",
      location: "Highway Route",
      day: dayjs("2025-06-30").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
    {
      title: "Month-End Review",
      description: "Performance summary",
      timeStart: "10:00",
      timeEnd: "11:30",
      category: "Work",
      location: "Conference Room B",
      day: dayjs("2025-06-30").valueOf(),
      reminderEnabled: true,
      reminderTime: 15,
    },
    {
      title: "Gym Session",
      description: "Core workout",
      timeStart: "18:00",
      timeEnd: "19:00",
      category: "Health & Wellness",
      location: "Fitness Center",
      day: dayjs("2025-06-30").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },

    // July 1, 2025 (Tuesday - Canada Day)
    {
      title: "Canada Day Celebration",
      description: "With Canadian friends",
      timeStart: "12:00",
      timeEnd: "15:00",
      category: "Social & Family",
      location: "Friend's House",
      day: dayjs("2025-07-01").valueOf(),
      reminderEnabled: true,
      reminderTime: 60,
    },
    {
      title: "Phone Bill Payment",
      description: "Monthly bill",
      timeStart: "16:00",
      timeEnd: "16:30",
      category: "Finance & Bills",
      location: "Online",
      day: dayjs("2025-07-01").valueOf(),
      reminderEnabled: true,
      reminderTime: 1440,
    },
    {
      title: "Summer Reading",
      description: "Book club selection",
      timeStart: "19:00",
      timeEnd: "20:30",
      category: "Leisure & Hobbies",
      location: "Home Patio",
      day: dayjs("2025-07-01").valueOf(),
      reminderEnabled: false,
      reminderTime: 0,
    },

    // July 2, 2025 (Wednesday)
    {
      title: "Department Standup",
      description: "Weekly alignment",
      timeStart: "09:30",
      timeEnd: "10:00",
      category: "Work",
      location: "Office",
      day: dayjs("2025-07-02").valueOf(),
      reminderEnabled: true,
      reminderTime: 10,
    },
    {
      title: "Q3 Planning",
      description: "Strategic initiatives",
      timeStart: "11:00",
      timeEnd: "12:30",
      category: "Work",
      location: "Conference Room A",
      day: dayjs("2025-07-02").valueOf(),
      reminderEnabled: true,
      reminderTime: 15,
    },
    {
      title: "Evening Cycling",
      description: "Summer ride",
      timeStart: "18:30",
      timeEnd: "19:30",
      category: "Health & Wellness",
      location: "Bike Path",
      day: dayjs("2025-07-02").valueOf(),
      reminderEnabled: true,
      reminderTime: 30,
    },
  ];

  let addedCount = 0;
  let errorCount = 0;

  console.log(`Starting to add ${events.length} hardcoded events...`);

  for (const event of events) {
    try {
      const response = await axios.post(`${API_URL}/events`, event, {
        headers: {
          "x-auth-token": token,
          "Content-Type": "application/json",
        },
      });

      console.log(
        `✓ Added: ${event.title} on ${dayjs(event.day).format(
          "YYYY-MM-DD dddd"
        )} at ${event.timeStart}-${event.timeEnd}`
      );
      addedCount++;

      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      console.error(
        `✗ Error adding ${event.title} on ${dayjs(event.day).format(
          "YYYY-MM-DD"
        )}:`,
        error.response?.data?.message || error.message
      );
      errorCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Successfully added: ${addedCount} events`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total attempted: ${events.length}`);

  // Show category breakdown
  const categoryBreakdown = {};
  events.forEach((event) => {
    categoryBreakdown[event.category] =
      (categoryBreakdown[event.category] || 0) + 1;
  });

  console.log("\n=== Category Breakdown ===");
  Object.entries(categoryBreakdown).forEach(([category, count]) => {
    console.log(`${category}: ${count} events`);
  });
};

massAddEvents();

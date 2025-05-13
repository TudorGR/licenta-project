import React, { useContext, useEffect, useState, useMemo } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { categoryColors } from "../utils/categoryColors";
import "chartjs-adapter-date-fns";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsDashboard = ({ onClose }) => {
  const {
    savedEvents,
    monthIndex,
    workingHoursStart,
    workingHoursEnd,
    categories,
  } = useContext(Context);

  const [selectedTimeframe, setSelectedTimeframe] = useState("month");
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: dayjs().subtract(30, "day").valueOf(),
    end: dayjs().valueOf(),
  });
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    // Update date range when timeframe changes
    switch (selectedTimeframe) {
      case "week":
        setSelectedDateRange({
          start: dayjs().subtract(7, "day").valueOf(),
          end: dayjs().valueOf(),
        });
        break;
      case "month":
        setSelectedDateRange({
          start: dayjs().subtract(30, "day").valueOf(),
          end: dayjs().valueOf(),
        });
        break;
      case "year":
        setSelectedDateRange({
          start: dayjs().subtract(365, "day").valueOf(),
          end: dayjs().valueOf(),
        });
        break;
      default:
        break;
    }
  }, [selectedTimeframe]);

  // Helper function to get time in minutes from HH:MM
  const getTimeInMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Filter events based on date range
  const filteredEvents = useMemo(() => {
    return savedEvents.filter((event) => {
      return (
        event.day >= selectedDateRange.start &&
        event.day <= selectedDateRange.end
      );
    });
  }, [savedEvents, selectedDateRange]);

  // 1. Category Distribution Data
  const categoryData = useMemo(() => {
    const data = {};
    let totalMinutes = 0;

    categories.forEach((category) => {
      data[category] = 0;
    });

    filteredEvents.forEach((event) => {
      const category = event.category || "Other";
      const startMinutes = getTimeInMinutes(event.timeStart);
      const endMinutes = getTimeInMinutes(event.timeEnd);
      const duration = endMinutes - startMinutes;

      if (!data[category]) {
        data[category] = 0;
      }

      data[category] += duration;
      totalMinutes += duration;
    });

    return {
      labels: Object.keys(data),
      values: Object.values(data),
      totalHours: Math.round((totalMinutes / 60) * 10) / 10, // Round to 1 decimal place
      percentages: Object.entries(data).map(([category, minutes]) => ({
        category,
        percentage: totalMinutes
          ? Math.round((minutes / totalMinutes) * 100)
          : 0,
      })),
    };
  }, [filteredEvents, categories]);

  // 2. Daily Events Distribution
  const dailyDistribution = useMemo(() => {
    const dayData = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    filteredEvents.forEach((event) => {
      const day = dayjs(event.day).format("dddd");
      const startMinutes = getTimeInMinutes(event.timeStart);
      const endMinutes = getTimeInMinutes(event.timeEnd);
      const duration = endMinutes - startMinutes;

      dayData[day] += duration;
    });

    return {
      labels: Object.keys(dayData),
      values: Object.values(dayData).map(
        (minutes) => Math.round((minutes / 60) * 10) / 10
      ), // Convert to hours
    };
  }, [filteredEvents]);

  // 3. Hourly Distribution
  const hourlyDistribution = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourData = hours.reduce((acc, hour) => {
      acc[hour] = 0;
      return acc;
    }, {});

    filteredEvents.forEach((event) => {
      const startHour = parseInt(event.timeStart.split(":")[0]);
      const endHour = parseInt(event.timeEnd.split(":")[0]);
      const startMinute = parseInt(event.timeStart.split(":")[1]);
      const endMinute = parseInt(event.timeEnd.split(":")[1]);

      // Handle single-hour events
      if (startHour === endHour) {
        hourData[startHour] += (endMinute - startMinute) / 60;
        return;
      }

      // First hour (partial)
      hourData[startHour] += (60 - startMinute) / 60;

      // Full hours in between
      for (let hour = startHour + 1; hour < endHour; hour++) {
        hourData[hour] += 1;
      }

      // Last hour (partial)
      hourData[endHour] += endMinute / 60;
    });

    return {
      labels: hours.map((h) => `${h}:00`),
      values: Object.values(hourData),
    };
  }, [filteredEvents]);

  // 4. Weekly activity trends
  const weeklyTrends = useMemo(() => {
    // Get last n weeks
    const weeks = selectedTimeframe === "year" ? 52 : 12;
    const labels = [];
    const data = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = dayjs().subtract(i, "week").startOf("week");
      const weekEnd = weekStart.endOf("week");

      labels.push(weekStart.format("MMM DD"));

      // Count events in this week
      const eventsInWeek = savedEvents.filter((event) => {
        const eventDay = dayjs(event.day);
        return eventDay >= weekStart && eventDay <= weekEnd;
      });

      // Calculate total hours
      let totalMinutes = 0;
      eventsInWeek.forEach((event) => {
        const startMinutes = getTimeInMinutes(event.timeStart);
        const endMinutes = getTimeInMinutes(event.timeEnd);
        totalMinutes += endMinutes - startMinutes;
      });

      data.push(Math.round((totalMinutes / 60) * 10) / 10); // Convert to hours with 1 decimal
    }

    return {
      labels,
      values: data,
    };
  }, [savedEvents, selectedTimeframe]);

  // 5. Category breakdown by day of week
  const categoryByDayOfWeek = useMemo(() => {
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const categoryDayData = {};

    // Initialize data structure
    categories.forEach((category) => {
      categoryDayData[category] = {
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0,
        Sunday: 0,
      };
    });

    // Add "Other" category
    categoryDayData["Other"] = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    // Populate with event data
    filteredEvents.forEach((event) => {
      const day = dayjs(event.day).format("dddd");
      const category = event.category || "Other";
      const startMinutes = getTimeInMinutes(event.timeStart);
      const endMinutes = getTimeInMinutes(event.timeEnd);
      const duration = endMinutes - startMinutes;

      if (!categoryDayData[category]) {
        categoryDayData[category] = {
          Monday: 0,
          Tuesday: 0,
          Wednesday: 0,
          Thursday: 0,
          Friday: 0,
          Saturday: 0,
          Sunday: 0,
        };
      }

      categoryDayData[category][day] += duration / 60; // Convert to hours
    });

    return {
      days,
      categories: Object.keys(categoryDayData),
      datasets: Object.entries(categoryDayData).map(
        ([category, values], index) => ({
          label: category,
          data: days.map((day) => Math.round(values[day] * 10) / 10),
          backgroundColor: categoryColors[category] || "#CCCCCC",
          borderColor: categoryColors[category] || "#CCCCCC",
        })
      ),
    };
  }, [filteredEvents, categories]);

  // 6. Location distribution data
  const locationData = useMemo(() => {
    const locations = {};
    let totalEvents = 0;

    filteredEvents.forEach((event) => {
      if (event.location && event.location.trim() !== "") {
        const location = event.location;
        if (!locations[location]) {
          locations[location] = 0;
        }
        locations[location]++;
        totalEvents++;
      }
    });

    // Sort by frequency and limit to top 10
    const sortedLocations = Object.entries(locations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      labels: sortedLocations.map(([location]) => location),
      values: sortedLocations.map(([, count]) => count),
      percentages: sortedLocations.map(([location, count]) => ({
        location,
        percentage: totalEvents ? Math.round((count / totalEvents) * 100) : 0,
      })),
    };
  }, [filteredEvents]);

  // 7. Travel time analytics
  const travelTimeData = useMemo(() => {
    // This is a placeholder - ideally we would use actual travel time data
    // from your TravelTimeIndicator component if it's stored somewhere
    // For now, let's just count events with locations as a proxy

    const eventsWithLocation = filteredEvents.filter(
      (event) => event.location && event.location.trim() !== ""
    );

    const totalEvents = filteredEvents.length;
    const percentageWithLocation = totalEvents
      ? Math.round((eventsWithLocation.length / totalEvents) * 100)
      : 0;

    return {
      totalEvents,
      eventsWithLocation: eventsWithLocation.length,
      percentageWithLocation,
    };
  }, [filteredEvents]);

  return (
    <div className="flex flex-col h-full overflow-auto py-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl shrink-1 ml-4 mb-2 font-medium">
          Calendar Analytics
        </h1>

        <div className="flex gap-2 mr-2 pb-2">
          <button
            className={`shadow-custom px-4 py-2 rounded-full ${
              selectedTimeframe === "week"
                ? "bg-black text-white border"
                : "border border-gray-200"
            }`}
            onClick={() => setSelectedTimeframe("week")}
          >
            Week
          </button>
          <button
            className={`shadow-custom px-4 py-2 rounded-full ${
              selectedTimeframe === "month"
                ? "bg-black text-white border"
                : "border border-gray-200"
            }`}
            onClick={() => setSelectedTimeframe("month")}
          >
            Month
          </button>
          <button
            className={`shadow-custom px-4 py-2 rounded-full ${
              selectedTimeframe === "year"
                ? "bg-black text-white border"
                : "border border-gray-200"
            }`}
            onClick={() => setSelectedTimeframe("year")}
          >
            Year
          </button>
        </div>
      </div>

      <div className="flex mb-6 border-b border-gray-200">
        <button
          className={`px-4 py-2 ${
            activeTab === "overview"
              ? "border-b-2 border-black font-medium"
              : ""
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "time" ? "border-b-2 border-black font-medium" : ""
          }`}
          onClick={() => setActiveTab("time")}
        >
          Time Analytics
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "categories"
              ? "border-b-2 border-black font-medium"
              : ""
          }`}
          onClick={() => setActiveTab("categories")}
        >
          Categories
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "locations"
              ? "border-b-2 border-black font-medium"
              : ""
          }`}
          onClick={() => setActiveTab("locations")}
        >
          Locations
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="m-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Time Spent by Category</h2>
            <div className="h-64">
              <Doughnut
                data={{
                  labels: categoryData.labels,
                  datasets: [
                    {
                      data: categoryData.values,
                      backgroundColor: categoryData.labels.map(
                        (category) => categoryColors[category] || "#CCCCCC"
                      ),
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "right",
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const label = context.label || "";
                          const value = context.raw || 0;
                          const hours = Math.floor(value / 60);
                          const minutes = value % 60;
                          return `${label}: ${hours}h ${minutes}m`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
            <div className="mt-2 text-center text-sm text-gray-500">
              Total: {categoryData.totalHours} hours
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">
              Daily Distribution (hours)
            </h2>
            <div className="h-64">
              <Bar
                data={{
                  labels: dailyDistribution.labels,
                  datasets: [
                    {
                      data: dailyDistribution.values,
                      backgroundColor: dailyDistribution.labels.map(
                        (_, i) => `rgba(54, 162, 235, ${0.5 + i * 0.07})`
                      ),
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      title: {
                        display: true,
                        text: "Hours",
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Activity Trends</h2>
            <div className="h-64">
              <Line
                data={{
                  labels: weeklyTrends.labels,
                  datasets: [
                    {
                      label: "Hours Scheduled",
                      data: weeklyTrends.values,
                      borderColor: "rgb(75, 192, 192)",
                      backgroundColor: "rgba(75, 192, 192, 0.5)",
                      tension: 0.2,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          return `Hours: ${context.parsed.y}`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      title: {
                        display: true,
                        text: "Hours",
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Hourly Distribution</h2>
            <div className="h-64">
              <Bar
                data={{
                  labels: hourlyDistribution.labels,
                  datasets: [
                    {
                      data: hourlyDistribution.values,
                      backgroundColor: "rgba(153, 102, 255, 0.6)",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      title: {
                        display: true,
                        text: "Hours",
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "time" && (
        <div className="m-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Hourly Distribution</h2>
            <div className="h-64">
              <Bar
                data={{
                  labels: hourlyDistribution.labels,
                  datasets: [
                    {
                      data: hourlyDistribution.values,
                      backgroundColor: "rgba(153, 102, 255, 0.6)",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      title: {
                        display: true,
                        text: "Hours",
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Activity Trends</h2>
            <div className="h-64">
              <Line
                data={{
                  labels: weeklyTrends.labels,
                  datasets: [
                    {
                      label: "Hours Scheduled",
                      data: weeklyTrends.values,
                      borderColor: "rgb(75, 192, 192)",
                      backgroundColor: "rgba(75, 192, 192, 0.5)",
                      tension: 0.2,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      title: {
                        display: true,
                        text: "Hours",
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">
              Working Hours Utilization
            </h2>
            <div className="h-64">
              <Bar
                data={{
                  labels: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ],
                  datasets: [
                    {
                      label: "Scheduled Hours",
                      data: dailyDistribution.values,
                      backgroundColor: "rgba(54, 162, 235, 0.6)",
                    },
                    {
                      label: "Working Hours Available",
                      data: Array(7).fill(
                        (getTimeInMinutes(workingHoursEnd) -
                          getTimeInMinutes(workingHoursStart)) /
                          60
                      ),
                      backgroundColor: "rgba(201, 203, 207, 0.4)",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      stacked: false,
                      title: {
                        display: true,
                        text: "Hours",
                      },
                    },
                    x: {
                      stacked: false,
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="m-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Time Spent by Category</h2>
            <div className="h-64">
              <Doughnut
                data={{
                  labels: categoryData.labels,
                  datasets: [
                    {
                      data: categoryData.values,
                      backgroundColor: categoryData.labels.map(
                        (category) => categoryColors[category] || "#CCCCCC"
                      ),
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "right",
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const label = context.label || "";
                          const value = context.raw || 0;
                          const hours = Math.floor(value / 60);
                          const minutes = value % 60;
                          return `${label}: ${hours}h ${minutes}m`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">
              Category Distribution (Top 5)
            </h2>
            <div className="space-y-4">
              {categoryData.percentages
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 5)
                .map((item) => (
                  <div key={item.category} className="flex items-center">
                    <div style={{ width: "120px" }} className="text-sm">
                      {item.category}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5 mx-2">
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor:
                            categoryColors[item.category] || "#CCCCCC",
                        }}
                      ></div>
                    </div>
                    <div className="text-sm">{item.percentage}%</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">
              Category Distribution by Day of Week
            </h2>
            <div className="h-80">
              <Bar
                data={{
                  labels: categoryByDayOfWeek.days,
                  datasets: categoryByDayOfWeek.datasets,
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      stacked: true,
                    },
                    y: {
                      stacked: true,
                      title: {
                        display: true,
                        text: "Hours",
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "locations" && (
        <div className="m-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Top Locations</h2>
            <div className="h-64">
              <Bar
                data={{
                  labels: locationData.labels,
                  datasets: [
                    {
                      data: locationData.values,
                      backgroundColor: "rgba(255, 159, 64, 0.6)",
                    },
                  ],
                }}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Location Statistics</h2>
            <div className="p-4">
              <div className="m-2 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-gray-500 text-sm">
                    Events with Location
                  </div>
                  <div className="text-3xl font-bold mt-2">
                    {travelTimeData.eventsWithLocation}
                  </div>
                  <div className="text-gray-500 text-sm mt-2">
                    {travelTimeData.percentageWithLocation}% of total
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-gray-500 text-sm">Unique Locations</div>
                  <div className="text-3xl font-bold mt-2">
                    {locationData.labels.length}
                  </div>
                </div>
              </div>

              <h3 className="text-md font-medium mt-6 mb-2">
                Location Distribution
              </h3>
              <div className="space-y-2">
                {locationData.percentages.slice(0, 5).map((item) => (
                  <div key={item.location} className="flex items-center">
                    <div className="w-32 truncate text-sm">{item.location}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5 mx-2">
                      <div
                        className="h-2.5 rounded-full bg-orange-400"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-sm">{item.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;

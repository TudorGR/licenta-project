import React, { useState, useEffect } from "react";
import carIcon from "../assets/car.svg";
import walkIcon from "../assets/walk.svg";
import busIcon from "../assets/bus.svg";
import bikeIcon from "../assets/bike.svg";

// TTL for cached data (in milliseconds) - 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Reusable component for centered content
const CenteredContent = ({
  children,
  onMouseEnter,
  onMouseLeave,
  className = "",
  style = {},
}) => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`travel-time-content bg-white  py-0.5 rounded-xl shadow-custom border border-gray-300  z-50  duration-200 ${className}`}
      style={{ pointerEvents: "auto", ...style }}
    >
      {children}
    </div>
  </div>
);

const TravelTimeIndicator = ({ origin, destination, timeBetween }) => {
  const [travelTimes, setTravelTimes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllModes, setShowAllModes] = useState(false);

  // Create a unique cache key for this origin-destination pair
  const getCacheKey = (orig, dest) => {
    return `travel_time_${orig.replace(/\s+/g, "_")}_to_${dest.replace(
      /\s+/g,
      "_"
    )}`;
  };

  // Store data in localStorage with timestamp
  const storeInCache = (key, data) => {
    const cacheData = {
      data: data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  };

  // Get data from localStorage if it exists and is not expired
  const getFromCache = (key) => {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return null;

    try {
      const { data, timestamp } = JSON.parse(cachedData);
      // Check if data is still valid (not expired)
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    } catch (err) {
      // Invalid JSON or structure
      console.error("Error parsing cached travel data:", err);
    }
    return null;
  };

  useEffect(() => {
    const fetchTravelTimes = async () => {
      try {
        if (!origin || !destination) {
          setError("Missing origin or destination");
          setLoading(false);
          return;
        }

        // Generate cache key for this origin-destination pair
        const cacheKey = getCacheKey(origin, destination);

        // Try to get from cache first
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
          setTravelTimes(cachedData);
          setLoading(false);
          return;
        }

        // If not in cache or expired, make API request
        setLoading(true);
        setError(null);
        const response = await fetch(
          "http://localhost:5000/api/travel/calculate-travel-time",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              origin,
              destination,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error");
        }

        const data = await response.json();
        if (!data.driving && !data.walking && !data.transit && !data.cycling) {
          setError("Error");
        } else {
          // Store in cache for future use
          storeInCache(cacheKey, data);
        }

        setTravelTimes(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching travel times:", error);
        setError(error.message || "Error");
        setLoading(false);
      }
    };

    if (
      origin &&
      destination &&
      origin.trim() !== "" &&
      destination.trim() !== ""
    ) {
      fetchTravelTimes();
    } else {
      setLoading(false);
    }
  }, [origin, destination]);

  // Get the fastest travel mode that fits within the available time
  const getFastestValidMode = () => {
    if (!travelTimes || !timeBetween) return null;

    const modes = Object.entries(travelTimes)
      .filter(([mode, time]) => time !== null && time <= timeBetween)
      .sort((a, b) => a[1] - b[1]);

    return modes.length > 0 ? modes[0] : null;
  };

  // Get travel mode status classes
  const getModeStatusClass = (time) => {
    if (time === null) return "text-gray-400";
    if (timeBetween === undefined) return "";

    if (time > timeBetween) return "text-red-500";
    if (time > timeBetween * 0.8) return "text-amber-500";
    return "text-green-500";
  };

  if (loading) {
    return (
      <div
        className="travel-time-indicator h-full relative"
        style={{ pointerEvents: "none" }}
      >
        <div className="travel-time-line border-l-2 border-dashed border-gray-300 absolute h-full left-1/2 transform -translate-x-1/2"></div>
        <CenteredContent>
          <div className="flex items-center text-xs">
            <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Calculating...
          </div>
        </CenteredContent>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="travel-time-indicator h-full relative"
        style={{ pointerEvents: "none" }}
      >
        <div className="travel-time-line border-l-2 border-dashed border-gray-300 absolute h-full left-1/2 transform -translate-x-1/2"></div>
        <CenteredContent>
          <div className="flex items-center text-xs text-red-500">
            <svg
              className="h-3 w-3 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        </CenteredContent>
      </div>
    );
  }

  if (
    !travelTimes ||
    (!travelTimes.driving &&
      !travelTimes.walking &&
      !travelTimes.transit &&
      !travelTimes.cycling)
  ) {
    return (
      <div className="travel-time-indicator h-full relative">
        <div className="travel-time-line border-l-2 border-dashed border-gray-300 absolute h-full left-1/2 transform -translate-x-1/2"></div>
      </div>
    );
  }

  // Get the fastest valid mode
  const fastestMode = getFastestValidMode();
  const lineColor = fastestMode ? "border-green-300" : "border-gray-300";

  return (
    <div
      className="travel-time-indicator h-full relative"
      style={{ pointerEvents: "none" }}
    >
      <div
        className={`travel-time-line border-l-2 border-dashed absolute h-full left-1/2 transform -translate-x-1/2 ${lineColor}`}
      ></div>
      <CenteredContent
        onMouseEnter={() => setShowAllModes(true)}
        onMouseLeave={() => setShowAllModes(false)}
        className={
          showAllModes ? "hover:bg-gray-50 w-auto" : "hover:bg-gray-50"
        }
      >
        {showAllModes ? (
          <div className="travel-modes flex flex-col gap-1 text-xs">
            <div className="font-medium text-center text-gray-600 mb-1">
              Travel Options
            </div>
            {travelTimes.driving !== null && (
              <div
                className={`mode flex items-center justify-between gap-3 ${getModeStatusClass(
                  travelTimes.driving
                )}`}
              >
                <span className="flex items-center">
                  <img src={carIcon} className="w-3 h-3 mr-1.5" alt="Driving" />
                  Driving
                </span>
                <span className="font-medium">{travelTimes.driving} min</span>
              </div>
            )}
            {travelTimes.transit !== null && (
              <div
                className={`mode flex items-center justify-between gap-3 ${getModeStatusClass(
                  travelTimes.transit
                )}`}
              >
                <span className="flex items-center">
                  <img src={busIcon} className="w-3 h-3 mr-1.5" alt="Transit" />
                  Transit
                </span>
                <span className="font-medium">{travelTimes.transit} min</span>
              </div>
            )}
            {travelTimes.cycling !== null && (
              <div
                className={`mode flex items-center justify-between gap-3 ${getModeStatusClass(
                  travelTimes.cycling
                )}`}
              >
                <span className="flex items-center">
                  <img
                    src={bikeIcon}
                    className="w-3 h-3 mr-1.5"
                    alt="Cycling"
                  />
                  Cycling
                </span>
                <span className="font-medium">{travelTimes.cycling} min</span>
              </div>
            )}
            {travelTimes.walking !== null && (
              <div
                className={`mode flex items-center justify-between gap-3 ${getModeStatusClass(
                  travelTimes.walking
                )}`}
              >
                <span className="flex items-center">
                  <img
                    src={walkIcon}
                    className="w-3 h-3 mr-1.5"
                    alt="Walking"
                  />
                  Walking
                </span>
                <span className="font-medium">{travelTimes.walking} min</span>
              </div>
            )}
            <div className="text-center text-xs text-gray-400 mt-1">
              {timeBetween && `Gap: ${timeBetween} min`}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            {fastestMode ? (
              <div
                className={`flex items-center ${getModeStatusClass(
                  fastestMode[1]
                )}`}
              >
                <img
                  src={
                    fastestMode[0] === "driving"
                      ? carIcon
                      : fastestMode[0] === "walking"
                      ? walkIcon
                      : fastestMode[0] === "transit"
                      ? busIcon
                      : bikeIcon
                  }
                  className="w-3 h-3 mr-1"
                  alt={fastestMode[0]}
                />
                <span className="font-medium">{fastestMode[1]} min</span>
              </div>
            ) : (
              <div className="text-red-500 flex items-center">
                <svg
                  className="h-3 w-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Travel needed</span>
              </div>
            )}
          </div>
        )}
      </CenteredContent>
    </div>
  );
};

// Add utility function to clear cache when events change
export const clearTravelTimeCache = () => {
  // Find all travel time related items in localStorage and remove them
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("travel_time_")) {
      localStorage.removeItem(key);
    }
  });
};

// This can be exposed and called from parent components when events are moved
TravelTimeIndicator.clearTravelTimeCache = clearTravelTimeCache;

export default TravelTimeIndicator;

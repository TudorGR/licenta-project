import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import dayjs from "dayjs";
import Context from "../context/Context";
import { AuthContext } from "../context/AuthContext";
import carIcon from "../assets/car.svg";
import walkIcon from "../assets/walk.svg";
import bikeIcon from "../assets/bike.svg";

// TomTom API key
const TOMTOM_API_KEY = "UBJUoHw3ilwLwd6PS15w0ZsTiTJ88sgp";

// Refresh interval in milliseconds (15 minutes)
const REFRESH_INTERVAL = 15 * 60 * 1000;

const NextEventDirections = () => {
  // Existing state variables
  const { savedEvents } = useContext(Context);
  const { user } = useContext(AuthContext);
  const [nextEvent, setNextEvent] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [travelTimes, setTravelTimes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("driving");
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  // New state variables for weather
  const [departureWeather, setDepartureWeather] = useState(null);
  const [arrivalWeather, setArrivalWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [eventCoordinates, setEventCoordinates] = useState(null);

  // Find the next event with a location
  useEffect(() => {
    const findNextEvent = () => {
      const now = dayjs();
      const today = now.startOf("day");
      const endOfDay = now.endOf("day");

      // Filter events for today that have a location and haven't ended yet
      const todayEvents = savedEvents.filter((event) => {
        // Parse day as integer for proper comparison
        const eventDay = dayjs(parseInt(event.day));
        const eventEndTime = event.timeEnd.split(":");
        const eventEnd = eventDay
          .hour(parseInt(eventEndTime[0]))
          .minute(parseInt(eventEndTime[1]));

        return (
          eventDay.isSame(today, "day") &&
          event.location &&
          event.location.trim() !== "" &&
          eventEnd.isAfter(now)
        );
      });

      // Sort by start time
      todayEvents.sort((a, b) => {
        const aTime = a.timeStart.split(":");
        const bTime = b.timeStart.split(":");
        return (
          parseInt(aTime[0]) * 60 +
          parseInt(aTime[1]) -
          (parseInt(bTime[0]) * 60 + parseInt(bTime[1]))
        );
      });

      // Set the next event if we found one
      setNextEvent(todayEvents.length > 0 ? todayEvents[0] : null);

      // Debug log to check if events are being found
      console.log("Today's events with location:", todayEvents);
    };

    findNextEvent();

    // Set up an interval to refresh the next event every 15 minutes
    const interval = setInterval(findNextEvent, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [savedEvents]);

  // Get user's geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Could not access your location");
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
    }
  }, []);

  // Fetch travel times when we have both user location and next event
  useEffect(() => {
    const fetchTravelTimes = async () => {
      if (!userLocation || !nextEvent) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const tt = window.tt || window.tomtom;
        if (!tt) {
          throw new Error("TomTom SDK not loaded");
        }

        // First geocode the destination if it's a string address
        const geocodeResponse = await tt.services.geocode({
          key: TOMTOM_API_KEY,
          query: nextEvent.location,
        });

        if (!geocodeResponse.results || geocodeResponse.results.length === 0) {
          throw new Error("Could not geocode destination location");
        }

        const dest = geocodeResponse.results[0].position;

        // Calculate routes for each transportation mode
        const [drivingRoute, cyclingRoute, walkingRoute] = await Promise.all([
          tt.services.calculateRoute({
            key: TOMTOM_API_KEY,
            locations: `${userLocation.longitude},${userLocation.latitude}:${dest.lng},${dest.lat}`,
            routeType: "fastest",
            travelMode: "car",
          }),
          tt.services.calculateRoute({
            key: TOMTOM_API_KEY,
            locations: `${userLocation.longitude},${userLocation.latitude}:${dest.lng},${dest.lat}`,
            routeType: "fastest",
            travelMode: "bicycle",
          }),
          tt.services.calculateRoute({
            key: TOMTOM_API_KEY,
            locations: `${userLocation.longitude},${userLocation.latitude}:${dest.lng},${dest.lat}`,
            routeType: "fastest",
            travelMode: "pedestrian",
          }),
        ]);

        // Extract travel times in minutes
        const drivingMinutes = Math.round(
          drivingRoute.routes[0].summary.travelTimeInSeconds / 60
        );
        const cyclingMinutes = Math.round(
          cyclingRoute.routes[0].summary.travelTimeInSeconds / 60
        );
        const walkingMinutes = Math.round(
          walkingRoute.routes[0].summary.travelTimeInSeconds / 60
        );

        setTravelTimes({
          driving: drivingMinutes,
          cycling: cyclingMinutes,
          walking: walkingMinutes,
          transit: null, // Transit not directly supported by TomTom, would need another provider
        });
      } catch (err) {
        console.error("Error calculating travel times:", err);
        setError(err.message || "Error calculating travel time");
      } finally {
        setLoading(false);
      }
    };

    fetchTravelTimes();
  }, [userLocation, nextEvent]);

  // Define calculateRoute outside useEffect for better reference stability
  const calculateRoute = useCallback((origin, destination, mode) => {
    if (!mapInstance.current) return;

    const tt = window.tt || window.tomtom;
    if (!tt) return;

    // Use the correct parameters for route calculation
    const routeOptions = {
      key: TOMTOM_API_KEY,
      locations: `${origin[0]},${origin[1]}:${destination[0]},${destination[1]}`,
      routeType: "fastest", // Always use 'fastest' as the routeType
    };

    // Add the appropriate travel mode
    if (mode === "driving") {
      routeOptions.travelMode = "car";
    } else if (mode === "walking") {
      routeOptions.travelMode = "pedestrian";
    } else if (mode === "cycling") {
      routeOptions.travelMode = "bicycle";
    }

    tt.services
      .calculateRoute(routeOptions)
      .then((response) => {
        // Only proceed if map instance still exists
        if (!mapInstance.current) return;

        const geojson = response.toGeoJson();

        // Safely remove existing route layers
        try {
          if (mapInstance.current.getLayer("route")) {
            mapInstance.current.removeLayer("route");
          }
          if (mapInstance.current.getSource("route")) {
            mapInstance.current.removeSource("route");
          }
        } catch (err) {
          console.error("Error removing existing route:", err);
        }

        // Add new route
        try {
          mapInstance.current.addLayer({
            id: "route",
            type: "line",
            source: {
              type: "geojson",
              data: geojson,
            },
            paint: {
              "line-color": "#4a90e2",
              "line-width": 6,
            },
          });
        } catch (err) {
          console.error("Error adding new route:", err);
        }
      })
      .catch((error) => {
        console.error("Error calculating route:", error);
      });
  }, []);

  // Add this block to save destination coordinates when geocoding
  useEffect(() => {
    if (!nextEvent || !userLocation) {
      console.log("No next event or user location for geocoding");
      return;
    }

    console.log("Attempting to geocode location:", nextEvent.location);

    const tt = window.tt || window.tomtom;
    if (!tt) {
      console.error("TomTom SDK not loaded");
      return;
    }

    tt.services
      .geocode({
        key: TOMTOM_API_KEY,
        query: nextEvent.location,
      })
      .then((response) => {
        if (response.results && response.results.length > 0) {
          const dest = response.results[0].position;
          console.log("Successfully geocoded to:", dest);
          setEventCoordinates({
            latitude: dest.lat,
            longitude: dest.lng,
          });
        } else {
          console.log("No geocoding results found for:", nextEvent.location);
        }
      })
      .catch((error) => {
        console.error("Error geocoding event location for weather:", error);
      });
  }, [nextEvent, userLocation]);

  // Add weather fetching logic using Open-Meteo
  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!userLocation || !eventCoordinates || !nextEvent) {
        console.log("Missing data for weather:", {
          hasUserLocation: !!userLocation,
          hasEventCoordinates: !!eventCoordinates,
          hasNextEvent: !!nextEvent,
          nextEventLocation: nextEvent?.location,
        });
        return;
      }

      setWeatherLoading(true);
      setWeatherError(null);

      try {
        // Get the event time
        const eventDay = dayjs(parseInt(nextEvent.day));
        const eventStartTime = nextEvent.timeStart.split(":");
        const eventTime = eventDay
          .hour(parseInt(eventStartTime[0]))
          .minute(parseInt(eventStartTime[1]));

        console.log("Fetching weather for event at time:", eventTime.format());

        // Current weather at user's location (departure)
        const departureResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&current=temperature_2m,weather_code&timezone=auto`
        );

        if (!departureResponse.ok) {
          throw new Error("Failed to fetch departure weather");
        }

        const departureData = await departureResponse.json();

        setDepartureWeather({
          temp: Math.round(departureData.current.temperature_2m),
          condition: getWeatherCondition(departureData.current.weather_code),
          code: departureData.current.weather_code,
        });

        // For arrival weather at event location
        // Format date for Open-Meteo API (YYYY-MM-DD)
        const formattedDate = eventDay.format("YYYY-MM-DD");

        // Only proceed if event is today or within the forecast range (7 days)
        const now = dayjs();
        const sevenDaysFromNow = now.add(7, "day");

        if (eventTime.isAfter(sevenDaysFromNow)) {
          // Event is too far in future for accurate forecast
          setArrivalWeather({
            temp: "--",
            condition: "Unavailable",
            code: 0,
          });
        } else {
          // Fetch hourly forecast for destination
          const forecastResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${eventCoordinates.latitude}&longitude=${eventCoordinates.longitude}&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${formattedDate}&end_date=${formattedDate}`
          );

          if (!forecastResponse.ok) {
            throw new Error("Failed to fetch arrival forecast");
          }

          const forecastData = await forecastResponse.json();

          // Find the closest hourly forecast to the event time
          const eventHour = eventTime.hour();

          // Get temperature from hourly data at event hour
          const temperature = forecastData.hourly.temperature_2m[eventHour];
          const weatherCode = forecastData.hourly.weather_code[eventHour];

          setArrivalWeather({
            temp: Math.round(temperature),
            condition: getWeatherCondition(weatherCode),
            code: weatherCode,
          });
        }
      } catch (err) {
        console.error("Error fetching weather:", err);
        setWeatherError("Could not load weather information");
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeatherData();
  }, [userLocation, eventCoordinates, nextEvent]);

  // Helper function to convert Open-Meteo weather codes to conditions
  const getWeatherCondition = (code) => {
    // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
    if (code === 0) return "Clear";
    if (code === 1) return "MainlyClear";
    if (code === 2) return "PartlyCloudy";
    if (code === 3) return "Cloudy";
    if (code >= 4 && code <= 49) return "Fog";
    if (code >= 50 && code <= 59) return "Drizzle";
    if (code >= 60 && code <= 69) return "Rain";
    if (code >= 70 && code <= 79) return "Snow";
    if (code >= 80 && code <= 99) return "Thunderstorm";
    return "Unknown";
  };

  // Helper function for weather emojis based on Open-Meteo weather codes
  const getWeatherEmoji = (condition) => {
    if (!condition) return "🌡️";

    switch (condition.toLowerCase()) {
      case "clear":
        return "☀️";
      case "mainlyclear":
        return "🌤️";
      case "partlycloudy":
        return "⛅";
      case "cloudy":
        return "☁️";
      case "fog":
        return "🌫️";
      case "drizzle":
        return "🌦️";
      case "rain":
        return "🌧️";
      case "snow":
        return "❄️";
      case "thunderstorm":
        return "⛈️";
      case "unavailable":
        return "❓";
      default:
        return "🌡️";
    }
  };

  // When active tab changes, update the route
  useEffect(() => {
    if (mapInstance.current && nextEvent && userLocation) {
      const origin = [userLocation.longitude, userLocation.latitude];

      const tt = window.tt || window.tomtom;
      if (!tt) return;

      // Recalculate route for the new transport mode
      tt.services
        .geocode({
          key: TOMTOM_API_KEY,
          query: nextEvent.location,
        })
        .then((response) => {
          if (response.results && response.results.length > 0) {
            const dest = response.results[0].position;
            const destCoords = [dest.lng, dest.lat];
            calculateRoute(origin, destCoords, activeTab);
          }
        })
        .catch((error) => {
          console.error("Error geocoding destination:", error);
        });
    }
  }, [activeTab, calculateRoute, nextEvent, userLocation]);

  // Initialize TomTom map when we have both locations
  useEffect(() => {
    if (!nextEvent || !userLocation || !mapRef.current) return;

    // Clear any existing map instance safely
    if (mapInstance.current) {
      try {
        mapInstance.current.remove();
      } catch (err) {
        console.error("Error removing map instance:", err);
      }
      mapInstance.current = null;
    }

    try {
      console.log("Initializing TomTom map...");

      // Initialize the map
      const tt = window.tt || window.tomtom;
      if (!tt) {
        console.error("TomTom SDK not found");
        setError("Map service not available");
        return;
      }

      // Create the map
      mapInstance.current = tt.map({
        key: TOMTOM_API_KEY,
        container: mapRef.current,
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 13,
      });

      // Add markers and draw route
      const origin = [userLocation.longitude, userLocation.latitude];

      // First geocode the destination if it's a string address
      tt.services
        .geocode({
          key: TOMTOM_API_KEY,
          query: nextEvent.location,
        })
        .then((response) => {
          if (!mapInstance.current) return; // Check if map still exists

          if (response.results && response.results.length > 0) {
            const dest = response.results[0].position;
            const destCoords = [dest.lng, dest.lat];

            // Add markers
            try {
              new tt.Marker().setLngLat(origin).addTo(mapInstance.current);
              new tt.Marker().setLngLat(destCoords).addTo(mapInstance.current);
            } catch (err) {
              console.error("Error adding markers:", err);
            }

            // Calculate and display route based on active tab
            calculateRoute(origin, destCoords, activeTab);

            // Fit map to show both points
            try {
              const bounds = new tt.LngLatBounds()
                .extend(origin)
                .extend(destCoords);
              mapInstance.current.fitBounds(bounds, { padding: 50 });
            } catch (err) {
              console.error("Error fitting bounds:", err);
            }
          }
        })
        .catch((error) => {
          console.error("Error geocoding destination:", error);
          setError("Could not find destination location");
        });
    } catch (err) {
      console.error("Error initializing map:", err);
      setError("Map initialization failed: " + err.message);
    }

    // Clean up on unmount or dependencies change
    return () => {
      if (mapInstance.current) {
        try {
          console.log("Cleaning up map instance");
          mapInstance.current.remove();
          mapInstance.current = null;
        } catch (err) {
          console.error("Error during cleanup:", err);
        }
      }
    };
  }, [nextEvent, userLocation, calculateRoute]);

  // Format minutes to hours and minutes
  const formatTime = (minutes) => {
    if (!minutes && minutes !== 0) return "N/A";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins} min`;
    return `${hours} hr ${mins} min`;
  };

  if (!nextEvent) {
    return (
      <div className="w-full rounded-sm">
        <h3 className="mb-2 mx-4">Next up:</h3>
        <p className="text-sm mx-4 text-gray-500">
          No upcoming events with location found for today
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl p-0">
      <h3 className="mb-2 mx-4">Next Up:</h3>
      <div className="pb-2 px-2">
        <div className="border border-gray-200 shadow-custom rounded-xl p-2">
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium truncate">{nextEvent.title}</div>
            <div className="text-sm text-gray-600">
              {dayjs(nextEvent.day).format("ddd, MMM D")}
            </div>
          </div>
          <div className="text-sm text-gray-600 truncate mb-1">
            {nextEvent.location}
          </div>

          {/* Weather Information */}
          {weatherLoading ? (
            <div className="text-xs text-gray-500 mb-2">Loading weather...</div>
          ) : weatherError ? (
            <div className="text-xs text-red-500 mb-2">{weatherError}</div>
          ) : departureWeather && arrivalWeather ? (
            <div className="flex justify-between items-center text-xs mb-2 bg-gray-50 rounded-lg p-1.5">
              <div className="flex items-center">
                <span className="mr-1">
                  {getWeatherEmoji(departureWeather.condition)}
                </span>
                <span>{departureWeather.temp}°C</span>
                <span className="mx-1 text-gray-400">|</span>
                <span className="text-gray-600">Now</span>
              </div>
              <div className="text-gray-400">→</div>
              <div className="flex items-center">
                <span className="mr-1">
                  {getWeatherEmoji(arrivalWeather.condition)}
                </span>
                <span>
                  {arrivalWeather.temp}
                  {arrivalWeather.temp !== "--" ? "°C" : ""}
                </span>
                <span className="mx-1 text-gray-400">|</span>
                <span className="text-gray-600">{nextEvent.timeStart}</span>
              </div>
            </div>
          ) : null}

          {/* Tabs for transport modes */}
          <div className="flex  mb-2">
            <button
              className={`rounded-xl flex items-center px-3 py-1.5 text-xs ${
                activeTab === "driving" ? "bg-gray-100" : "bg-white"
              }`}
              onClick={() => setActiveTab("driving")}
            >
              <img src={carIcon} alt="Drive" className="w-3 h-3 mr-1.5" />
              Drive
            </button>
            <button
              className={`rounded-xl flex items-center px-3 py-1.5 text-xs ${
                activeTab === "cycling" ? "bg-gray-100" : "bg-white"
              }`}
              onClick={() => setActiveTab("cycling")}
            >
              <img src={bikeIcon} alt="Bike" className="w-3 h-3 mr-1.5" />
              Bike
            </button>
            <button
              className={`rounded-xl flex items-center px-3 py-1.5 text-xs ${
                activeTab === "walking" ? "bg-gray-100" : "bg-white"
              }`}
              onClick={() => setActiveTab("walking")}
            >
              <img src={walkIcon} alt="Walk" className="w-3 h-3 mr-1.5" />
              Walk
            </button>
          </div>

          {/* Travel time display */}

          {/* Map container */}
          <div
            ref={mapRef}
            className="w-full h-32 bg-gray-100 mt-2 rounded-xl"
            style={{ minHeight: "130px" }}
          >
            {loading ? (
              <div className="absolute z-10 backdrop-blur-md rounded-xl text-center m-2 text-xs text-gray-500">
                Calculating travel time...
              </div>
            ) : error ? (
              <div className="absolute z-10 backdrop-blur-md rounded-xl text-center m-2 text-xs text-red-500">
                {error}
              </div>
            ) : travelTimes ? (
              <div className="absolute z-10  bg-white/85 rounded-xl text-center m-1 px-2 font-medium">
                {activeTab === "driving" && (
                  <div className="text-sm">
                    {formatTime(travelTimes.driving)}
                  </div>
                )}
                {activeTab === "cycling" && (
                  <div className="text-sm">
                    {formatTime(travelTimes.cycling)}
                  </div>
                )}
                {activeTab === "walking" && (
                  <div className="text-sm">
                    {formatTime(travelTimes.walking)}
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute z-10 backdrop-blur-md rounded-xl text-center m-2 text-xs text-gray-500">
                No travel data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NextEventDirections;

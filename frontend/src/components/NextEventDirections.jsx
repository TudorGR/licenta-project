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

// TomTom API key - Consider moving this to an environment variable for security
const TOMTOM_API_KEY = "UBJUoHw3ilwLwd6PS15w0ZsTiTJ88sgp";

// Refresh interval in milliseconds (15 minutes)
const REFRESH_INTERVAL = 15 * 60 * 1000;

const NextEventDirections = () => {
  const { savedEvents } = useContext(Context);
  const { user } = useContext(AuthContext); // Assuming 'user' might be used later or for context

  const [nextEvent, setNextEvent] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [eventCoordinates, setEventCoordinates] = useState(null); // Stores geocoded {latitude, longitude} of the event
  const [travelTimes, setTravelTimes] = useState(null);

  const [loading, setLoading] = useState(true); // General loading for travel times and map
  const [error, setError] = useState(null); // General error

  const [activeTab, setActiveTab] = useState("driving");
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const [departureWeather, setDepartureWeather] = useState(null);
  const [arrivalWeather, setArrivalWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  const [lastCalculationTime, setLastCalculationTime] = useState(0);
  const [cachedTravelTimes, setCachedTravelTimes] = useState(null);
  const [cachedLocation, setCachedLocation] = useState(null); // For caching based on user's location

  // 1. Find the next event
  useEffect(() => {
    const findNextEvent = () => {
      const now = dayjs();
      const today = now.startOf("day");

      const todayEvents = savedEvents.filter((event) => {
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

      todayEvents.sort((a, b) => {
        const aTime = a.timeStart.split(":");
        const bTime = b.timeStart.split(":");
        return (
          parseInt(aTime[0]) * 60 +
          parseInt(aTime[1]) -
          (parseInt(bTime[0]) * 60 + parseInt(bTime[1]))
        );
      });

      const currentNextEvent = todayEvents.length > 0 ? todayEvents[0] : null;

      // Only update if the next event actually changed (compare by ID and location)
      const hasChanged =
        (!nextEvent && currentNextEvent) ||
        (nextEvent && !currentNextEvent) ||
        (nextEvent &&
          currentNextEvent &&
          (nextEvent.id !== currentNextEvent.id ||
            nextEvent.location !== currentNextEvent.location));

      if (hasChanged) {
        setNextEvent(currentNextEvent);
        if (!currentNextEvent) {
          setEventCoordinates(null);
          setTravelTimes(null);
          setError(null);
          setLoading(false);
        }
      }
    };

    findNextEvent();
    const interval = setInterval(findNextEvent, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [savedEvents, nextEvent]); // Added nextEvent to dependencies for comparison

  // 2. Get user's geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setError(null); // Clear location error if successful
        },
        (err) => {
          console.error("Error getting location:", err);
          setError(
            "Could not access your location. Please enable location services."
          );
          setUserLocation(null); // Ensure userLocation is null on error
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setUserLocation(null);
    }
  }, []);

  // 3. Geocode nextEvent.location to get eventCoordinates (Centralized Geocoding)
  useEffect(() => {
    if (!nextEvent || !nextEvent.location) {
      setEventCoordinates(null);
      // If there's no event or location, we might not want to show a geocoding-specific error,
      // as the "no event" message will be shown.
      // setError(null); // Or set a specific message if needed
      return;
    }

    setLoading(true); // Indicate geocoding activity
    setError(null); // Clear previous errors

    const tt = window.tt || window.tomtom;
    if (!tt || !tt.services) {
      console.error("TomTom SDK or services not loaded for geocoding.");
      setError("Map service not available for geocoding.");
      setEventCoordinates(null);
      setLoading(false);
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
          setEventCoordinates({ latitude: dest.lat, longitude: dest.lng });
          setError(null); // Clear error on success
        } else {
          console.error("Geocoding: No results found for", nextEvent.location);
          setError(`Could not find location: ${nextEvent.location}`);
          setEventCoordinates(null);
        }
      })
      .catch((err) => {
        console.error("Error geocoding event location:", err);
        if (err.message && err.message.includes("429")) {
          setError("Rate limit exceeded while finding location. Please wait.");
        } else {
          setError("Error finding event location.");
        }
        setEventCoordinates(null);
      })
      .finally(() => {
        // Set loading to false here if this is the only thing `loading` state is for initially
        // However, fetchTravelTimes also sets loading, so manage carefully.
        // For now, fetchTravelTimes will handle the final setLoading(false).
      });
  }, [nextEvent]); // Only depends on nextEvent (or nextEvent.location if it's stable)

  // 4. Fetch travel times when userLocation and eventCoordinates are available
  useEffect(() => {
    const fetchTravelTimes = async () => {
      if (!userLocation || !eventCoordinates) {
        // Use geocoded eventCoordinates
        setTravelTimes(null); // Clear previous travel times
        setLoading(false); // Stop loading if we can't proceed
        return;
      }

      const now = Date.now();
      const cacheValidTime = 10 * 60 * 1000; // 10 minutes

      if (
        cachedTravelTimes &&
        cachedLocation &&
        now - lastCalculationTime < cacheValidTime &&
        cachedLocation.latitude === userLocation.latitude &&
        cachedLocation.longitude === userLocation.longitude &&
        // Add a check for eventCoordinates if caching should depend on destination too
        // For simplicity, current cache is mainly for user location changes
        nextEvent &&
        cachedTravelTimes.eventId === nextEvent.id // Assuming events have a unique ID
      ) {
        setTravelTimes(cachedTravelTimes.data);
        setLoading(false);
        return;
      }

      if (now - lastCalculationTime < 60000 && cachedTravelTimes) {
        // Don't hammer API if recently calculated
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null); // Clear previous errors

      try {
        const tt = window.tt || window.tomtom;
        if (!tt || !tt.services) {
          throw new Error(
            "TomTom SDK or services not loaded for travel times."
          );
        }

        // Destination is now from eventCoordinates
        const dest = {
          lng: eventCoordinates.longitude,
          lat: eventCoordinates.latitude,
        };

        const calculateWithDelay = async (mode, delay = 0) => {
          if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
          return tt.services.calculateRoute({
            key: TOMTOM_API_KEY,
            locations: `${userLocation.longitude},${userLocation.latitude}:${dest.lng},${dest.lat}`,
            routeType: "fastest",
            travelMode: mode,
          });
        };

        const drivingRoute = await calculateWithDelay("car", 0);
        const cyclingRoute = await calculateWithDelay("bicycle", 1000); // 1s delay
        const walkingRoute = await calculateWithDelay("pedestrian", 2000); // 2s delay from previous

        const newTravelTimesData = {
          driving: Math.round(
            drivingRoute.routes[0].summary.travelTimeInSeconds / 60
          ),
          cycling: Math.round(
            cyclingRoute.routes[0].summary.travelTimeInSeconds / 60
          ),
          walking: Math.round(
            walkingRoute.routes[0].summary.travelTimeInSeconds / 60
          ),
          transit: null, // Placeholder
        };

        setTravelTimes(newTravelTimesData);
        setCachedTravelTimes({
          data: newTravelTimesData,
          eventId: nextEvent ? nextEvent.id : null,
        });
        setCachedLocation(userLocation);
        setLastCalculationTime(now);
        setError(null);
      } catch (err) {
        console.error("Error calculating travel times:", err);
        if (
          err.message &&
          (err.message.includes("429") ||
            err.message.includes("Too Many Requests"))
        ) {
          setError(
            "Rate limit reached for travel times. Please try again later."
          );
        } else if (err.message && err.message.includes("No route found")) {
          setError("No route available for one or more travel modes.");
          setTravelTimes({
            driving: null,
            cycling: null,
            walking: null,
            transit: null,
          }); // Allow partial display
        } else {
          setError(err.message || "Error calculating travel times.");
        }
        setTravelTimes(null); // Clear travel times on error
      } finally {
        setLoading(false);
      }
    };

    fetchTravelTimes();
  }, [userLocation, eventCoordinates, nextEvent]); // Dependencies: user location, geocoded event coords, and nextEvent for caching ID

  // 5. Fetch weather data
  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!userLocation || !eventCoordinates || !nextEvent) {
        setDepartureWeather(null);
        setArrivalWeather(null);
        return;
      }

      setWeatherLoading(true);
      setWeatherError(null);

      try {
        const eventDay = dayjs(parseInt(nextEvent.day));
        const eventStartTime = nextEvent.timeStart.split(":");
        const eventTime = eventDay
          .hour(parseInt(eventStartTime[0]))
          .minute(parseInt(eventStartTime[1]));

        const departureResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&current=temperature_2m,weather_code&timezone=auto`
        );
        if (!departureResponse.ok)
          throw new Error("Failed to fetch departure weather");
        const departureData = await departureResponse.json();
        setDepartureWeather({
          temp: Math.round(departureData.current.temperature_2m),
          condition: getWeatherCondition(departureData.current.weather_code),
          code: departureData.current.weather_code,
        });

        const formattedDate = eventDay.format("YYYY-MM-DD");
        const now = dayjs();
        const sevenDaysFromNow = now.add(7, "day");

        if (eventTime.isAfter(sevenDaysFromNow)) {
          setArrivalWeather({ temp: "--", condition: "Unavailable", code: 0 });
        } else {
          const forecastResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${eventCoordinates.latitude}&longitude=${eventCoordinates.longitude}&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${formattedDate}&end_date=${formattedDate}`
          );
          if (!forecastResponse.ok)
            throw new Error("Failed to fetch arrival forecast");
          const forecastData = await forecastResponse.json();
          const eventHour = eventTime.hour();

          if (
            forecastData.hourly &&
            forecastData.hourly.temperature_2m &&
            forecastData.hourly.temperature_2m[eventHour] !== undefined
          ) {
            const temperature = forecastData.hourly.temperature_2m[eventHour];
            const weatherCode = forecastData.hourly.weather_code[eventHour];
            setArrivalWeather({
              temp: Math.round(temperature),
              condition: getWeatherCondition(weatherCode),
              code: weatherCode,
            });
          } else {
            setArrivalWeather({ temp: "--", condition: "N/A", code: 0 }); // Data not available for the hour
          }
        }
      } catch (err) {
        console.error("Error fetching weather:", err);
        setWeatherError("Could not load weather information.");
        setDepartureWeather(null);
        setArrivalWeather(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    if (userLocation && eventCoordinates && nextEvent) {
      fetchWeatherData();
    }
  }, [userLocation, eventCoordinates, nextEvent]);

  // 6. Memoized function to calculate and draw route on map
  const calculateRouteOnMap = useCallback(
    (originCoords, destinationCoords, mode) => {
      if (!mapInstance.current || !originCoords || !destinationCoords) return;

      const tt = window.tt || window.tomtom;
      if (!tt || !tt.services) {
        console.error(
          "TomTom SDK or services not loaded for map route calculation."
        );
        // Optionally set an error specific to map route drawing
        return;
      }

      const routeOptions = {
        key: TOMTOM_API_KEY,
        locations: `${originCoords[0]},${originCoords[1]}:${destinationCoords[0]},${destinationCoords[1]}`,
        routeType: "fastest",
      };

      if (mode === "driving") routeOptions.travelMode = "car";
      else if (mode === "walking") routeOptions.travelMode = "pedestrian";
      else if (mode === "cycling") routeOptions.travelMode = "bicycle";
      else return; // Unknown mode

      tt.services
        .calculateRoute(routeOptions)
        .then((response) => {
          if (!mapInstance.current) return; // Map might have been unmounted

          const geojson = response.toGeoJson();
          try {
            if (mapInstance.current.getLayer("route")) {
              mapInstance.current.removeLayer("route");
            }
            if (mapInstance.current.getSource("route")) {
              mapInstance.current.removeSource("route");
            }
          } catch (err) {
            console.error("Error removing existing route from map:", err);
          }

          try {
            mapInstance.current.addLayer({
              id: "route",
              type: "line",
              source: { type: "geojson", data: geojson },
              paint: { "line-color": "#4a90e2", "line-width": 6 },
            });
          } catch (err) {
            console.error("Error adding new route to map:", err);
          }
        })
        .catch((routeError) => {
          console.error(
            `Error calculating route for map (${mode}):`,
            routeError
          );
          // Optionally display this error on the map or as a notification
          if (mapInstance.current) {
            // Clear previous route if error
            try {
              if (mapInstance.current.getLayer("route"))
                mapInstance.current.removeLayer("route");
              if (mapInstance.current.getSource("route"))
                mapInstance.current.removeSource("route");
            } catch (e) {
              /* ignore */
            }
          }
        });
    },
    []
  ); // Empty dependency array as TOMTOM_API_KEY is constant, tt is global

  // 7. Update map route when activeTab, userLocation, or eventCoordinates change
  useEffect(() => {
    if (mapInstance.current && userLocation && eventCoordinates && activeTab) {
      const origin = [userLocation.longitude, userLocation.latitude];
      const destination = [
        eventCoordinates.longitude,
        eventCoordinates.latitude,
      ];
      calculateRouteOnMap(origin, destination, activeTab);
    }
  }, [activeTab, userLocation, eventCoordinates, calculateRouteOnMap]);

  // 8. Initialize or update TomTom map
  useEffect(() => {
    if (!mapRef.current || !userLocation || !eventCoordinates) {
      // If map exists but conditions are no longer met, remove it
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
        mapInstance.current = null;
      }
      return;
    }

    // setError(null); // Clear general errors before trying to init map

    const tt = window.tt || window.tomtom;
    if (!tt || !tt.map) {
      console.error("TomTom SDK or tt.map not found for map initialization.");
      setError("Map service not available.");
      return;
    }

    // If map instance already exists, we might only need to update markers/route
    // For simplicity here, we re-initialize if key dependencies change,
    // but a more optimal approach might be to update existing instance.
    if (mapInstance.current) {
      try {
        mapInstance.current.remove();
      } catch (e) {
        console.error("Error removing old map instance:", e);
      }
      mapInstance.current = null;
    }

    try {
      mapInstance.current = tt.map({
        key: TOMTOM_API_KEY,
        container: mapRef.current,
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 13,
      });

      mapInstance.current.on("load", () => {
        if (!mapInstance.current) return; // component might have unmounted

        const origin = [userLocation.longitude, userLocation.latitude];
        const destination = [
          eventCoordinates.longitude,
          eventCoordinates.latitude,
        ];

        try {
          new tt.Marker().setLngLat(origin).addTo(mapInstance.current);
          new tt.Marker().setLngLat(destination).addTo(mapInstance.current);
        } catch (markerErr) {
          console.error("Error adding markers to map:", markerErr);
        }

        calculateRouteOnMap(origin, destination, activeTab);

        try {
          const bounds = new tt.LngLatBounds()
            .extend(origin)
            .extend(destination);

          // Check if the bounds are valid and not too small
          const northEast = bounds.getNorthEast();
          const southWest = bounds.getSouthWest();
          const latDiff = Math.abs(northEast.lat - southWest.lat);
          const lngDiff = Math.abs(northEast.lng - southWest.lng);

          // Minimum difference threshold to avoid fitting too small bounds
          const minDiff = 0.001; // approximately 100 meters

          if (!bounds.isEmpty() && (latDiff > minDiff || lngDiff > minDiff)) {
            mapInstance.current.fitBounds(bounds, {
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
              maxZoom: 15,
            });
          } else {
            // If bounds are too small or invalid, center on user location with appropriate zoom
            mapInstance.current.setCenter(origin);
            mapInstance.current.setZoom(14);
          }
        } catch (boundsErr) {
          console.error("Error fitting map bounds:", boundsErr);
          // Fallback to centering on user location
          try {
            mapInstance.current.setCenter(origin);
            mapInstance.current.setZoom(14);
          } catch (centerErr) {
            console.error("Error setting map center:", centerErr);
          }
        }
      });

      mapInstance.current.on("error", (mapError) => {
        console.error("TomTom map error:", mapError);
        setError("A map error occurred: " + mapError.error.message);
      });
    } catch (initErr) {
      console.error("Error initializing map:", initErr);
      setError("Map initialization failed: " + initErr.message);
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {
          /* ignore */
        }
        mapInstance.current = null;
      }
    }

    return () => {
      // Cleanup
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {
          console.error("Error in map cleanup:", e);
        }
        mapInstance.current = null;
      }
    };
  }, [userLocation, eventCoordinates, activeTab, calculateRouteOnMap]); // Re-init map if these critical things change. Added activeTab for initial route.

  // Helper functions
  const formatTime = (minutes) => {
    if (minutes === null || minutes === undefined || isNaN(minutes))
      return "N/A";
    if (minutes < 0) return "N/A"; // Or handle error case
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    return `${hours} hr ${mins} min`;
  };

  const getWeatherCondition = (code) => {
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
      case "n/a":
        return "❔";
      default:
        return "🌡️";
    }
  };

  // Conditional rendering
  if (!nextEvent && !loading && !error) {
    // Show only if no event and not in error/loading state from other sources
    return (
      <div className="w-full rounded-sm">
        <h3 className="mb-2 mx-4">Next up:</h3>
        <p className="text-sm mx-4 mb-3 text-gray-500">
          No upcoming events with location found for today.
        </p>
      </div>
    );
  }

  // Handle case where user location is not available
  if (!userLocation && !error) {
    // If error is set, it will be displayed below
    return (
      <div className="w-full rounded-sm p-4 text-center">
        <p className="text-sm text-gray-500">Getting your location...</p>
      </div>
    );
  }
  if (!userLocation && error) {
    // If location error
    return (
      <div className="w-full rounded-sm p-4 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  // If there is a next event, but coordinates are still loading or failed
  if (nextEvent && !eventCoordinates && loading && !error) {
    return (
      <div className="w-full rounded-xl p-0">
        <h3 className="mb-2 mx-4">Next Up: {nextEvent.title}</h3>
        <div className="p-4 text-center text-sm text-gray-500">
          Finding event location...
        </div>
      </div>
    );
  }

  // Display general error if it's set and not related to "no event"
  if (error && (!nextEvent || (nextEvent && eventCoordinates))) {
    // Show error if it's a persistent one
    // This condition is a bit tricky; we want to show "no event" if that's the case,
    // but other errors (like API limit) should be prominent.
  }

  return (
    <div className="w-full rounded-xl p-0">
      {nextEvent && <h3 className="mb-2 mx-4">Next Up:</h3>}
      {nextEvent ? (
        <div className="pb-2 px-2">
          <div className="border border-gray-200 shadow-custom rounded-xl p-2">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium truncate">{nextEvent.title}</div>
              <div className="text-sm text-gray-600">
                {dayjs(parseInt(nextEvent.day)).format("ddd, MMM D")}
              </div>
            </div>
            <div className="text-sm text-gray-600 truncate mb-1">
              {nextEvent.location}
            </div>

            {/* Weather Information */}
            {weatherLoading ? (
              <div className="text-xs text-gray-500 my-3">
                Loading weather...
              </div>
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
                    {arrivalWeather.temp !== "--" &&
                    arrivalWeather.temp !== "N/A"
                      ? "°C"
                      : ""}
                  </span>
                  <span className="mx-1 text-gray-400">|</span>
                  <span className="text-gray-600">{nextEvent.timeStart}</span>
                </div>
              </div>
            ) : null}

            {/* Tabs for transport modes */}
            <div className="flex mb-2">
              {["driving", "cycling", "walking"].map((mode) => (
                <button
                  key={mode}
                  className={`rounded-xl flex items-center px-3 py-1.5 text-xs mr-1 ${
                    activeTab === mode
                      ? "bg-gray-100 font-semibold"
                      : "bg-white"
                  }`}
                  onClick={() => setActiveTab(mode)}
                >
                  <img
                    src={
                      mode === "driving"
                        ? carIcon
                        : mode === "cycling"
                        ? bikeIcon
                        : walkIcon
                    }
                    alt={mode}
                    className="w-3 h-3 mr-1.5"
                  />
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* General Error Display Area if not map specific */}
            {error &&
              !loading && ( // Show general error if present and not loading something else.
                <div className="my-2 text-xs text-red-500 p-1 bg-red-50 rounded">
                  {error}
                </div>
              )}

            {/* Map container and Travel Time display */}
            <div
              ref={mapRef}
              className="w-full h-32 bg-gray-200 mt-2 rounded-xl relative" // Added relative for positioning overlay
              style={{ minHeight: "130px" }}
            >
              {/* Overlay for loading/error/travel time */}
              <div className="absolute top-1 left-1 z-10">
                {
                  loading && (!travelTimes || !mapInstance.current) ? ( // Show loading if travel times or map not ready
                    <div className="bg-white/85 backdrop-blur-md rounded-lg text-center p-1 px-2 text-xs text-gray-600 shadow">
                      Calculating...
                    </div>
                  ) : travelTimes ? (
                    <div className="bg-white/85 backdrop-blur-md rounded-lg text-center p-1 px-2 font-medium text-sm text-gray-800 shadow">
                      {activeTab === "driving" &&
                        formatTime(travelTimes.driving)}
                      {activeTab === "cycling" &&
                        formatTime(travelTimes.cycling)}
                      {activeTab === "walking" &&
                        formatTime(travelTimes.walking)}
                    </div>
                  ) : !error ? ( // If no error and no travel times (e.g. still initializing)
                    <div className="bg-white/85 backdrop-blur-md rounded-lg text-center p-1 px-2 text-xs text-gray-500 shadow">
                      Map loading...
                    </div>
                  ) : null /* Error is handled by general error display or map specific error */
                }
              </div>
              {/* Map will be rendered here by TomTom SDK */}
              {!userLocation ||
                (!eventCoordinates && !loading && !error && (
                  <div className="flex items-center justify-center h-full text-xs text-gray-500">
                    {/* Placeholder if map cannot be shown due to missing coords */}
                    {!userLocation || !eventCoordinates
                      ? "Waiting for location data..."
                      : ""}
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        // This case is for when nextEvent is null, but we are past the initial "no event" message.
        // Could be due to an error that cleared nextEvent, or initial loading.
        // The specific loading/error states above should ideally catch these.
        !loading &&
        !error && ( // Fallback if no event, not loading, and no error explicitly handled
          <div className="w-full rounded-sm">
            <h3 className="mb-2 mx-4">Next up:</h3>
            <p className="text-sm mx-4 mb-3 text-gray-500">
              No upcoming events with location found for today.
            </p>
          </div>
        )
      )}
      {/* Fallback error display if not caught elsewhere, and it's not a simple "no event" scenario */}
      {error && (!nextEvent || loading) && (
        <div className="m-4 p-2 text-xs text-red-500 bg-red-50 rounded-lg text-center">
          {error}
        </div>
      )}
    </div>
  );
};

export default NextEventDirections;

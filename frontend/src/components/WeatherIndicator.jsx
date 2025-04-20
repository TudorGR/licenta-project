import React, { useState, useEffect } from "react";
// Import the new weather icons
import day from "../assets/day.svg";
import night from "../assets/night.svg";
import cloudy from "../assets/cloudy.svg";
import cloudyDay1 from "../assets/cloudy-day-1.svg";
import cloudyDay2 from "../assets/cloudy-day-2.svg";
import cloudyDay3 from "../assets/cloudy-day-3.svg";
import cloudyNight1 from "../assets/cloudy-night-1.svg";
import cloudyNight2 from "../assets/cloudy-night-2.svg";
import cloudyNight3 from "../assets/cloudy-night-3.svg";
import rainy1 from "../assets/rainy-1.svg";
import rainy2 from "../assets/rainy-2.svg";
import rainy3 from "../assets/rainy-3.svg";
import rainy4 from "../assets/rainy-4.svg";
import rainy5 from "../assets/rainy-5.svg";
import rainy6 from "../assets/rainy-6.svg";
import rainy7 from "../assets/rainy-7.svg";
import snowy1 from "../assets/snowy-1.svg";
import snowy2 from "../assets/snowy-2.svg";
import snowy3 from "../assets/snowy-3.svg";
import snowy4 from "../assets/snowy-4.svg";
import snowy5 from "../assets/snowy-5.svg";
import snowy6 from "../assets/snowy-6.svg";
import thunder from "../assets/thunder.svg";

// Cache for weather data to minimize API requests
const weatherCache = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const WeatherIndicator = ({ hour, date, location = "Bucharest" }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [geoError, setGeoError] = useState(null);

  // Format the date to YYYY-MM-DD for caching purposes
  const dateStr = date.format("YYYY-MM-DD");
  const cacheKey = `${dateStr}-${location}-${coordinates?.latitude}-${coordinates?.longitude}`;

  // Get user's geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          setGeoError(error.message);
          // Fallback to default coordinates (Bucharest)
          setCoordinates({
            latitude: 44.4268,
            longitude: 26.1025,
          });
        },
        { timeout: 10000 }
      );
    } else {
      setGeoError("Geolocation is not supported by your browser");
      // Fallback to default coordinates
      setCoordinates({
        latitude: 44.4268,
        longitude: 26.1025,
      });
    }
  }, []);

  useEffect(() => {
    // Don't fetch until we have coordinates
    if (!coordinates) return;

    const fetchWeatherData = async () => {
      try {
        setLoading(true);

        // Check if we have cached data
        if (
          weatherCache[cacheKey] &&
          Date.now() - weatherCache[cacheKey].timestamp < CACHE_TTL
        ) {
          const cachedHourlyData = weatherCache[cacheKey].data.hourly.find(
            (item) => new Date(item.time).getHours() === hour
          );

          if (cachedHourlyData) {
            setWeather(cachedHourlyData);
            setLoading(false);
            // Trigger fade-in after data is loaded
            setTimeout(() => setVisible(true), 50);
            return;
          }
        }

        // If no cached data, fetch from API using user's coordinates
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&hourly=temperature_2m,precipitation,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset&current_weather=true&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`
        );

        if (!response.ok) {
          throw new Error("Weather API request failed");
        }

        const data = await response.json();

        // Get sunrise and sunset times for determining day/night
        const sunrise = data.daily.sunrise[0];
        const sunset = data.daily.sunset[0];

        // Process data to create hourly weather objects
        const hourlyData = data.hourly.time.map((time, index) => ({
          time,
          temperature: data.hourly.temperature_2m[index],
          precipitation: data.hourly.precipitation[index],
          weatherCode: data.hourly.weathercode[index],
          isDaytime: isTimeInDaylight(time, sunrise, sunset),
        }));

        // Store in cache
        weatherCache[cacheKey] = {
          data: {
            hourly: hourlyData,
            sunrise,
            sunset,
          },
          timestamp: Date.now(),
        };

        // Find current hour's weather
        const hourlyWeather = hourlyData.find(
          (item) => new Date(item.time).getHours() === hour
        );

        setWeather(hourlyWeather);
        setLoading(false);
        // Trigger fade-in after data is loaded
        setTimeout(() => setVisible(true), 50);
      } catch (error) {
        console.error("Error fetching weather data:", error);
        setLoading(false);
      }
    };

    // Helper function to determine if a time is during daylight
    const isTimeInDaylight = (timeStr, sunrise, sunset) => {
      const time = new Date(timeStr);
      const sunriseTime = new Date(sunrise);
      const sunsetTime = new Date(sunset);
      return time >= sunriseTime && time <= sunsetTime;
    };

    fetchWeatherData();

    // Reset visibility when component unmounts or dependencies change
    return () => {
      setVisible(false);
    };
  }, [hour, dateStr, location, cacheKey, coordinates]);

  if (loading || !weather) {
    return null;
  }

  // Helper function to get detailed weather icon based on WMO weather code and time of day
  const getWeatherIcon = (code, precipitation, isDaytime) => {
    // Clear sky (WMO code 0)
    if (code === 0) {
      return isDaytime ? day : night;
    }

    // Mainly clear, partly cloudy (WMO codes 1-2)
    if (code <= 2) {
      return isDaytime ? cloudyDay1 : cloudyNight1;
    }

    // Overcast (WMO code 3)
    if (code === 3) {
      return isDaytime ? cloudyDay3 : cloudyNight3;
    }

    // Fog, mist (WMO codes 45-48)
    if (code >= 45 && code <= 48) {
      return isDaytime ? cloudyDay2 : cloudyNight2;
    }

    // Drizzle (WMO codes 51-57)
    if (code >= 51 && code <= 57) {
      return precipitation < 0.5 ? rainy1 : rainy2;
    }

    // Rain (WMO codes 61-67)
    if (code >= 61 && code <= 67) {
      if (precipitation < 1) return rainy2;
      if (precipitation < 4) return rainy4;
      if (precipitation < 10) return rainy5;
      return rainy6;
    }

    // Snow (WMO codes 71-77)
    if (code >= 71 && code <= 77) {
      if (precipitation < 1) return snowy1;
      if (precipitation < 3) return snowy3;
      return snowy6;
    }

    // Shower rain (WMO codes 80-82)
    if (code >= 80 && code <= 82) {
      return precipitation < 3 ? rainy3 : rainy7;
    }

    // Snow showers (WMO codes 85-86)
    if (code >= 85 && code <= 86) {
      return snowy2;
    }

    // Thunderstorm (WMO codes 95-99)
    if (code >= 95) {
      return thunder;
    }

    // Default: cloudy
    return cloudy;
  };

  const icon = getWeatherIcon(
    weather.weatherCode,
    weather.precipitation,
    weather.isDaytime
  );

  return (
    <div
      className="weather-indicator flex items-center justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease-in-out",
      }}
    >
      <img src={icon} alt="Weather" className="w-8 h-8" />
      <span className="text-xs text-gray-500 ml-1">
        {Math.round(weather.temperature)}°C
      </span>
    </div>
  );
};

export default WeatherIndicator;

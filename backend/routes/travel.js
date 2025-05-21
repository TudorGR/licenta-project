import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";

dotenv.config();
const router = express.Router();

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Helper function to get JSON response from GROQ API
async function getGroqJsonResponse(prompt) {
  const groqResponse = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama3-70b-8192",
    temperature: 0.1, // Low temperature for more predictable responses
  });

  const aiResponse = groqResponse.choices[0]?.message?.content;
  if (!aiResponse) {
    throw new Error("Empty response from GROQ API");
  }

  // Extract JSON from response
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from GROQ response");
  }

  return JSON.parse(jsonMatch[0]);
}

router.post("/location-to-coords", async (req, res) => {
  const { location } = req.body;

  if (!location) {
    return res.status(400).json({ error: "Location is required" });
  }

  try {
    const prompt = `
      Convert this location text: "${location}" into precise latitude and longitude coordinates.
      Respond only with a JSON object in this exact format:
      {
        "latitude": [number],
        "longitude": [number]
      }
      
      If you can't determine the coordinates, respond with:
      {
        "latitude": null,
        "longitude": null
      }
    `;

    // Get coordinates using the helper function
    const coordinates = await getGroqJsonResponse(prompt);
    res.json(coordinates);
  } catch (error) {
    console.error("Error converting location to coordinates:", error);
    res.status(500).json({
      error: "Failed to convert location to coordinates",
      latitude: null,
      longitude: null,
    });
  }
});

// Weather proxy endpoint
router.get("/weather", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    // Forward the request to Open Meteo without auth headers
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,weathercode&forecast_days=1`
    );

    // Return the data to the client
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

export default router;

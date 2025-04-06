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

router.post("/calculate-travel-time", async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res
        .status(400)
        .json({ error: "Origin and destination are required" });
    }

    // Create a prompt for GROQ to estimate travel times
    const prompt = `I need to travel from "${origin}" to "${destination}". 
    
    Please estimate the travel time in minutes for each transportation mode:
    1. Driving
    2. Walking
    3. Public transit (bus/train/subway)
    4. Cycling
    
    Return ONLY a valid JSON object in this exact format with no additional text:
    {
      "driving": [number of minutes as integer],
      "walking": [number of minutes as integer],
      "transit": [number of minutes as integer],
      "cycling": [number of minutes as integer]
    }
    
    If you cannot estimate for a specific mode, use null for that value. If locations are invalid or cannot be determined, return null for all values.
    `;

    // Call GROQ API
    const groqResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
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

    try {
      const travelTimes = JSON.parse(jsonMatch[0]);

      // Validate the response format
      const expectedKeys = ["driving", "walking", "transit", "cycling"];
      const hasAllKeys = expectedKeys.every((key) => key in travelTimes);

      if (!hasAllKeys) {
        throw new Error("Response is missing required fields");
      }

      res.json(travelTimes);
    } catch (error) {
      console.error("Error parsing GROQ response:", error);
      throw new Error("Invalid JSON in GROQ response");
    }
  } catch (error) {
    console.error("Error calculating travel time:", error);
    res.status(500).json({
      error: "Failed to calculate travel time",
      message: error.message,
    });
  }
});

export default router;

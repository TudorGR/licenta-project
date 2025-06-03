import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import eventRoutes from "./routes/events.js";
import suggestionRoutes from "./routes/suggestions.js";
import travelRoutes from "./routes/travel.js";
import localEventsRoutes from "./routes/localEvents.js";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";
import "./models/associations.js";

const app = express();
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/events", eventRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api/local-events", localEventsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
sequelize.sync({ alter: true }).then(() => {
  console.log("Database synchronized");
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.DB_HOST || "localhost",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "calendariq",
  port: process.env.DB_PORT || 3306,
  logging: false,
});

sequelize.authenticate().catch((err) => {
  console.error("Database connection error:", err);
});

export default sequelize;

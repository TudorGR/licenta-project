import { Sequelize } from "sequelize";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: false,
});

sequelize.authenticate().catch((err) => {
  console.error("Database connection error:", err);
});

export default sequelize;

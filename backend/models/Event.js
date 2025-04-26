import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database.js";

class Event extends Model {}

Event.init(
  {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    day: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timeStart: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timeEnd: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
    },
    location: {
      type: DataTypes.STRING,
    },
    locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Add reminder fields
    reminderEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    reminderTime: {
      type: DataTypes.INTEGER, // Minutes before event
      defaultValue: 15,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Event",
    indexes: [
      // Add index for the day field which is used in almost all queries
      { fields: ["day"] },

      // Composite index for day+timeStart for time range queries
      { fields: ["day", "timeStart"] },

      // Composite index for category+day for pattern analysis
      { fields: ["category", "day"] },

      // Composite index for userId+day for user-specific queries
      { fields: ["userId", "day"] },
    ],
  }
);

export default Event;

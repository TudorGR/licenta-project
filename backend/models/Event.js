import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Event = sequelize.define("Event", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: DataTypes.STRING,
  day: {
    type: DataTypes.BIGINT,
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
  label: {
    type: DataTypes.STRING,
    defaultValue: "gray",
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: "None",
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export default Event;

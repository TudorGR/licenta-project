import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";

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
  locked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: "id",
    },
  },
});

// Create association
Event.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Event, { foreignKey: "userId" });

export default Event;

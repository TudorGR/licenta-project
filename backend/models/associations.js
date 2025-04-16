import User from "./User.js";
import Event from "./Event.js";

// Define associations
User.hasMany(Event, { foreignKey: "userId" });
Event.belongsTo(User, { foreignKey: "userId" });

export { User, Event };

import React from "react";
import CreateEventButton from "./CreateEventButton";
import SmallCalendar from "./SmallCalendar";

const Sidebar = () => {
  return (
    <aside className="border border-gray-200 p-5 w-64">
      <CreateEventButton />
      <SmallCalendar />
    </aside>
  );
};

export default Sidebar;

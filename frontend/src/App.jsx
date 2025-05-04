import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./components/Login";
import Register from "./components/Register";
import { getCalendarMonth } from "./util";
import Context from "./context/Context";
import ContextWrapper from "./context/ContextWrapper";
import Sidebar from "./components/Sidebar";
import SidebarWrapper from "./components/SidebarWrapper";
import Month from "./components/Month";
import CalendarHeader from "./components/CalendarHeader";
import CalendarMainHeader from "./components/CalendarMainHeader";
import EventModal from "./components/EventModal";
import Week from "./components/Week";
import DayView from "./components/DayView";
import AIChatBox from "./components/AIChatBox";
import AIChatBoxWrapper from "./components/AIChatBoxWrapper";
import { Toaster } from "react-hot-toast";
import "./App.css";

const CalendarApp = () => {
  const [calendarMonth, setCalendarMonth] = useState(getCalendarMonth());
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initialize state from localStorage or default to true
  const [showAIChatBox, setShowAIChatBox] = useState(
    localStorage.getItem("showAIChatBox") !== "false"
  );
  const [showSidebar, setShowSidebar] = useState(
    localStorage.getItem("showSidebar") !== "false"
  );

  const {
    monthIndex,
    showEventModal,
    isMonthView,
    isWeekView,
    isDayView,
    selectedWeek,
  } = useContext(Context);

  useEffect(() => {
    setCalendarMonth(getCalendarMonth(monthIndex));
  }, [monthIndex]);

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("showAIChatBox", showAIChatBox);
  }, [showAIChatBox]);

  useEffect(() => {
    localStorage.setItem("showSidebar", showSidebar);
  }, [showSidebar]);

  return (
    <>
      <Toaster position="top-right" />
      <div className="p-2 h-screen bg-gray-100 flex flex-col">
        <CalendarMainHeader />
        <div className="h-[calc(100vh-65px)] overflow-clip flex border-1 border-gray-200 bg-white rounded-3xl">
          {/* Show regular sidebar on medium screens and up */}
          {showSidebar && (
            <div className="hidden md:block">
              <Sidebar onClose={() => setShowSidebar(false)} />
            </div>
          )}

          {/* Show overlay sidebar on small screens */}
          <SidebarWrapper
            showSidebar={showSidebar}
            onClose={() => setShowSidebar(false)}
          />

          <div className="flex flex-col flex-1 h-full">
            <CalendarHeader
              showChat={showAIChatBox}
              onOpenAIChat={() => setShowAIChatBox(true)}
              showSidebar={showSidebar}
              onOpenSidebar={() => setShowSidebar(true)}
            />
            <div className="flex flex-1 h-full">
              {isMonthView && <Month month={calendarMonth} />}
              {isWeekView && (
                <Week month={calendarMonth} weekIndex={selectedWeek} />
              )}
              {isDayView && <DayView />}
            </div>
          </div>
          <AIChatBoxWrapper
            showAIChatBox={showAIChatBox}
            onClose={() => setShowAIChatBox(false)}
          />
        </div>
      </div>
      {showEventModal && <EventModal />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} /> */}
          <Route
            path="/"
            element={
              // <PrivateRoute>
              <ContextWrapper>
                <CalendarApp />
              </ContextWrapper>
              // </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

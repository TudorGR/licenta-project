import axios from "axios";

const API_URL = "http://localhost:5000/api";

export const api = {
  getEvents: async () => {
    try {
      const response = await axios.get(`${API_URL}/events`);
      return response.data;
    } catch (error) {
      console.error("Failed to get events:", error);
      throw error;
    }
  },

  createEvent: async (event) => {
    try {
      const response = await axios.post(`${API_URL}/events`, event);
      return response.data;
    } catch (error) {
      console.error("Failed to create event:", error);
      throw error;
    }
  },

  updateEvent: async (id, event) => {
    if (!id) {
      throw new Error("Cannot update event without id");
    }
    try {
      const response = await axios.put(`${API_URL}/events/${id}`, event);
      return response.data;
    } catch (error) {
      console.error("Failed to update event:", error);
      throw error;
    }
  },

  deleteEvent: async (id) => {
    if (!id) {
      throw new Error("Cannot delete event without id");
    }
    try {
      await axios.delete(`${API_URL}/events/${id}`);
    } catch (error) {
      console.error("Failed to delete event:", error);
      throw error;
    }
  },

  toggleEventLock: async (id) => {
    try {
      const response = await axios.patch(`${API_URL}/events/${id}/lock`);
      return response.data;
    } catch (error) {
      console.error("Failed to toggle event lock:", error);
      throw error;
    }
  },

  getLocalEvents: async (city = "New York") => {
    try {
      const response = await axios.get(`${API_URL}/local-events/${city}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get local events:", error);
      throw error;
    }
  },

  getEventSuggestions: async (events) => {
    try {
      const response = await axios.post(
        `${API_URL}/suggestions/event-suggestions`,
        { events }
      );
      return response.data.suggestions;
    } catch (error) {
      console.error("Failed to get event suggestions:", error);
      throw error;
    }
  },
};

import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  //Check if user is logged in on page load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const user = JSON.parse(localStorage.getItem("user"));
      setCurrentUser(user);
      setIsAuthenticated(true);
      axios.defaults.headers.common["x-auth-token"] = token;
    }
    setLoading(false);
  }, []);

  // Register user
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const res = await axios.post(
        "http://localhost:5000/api/auth/register",
        userData
      );
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      axios.defaults.headers.common["x-auth-token"] = res.data.token;
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      setError(null);
      setLoading(true);
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        credentials
      );
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      axios.defaults.headers.common["x-auth-token"] = res.data.token;
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["x-auth-token"];
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        error,
        isAuthenticated,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

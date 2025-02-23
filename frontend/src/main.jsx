import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import React from "react";
import ContextWrapper from "./context/ContextWrapper.jsx";

createRoot(document.getElementById("root")).render(
  <>
    <ContextWrapper>
      <App />
    </ContextWrapper>
  </>
);

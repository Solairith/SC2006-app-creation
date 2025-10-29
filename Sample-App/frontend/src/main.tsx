// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { SavedSchoolsProvider } from "./components/context/SavedSchoolsContext"; // ✅ import provider

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SavedSchoolsProvider>
      <App />
    </SavedSchoolsProvider>
  </React.StrictMode>
);

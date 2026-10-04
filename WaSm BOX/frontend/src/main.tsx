import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./color-explosion.css";
import { ColorExperience } from "./components/ColorExperience";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ColorExperience /><App />
  </React.StrictMode>,
);

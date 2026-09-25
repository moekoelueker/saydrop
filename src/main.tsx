import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { DictationOverlay } from "./components/DictationOverlay";
import "./gladia-tokens.css";
import "./index.css";
import { startThemeSync } from "./lib/theme";

const isOverlayWindow = getCurrentWindow().label === "overlay";
if (isOverlayWindow) {
  document.documentElement.classList.add("overlay-window");
  // The floating pill keeps its dark look in every theme: without a
  // data-theme attribute the default (dark) tokens apply.
  delete document.documentElement.dataset.theme;
} else {
  // index.html already applied the saved theme before first paint; this keeps
  // "System" in sync with live OS appearance changes.
  startThemeSync();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isOverlayWindow ? <DictationOverlay /> : <App />}
  </React.StrictMode>,
);

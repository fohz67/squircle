import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "@fohz67/squircle/styles.css";
import "./styles.css";
import { App } from "./App";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Production HTML is prerendered (scripts/prerender.mjs); dev starts empty.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);

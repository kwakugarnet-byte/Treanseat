import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAuth } from "./lib/api-auth";

initAuth();

createRoot(document.getElementById("root")!).render(<App />);
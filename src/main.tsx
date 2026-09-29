import { createRoot } from "react-dom/client";
import { startAccount } from "./account";
import { App } from "./App";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);
startAccount();

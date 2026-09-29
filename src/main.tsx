import { createRoot } from "react-dom/client";
import { startAccount } from "./account";
import { App } from "./App";
import { reloadOnStaleChunk } from "./utils/stale-chunk";
import "./styles/index.css";

reloadOnStaleChunk();
createRoot(document.getElementById("root")!).render(<App />);
startAccount();

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { StoreProvider } from "./store";
import "./styles/tokens.css";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <div className="app-root">
        <div className="phone">
          <App />
        </div>
      </div>
    </StoreProvider>
  </StrictMode>,
);

import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import RootErrorBoundary from "@/app/boundaries/RootErrorBoundary";
import "./styles/global.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);

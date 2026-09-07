import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

focusManager.setEventListener((handleFocus) => {
  const onVisibilityChange = () => handleFocus(document.visibilityState === "visible");
  document.addEventListener("visibilitychange", onVisibilityChange, false);
  return () => document.removeEventListener("visibilitychange", onVisibilityChange);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

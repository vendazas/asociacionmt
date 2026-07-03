import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthProvider";
import App from "./App";
import "./styles/global.css";

function shouldRetryRequest(failureCount, error) {
  const status = error?.response?.status;

  if (status === 401 || status === 403) {
    return false;
  }

  return failureCount < 1;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryRequest,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

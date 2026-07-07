import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./src/providers/AuthProvider";
import { RealtimeProvider } from "./src/providers/RealtimeProvider";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});

function RootScreen() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <HomeScreen /> : <LoginScreen />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <RootScreen />
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

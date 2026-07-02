import { apiClient } from "../../api/client";

export async function login(credentials) {
  const response = await apiClient.post("/auth/login", credentials);
  return response.data.data;
}

export async function registerPassenger(payload) {
  const response = await apiClient.post("/auth/register", {
    ...payload,
    role: "CUSTOMER"
  });
  return response.data.data;
}

export async function requestPasswordRecovery(payload) {
  const response = await apiClient.post("/auth/forgot-password", payload);
  return response.data.data;
}

export async function getMe() {
  const response = await apiClient.get("/auth/me");
  return response.data.data;
}

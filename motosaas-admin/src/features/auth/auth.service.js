import { apiClient } from "../../api/client";

export async function login(credentials) {
  const response = await apiClient.post("/auth/login", credentials, { skipAuth: true });
  return response.data.data;
}

export async function getMe() {
  const response = await apiClient.get("/auth/me");
  return response.data.data;
}

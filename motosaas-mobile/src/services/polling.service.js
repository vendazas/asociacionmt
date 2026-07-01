import { apiClient } from "../api/client";

export async function getTripStatus(tripId) {
  const response = await apiClient.get(`/trips/${tripId}/status`);
  return response.data.data;
}

export async function updateDriverLocation(payload) {
  const response = await apiClient.patch("/drivers/me/location", payload);
  return response.data.data;
}

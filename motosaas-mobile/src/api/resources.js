import { apiClient } from "./client";

function data(response) {
  return response.data.data;
}

export const driversApi = {
  updateLocation: (payload) => apiClient.patch("/drivers/me/location", payload).then(data),
  available: (params) => apiClient.get("/drivers/available", { params }).then(data),
  list: (params) => apiClient.get("/drivers", { params }).then(data)
};

export const faresApi = {
  estimate: (payload) => apiClient.post("/fares/estimate", payload).then(data)
};

export const tripsApi = {
  estimate: (payload) => apiClient.post("/trips/estimate", payload).then(data),
  request: (payload) => apiClient.post("/trips/request", payload).then(data),
  current: () => apiClient.get("/trips/current").then(data),
  open: () => apiClient.get("/driver/trips/pending").then(data),
  accept: (tripId) => apiClient.post(`/driver/trips/${tripId}/accept`).then(data),
  reject: (tripId) => apiClient.post(`/driver/trips/${tripId}/reject`).then(data),
  arrived: (tripId) => apiClient.post(`/driver/trips/${tripId}/arrived`).then(data),
  start: (tripId) => apiClient.post(`/driver/trips/${tripId}/start`).then(data),
  finish: (tripId, payload) => apiClient.post(`/driver/trips/${tripId}/finish`, payload).then(data),
  cancel: (tripId, payload) => apiClient.post(`/trips/${tripId}/cancel`, payload).then(data),
  status: (tripId) => apiClient.get(`/trips/${tripId}/status`).then(data),
  history: (params) => apiClient.get("/trips/history", { params }).then(data)
};

export const reportsApi = {
  today: () => apiClient.get("/reports/today").then(data),
  driverEarnings: () => apiClient.get("/reports/driver-earnings").then(data)
};

export const ratingsApi = {
  create: (payload) => apiClient.post("/ratings", payload).then(data)
};

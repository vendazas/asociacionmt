import { apiClient } from "./client";

function data(response) {
  return response.data.data;
}

export const authApi = {
  me: () => apiClient.get("/auth/me").then(data)
};

export const associationsApi = {
  list: (params) => apiClient.get("/associations", { params }).then(data),
  create: (payload) => apiClient.post("/associations", payload).then(data),
  updateStatus: (associationId, status) =>
    apiClient.patch(`/associations/${associationId}/status`, { status }).then(data)
};

export const usersApi = {
  me: () => apiClient.get("/users/me").then(data),
  list: (params) => apiClient.get("/users", { params }).then(data),
  create: (payload) => apiClient.post("/users", payload).then(data)
};

export const driversApi = {
  list: (params) => apiClient.get("/drivers", { params }).then(data),
  available: (params) => apiClient.get("/drivers/available", { params }).then(data)
};

export const vehiclesApi = {
  list: (params) => apiClient.get("/vehicles", { params }).then(data),
  create: (payload) => apiClient.post("/vehicles", payload).then(data)
};

export const faresApi = {
  current: () => apiClient.get("/fares/current").then(data),
  updateCurrent: (payload) => apiClient.put("/fares/current", payload).then(data)
};

export const zonesApi = {
  list: () => apiClient.get("/zones").then(data),
  create: (payload) => apiClient.post("/zones", payload).then(data)
};

export const tripsApi = {
  history: (params) => apiClient.get("/trips/history", { params }).then(data),
  open: () => apiClient.get("/trips/open").then(data)
};

export const reportsApi = {
  platformSummary: () => apiClient.get("/reports/platform-summary").then(data),
  associationSummary: () => apiClient.get("/reports/summary").then(data),
  today: () => apiClient.get("/reports/today").then(data)
};

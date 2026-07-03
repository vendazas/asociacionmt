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
  detail: (associationId) => apiClient.get(`/associations/${associationId}`).then(data),
  update: (associationId, payload) => apiClient.put(`/associations/${associationId}`, payload).then(data),
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
  available: (params) => apiClient.get("/drivers/available", { params }).then(data),
  create: (payload) => apiClient.post("/drivers", payload).then(data),
  detail: (driverId) => apiClient.get(`/drivers/${driverId}`).then(data),
  update: (driverId, payload) => apiClient.put(`/drivers/${driverId}`, payload).then(data),
  updateStatus: (driverId, status) => apiClient.patch(`/drivers/${driverId}/status`, { status }).then(data),
  assignVehicle: (driverId, vehicleId) => apiClient.patch(`/drivers/${driverId}/vehicle`, { vehicleId }).then(data)
};

export const vehiclesApi = {
  list: (params) => apiClient.get("/vehicles", { params }).then(data),
  create: (payload) => apiClient.post("/vehicles", payload).then(data),
  detail: (vehicleId) => apiClient.get(`/vehicles/${vehicleId}`).then(data),
  update: (vehicleId, payload) => apiClient.put(`/vehicles/${vehicleId}`, payload).then(data),
  updateStatus: (vehicleId, status) => apiClient.patch(`/vehicles/${vehicleId}/status`, { status }).then(data),
  assign: (vehicleId, driverUserId) => apiClient.patch(`/vehicles/${vehicleId}/assign`, { driverUserId }).then(data)
};

export const faresApi = {
  list: (params) => apiClient.get("/fares", { params }).then(data),
  current: () => apiClient.get("/fares/current").then(data),
  create: (payload) => apiClient.post("/fares", payload).then(data),
  detail: (fareId) => apiClient.get(`/fares/${fareId}`).then(data),
  update: (fareId, payload) => apiClient.put(`/fares/${fareId}`, payload).then(data),
  updateStatus: (fareId, status) => apiClient.patch(`/fares/${fareId}/status`, { status }).then(data),
  remove: (fareId) => apiClient.delete(`/fares/${fareId}`).then(data),
  updateCurrent: (payload) => apiClient.put("/fares/current", payload).then(data)
};

export const zonesApi = {
  list: (params) => apiClient.get("/zones", { params }).then(data),
  create: (payload) => apiClient.post("/zones", payload).then(data),
  detail: (zoneId) => apiClient.get(`/zones/${zoneId}`).then(data),
  update: (zoneId, payload) => apiClient.put(`/zones/${zoneId}`, payload).then(data),
  updateStatus: (zoneId, status) => apiClient.patch(`/zones/${zoneId}/status`, { status }).then(data),
  remove: (zoneId) => apiClient.delete(`/zones/${zoneId}`).then(data)
};

export const tripsApi = {
  adminList: (params) => apiClient.get("/admin/trips", { params }).then(data),
  adminDetail: (tripId) => apiClient.get(`/admin/trips/${tripId}`).then(data),
  history: (params) => apiClient.get("/trips/history", { params }).then(data),
  open: () => apiClient.get("/trips/open").then(data)
};

export const reportsApi = {
  dashboard: (params) => apiClient.get("/reports/dashboard", { params }).then(data),
  platformSummary: () => apiClient.get("/reports/platform-summary").then(data),
  associationSummary: () => apiClient.get("/reports/summary").then(data),
  today: () => apiClient.get("/reports/today").then(data)
};

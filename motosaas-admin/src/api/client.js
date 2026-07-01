import axios from "axios";

const TOKEN_KEY = "motosaas.admin.accessToken";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1",
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAccessToken();
    }

    return Promise.reject(error);
  }
);

export function saveAccessToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getAccessToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

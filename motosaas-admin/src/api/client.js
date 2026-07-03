import axios from "axios";

const TOKEN_KEY = "motosaas.admin.accessToken";
export const AUTH_UNAUTHORIZED_EVENT = "motosaas.admin.unauthorized";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1",
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  if (config.skipAuth) {
    return config;
  }

  const token = getAccessToken();

  if (!token) {
    notifyUnauthorized();
    return Promise.reject(createMissingTokenError(config));
  }

  config.headers = config.headers || {};
  config.headers.Authorization = `Bearer ${token}`;

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuth) {
      clearAccessToken();
      notifyUnauthorized();
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

function notifyUnauthorized() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
}

function createMissingTokenError(config) {
  const error = new Error("Bearer token required.");
  error.config = config;
  error.response = {
    status: 401,
    data: {
      error: {
        message: "Bearer token required."
      }
    }
  };

  return error;
}

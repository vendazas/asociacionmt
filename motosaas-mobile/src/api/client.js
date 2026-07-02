import axios from "axios";
import { env } from "../config/env";
import { getAccessToken } from "../services/storage";

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000
});

let activeBaseUrl = env.apiBaseUrl;
let resolvedBaseUrl = false;
let resolveBaseUrlPromise = null;

function healthUrl(baseUrl) {
  return baseUrl.replace(/\/api\/v1\/?$/, "/health");
}

async function canReach(baseUrl) {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(false), 1500);
  });

  const request = fetch(healthUrl(baseUrl))
    .then((response) => response.ok)
    .catch(() => false);

  return Promise.race([request, timeout]);
}

async function resolveApiBaseUrl() {
  if (resolvedBaseUrl) {
    return activeBaseUrl;
  }

  if (!resolveBaseUrlPromise) {
    resolveBaseUrlPromise = (async () => {
      const candidates = env.apiBaseUrls?.length ? env.apiBaseUrls : [env.apiBaseUrl];

      for (const baseUrl of candidates) {
        if (await canReach(baseUrl)) {
          activeBaseUrl = baseUrl;
          resolvedBaseUrl = true;
          apiClient.defaults.baseURL = activeBaseUrl;
          return activeBaseUrl;
        }
      }

      return activeBaseUrl;
    })().finally(() => {
      resolveBaseUrlPromise = null;
    });
  }

  return resolveBaseUrlPromise;
}

apiClient.interceptors.request.use(async (config) => {
  config.baseURL = await resolveApiBaseUrl();
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

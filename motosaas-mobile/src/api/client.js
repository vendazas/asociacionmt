import axios from "axios";
import { env } from "../config/env";
import { getAccessToken } from "../services/storage";

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

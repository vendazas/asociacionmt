import { Platform } from "react-native";

const apiPort = "4007";
const realtimePort = "4001";

const apiBaseUrlsByPlatform = {
  android: [
    `http://10.0.2.2:${apiPort}/api/v1`,
    `http://10.0.3.2:${apiPort}/api/v1`
  ],
  ios: [
    `http://127.0.0.1:${apiPort}/api/v1`,
    `http://localhost:${apiPort}/api/v1`
  ],
  default: [`http://localhost:${apiPort}/api/v1`]
};

const apiBaseUrls = apiBaseUrlsByPlatform[Platform.OS] || apiBaseUrlsByPlatform.default;

const realtimeBaseUrlsByPlatform = {
  android: [
    `http://10.0.2.2:${realtimePort}`,
    `http://10.0.3.2:${realtimePort}`
  ],
  ios: [
    `http://127.0.0.1:${realtimePort}`,
    `http://localhost:${realtimePort}`
  ],
  default: [`http://localhost:${realtimePort}`]
};

const realtimeBaseUrls = realtimeBaseUrlsByPlatform[Platform.OS] || realtimeBaseUrlsByPlatform.default;

export const env = {
  apiBaseUrl: apiBaseUrls[0],
  apiBaseUrls,
  realtimeBaseUrl: realtimeBaseUrls[0],
  realtimeBaseUrls,
  testLogin: {
    enabled: true,
    credentials: {
      associationSlug: "platform",
      email: "mobile@motosaas.local",
      password: "ChangeMe123!"
    }
  }
};

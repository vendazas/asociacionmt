import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "motosaas.mobile.accessToken";
const MODE_KEY = "motosaas.mobile.activeMode";

export async function saveAccessToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getAccessToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearAccessToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function saveActiveMode(mode) {
  await AsyncStorage.setItem(MODE_KEY, mode);
}

export async function getActiveMode() {
  return AsyncStorage.getItem(MODE_KEY);
}

export async function clearActiveMode() {
  await AsyncStorage.removeItem(MODE_KEY);
}

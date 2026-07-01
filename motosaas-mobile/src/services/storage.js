import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "motosaas.mobile.accessToken";

export async function saveAccessToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getAccessToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearAccessToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { clearAccessToken, getAccessToken, saveAccessToken } from "../../api/client";
import { getMe, login as loginRequest } from "./auth.service";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isBooting, setIsBooting] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    if (!getAccessToken()) {
      setIsBooting(false);
      return;
    }

    getMe()
      .then(setSession)
      .catch(() => {
        clearAccessToken();
        setSession(null);
      })
      .finally(() => setIsBooting(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials);
    saveAccessToken(data.accessToken);
    setSession({
      user: data.user,
      association_id: data.association.association_id,
      association: data.association
    });
    return data;
  }, []);

  const logout = useCallback(() => {
    clearAccessToken();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.user),
      isBooting,
      login,
      logout
    }),
    [isBooting, login, logout, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as loginRequest } from "../features/auth/auth.service";
import { clearAccessToken, getAccessToken, saveAccessToken } from "../services/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    async function boot() {
      try {
        const token = await getAccessToken();
        if (token) {
          const currentSession = await getMe();
          setSession(currentSession);
        }
      } catch (_error) {
        await clearAccessToken();
        setSession(null);
      } finally {
        setIsBooting(false);
      }
    }

    boot();
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials);
    await saveAccessToken(data.accessToken);
    setSession({
      user: data.user,
      association_id: data.association.association_id,
      association: data.association
    });
    return data;
  }, []);

  const logout = useCallback(async () => {
    await clearAccessToken();
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

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

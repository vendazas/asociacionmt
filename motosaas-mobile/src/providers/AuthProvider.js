import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { env } from "../config/env";
import { AppRoles, modesForRole } from "../config/roles";
import {
  getMe,
  login as loginRequest,
  registerPassenger as registerPassengerRequest,
  requestPasswordRecovery as requestPasswordRecoveryRequest
} from "../features/auth/auth.service";
import {
  clearAccessToken,
  clearActiveMode,
  getAccessToken,
  getActiveMode,
  saveAccessToken,
  saveActiveMode
} from "../services/storage";

const AuthContext = createContext(null);
const mobileRoles = new Set(Object.values(AppRoles));

function normalizeSession(data) {
  return {
    user: data.user,
    association_id: data.association?.association_id || data.association_id || data.user?.association_id,
    association: data.association || null
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [activeMode, setActiveModeState] = useState(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    async function boot() {
      try {
        async function applySession(data, { useStoredMode = false } = {}) {
          const nextSession = normalizeSession(data);
          const modes = modesForRole(nextSession.user?.role);
          const storedMode = useStoredMode ? await getActiveMode() : null;
          const nextMode = modes.length === 1 ? modes[0] : modes.includes(storedMode) ? storedMode : null;

          setSession(nextSession);
          setActiveModeState(nextMode);

          if (nextMode) {
            await saveActiveMode(nextMode);
          }

          return nextSession;
        }

        async function loginWithTestUser() {
          if (!env.testLogin.enabled) {
            return false;
          }

          const data = await loginRequest(env.testLogin.credentials);
          await saveAccessToken(data.accessToken);
          await applySession(data, { useStoredMode: true });
          return true;
        }

        const token = await getAccessToken();
        if (token) {
          const currentSession = normalizeSession(await getMe());

          if (mobileRoles.has(currentSession.user?.role)) {
            await applySession(currentSession, { useStoredMode: true });
            return;
          }

          await clearAccessToken();
          await clearActiveMode();
        }

        await loginWithTestUser();
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
    console.log('data: ', data)
    await saveAccessToken(data.accessToken);
    const nextSession = normalizeSession(data);
    const modes = modesForRole(nextSession.user?.role);
    const nextMode = modes.length === 1 ? modes[0] : null;

    setSession(nextSession);
    setActiveModeState(nextMode);

    if (nextMode) {
      await saveActiveMode(nextMode);
    } else {
      await clearActiveMode();
    }

    return data;
  }, []);

  const registerPassenger = useCallback(async (payload) => {
    const data = await registerPassengerRequest(payload);
    await saveAccessToken(data.accessToken);
    const nextSession = normalizeSession(data);
    const [nextMode] = modesForRole(nextSession.user?.role);

    setSession(nextSession);
    setActiveModeState(nextMode);

    if (nextMode) {
      await saveActiveMode(nextMode);
    }

    return data;
  }, []);

  const requestPasswordRecovery = useCallback((payload) => requestPasswordRecoveryRequest(payload), []);

  const setActiveMode = useCallback(async (mode) => {
    const modes = modesForRole(session?.user?.role);

    if (!modes.includes(mode)) {
      return;
    }

    setActiveModeState(mode);
    await saveActiveMode(mode);
  }, [session?.user?.role]);

  const logout = useCallback(async () => {
    await clearAccessToken();
    await clearActiveMode();
    setSession(null);
    setActiveModeState(null);
  }, []);

  const availableModes = useMemo(() => modesForRole(session?.user?.role), [session?.user?.role]);

  const value = useMemo(
    () => ({
      activeMode,
      availableModes,
      session,
      isAuthenticated: Boolean(session?.user),
      isBooting,
      login,
      registerPassenger,
      requestPasswordRecovery,
      setActiveMode,
      logout
    }),
    [
      activeMode,
      availableModes,
      isBooting,
      login,
      logout,
      registerPassenger,
      requestPasswordRecovery,
      session,
      setActiveMode
    ]
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

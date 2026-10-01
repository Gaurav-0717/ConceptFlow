import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "../services/authSessionService";
import {
  getCurrentUser,
  loginAccount,
  registerAccount,
} from "../services/authService";
import { migrateLocalLearningHistory } from "../services/userLearningService";
import {
  clearLearningHistory,
  clearMigrationOwner,
  getLearningHistory,
  getMigrationOwner,
  setMigrationOwner,
} from "../services/learningHistoryService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  const persistToken = (value) => {
    setToken(value);
    if (value) api.defaults.headers.common.Authorization = `Bearer ${value}`;
    else delete api.defaults.headers.common.Authorization;

    if (value) setAuthToken(value);
    else clearAuthToken();
  };

  const migrateLocalHistory = async (authenticatedUser) => {
    const records = getLearningHistory();
    if (!records.length) return;
    const owner = getMigrationOwner();
    if (owner && owner !== authenticatedUser.id) return;

    setMigrationOwner(authenticatedUser.id);
    try {
      const items = records.map((item) => ({
        migrationKey: `${item.id}:${item.lastAccessedAt}`,
        concept: item.concept,
        explanationLevel: item.level,
        source: item.source,
        createdAt: item.lastAccessedAt || item.createdAt,
        lastAccessedAt: item.lastAccessedAt,
        ...(item.latestQuizScore
          ? { latestQuizScore: item.latestQuizScore }
          : {}),
      }));
      const result = await migrateLocalLearningHistory(items);
      if (result.success) {
        clearLearningHistory();
        clearMigrationOwner();
      }
    } catch {
      // Preserve local data for this same account to retry on the next session.
    }
  };

  const establishSession = async (session) => {
    if (!session?.token || !session.user?.id) {
      throw new Error("The server returned an invalid sign-in response.");
    }
    persistToken(session.token);
    setUser(session.user);
    await migrateLocalHistory(session.user);
    return session.user;
  };

  const clearSession = () => {
    persistToken("");
    setUser(null);
  };

  const refreshUser = async () => {
    const savedToken = token || getAuthToken();
    if (!savedToken) {
      clearSession();
      setLoading(false);
      return null;
    }

    persistToken(savedToken);
    try {
      const result = await getCurrentUser();
      setUser(result.user);
      await migrateLocalHistory(result.user);
      return result.user;
    } catch {
      clearSession();
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const url = error.config?.url || "";
        if (
          error.response?.status === 401 &&
          api.defaults.headers.common.Authorization &&
          !url.endsWith("/auth/login") &&
          !url.endsWith("/auth/register")
        ) {
          window.dispatchEvent(new Event("conceptflow:auth-expired"));
        }
        return Promise.reject(error);
      },
    );
    const handleExpiredSession = () => clearSession();
    window.addEventListener("conceptflow:auth-expired", handleExpiredSession);
    refreshUser();
    return () => {
      api.interceptors.response.eject(interceptorId);
      window.removeEventListener(
        "conceptflow:auth-expired",
        handleExpiredSession,
      );
    };
  }, []);

  const login = async (email, password) =>
    establishSession(await loginAccount({ email, password }));

  const register = async ({ name, email, password }) =>
    establishSession(await registerAccount({ name, email, password }));

  const logout = () => clearSession();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
};

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { getUserProgress } from "../services/progressService";
import { useAuth } from "./AuthContext";

const ProgressContext = createContext(null);

export const ProgressProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const isFetchingRef = useRef(false);

  const fetchProgress = useCallback(async () => {
    if (!isAuthenticated) {
      setProgress(null);
      setLoading(false);
      setError("");
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const result = await getUserProgress();
      if (!result || result.success === false) {
        throw new Error(result?.message || "Failed to load student progress.");
      }
      setProgress(result);
    } catch (err) {
      const isRateLimited =
        err?.response?.status === 429 ||
        err?.status === 429 ||
        /too many requests/i.test(err?.message);
      setError(
        isRateLimited
          ? "Too many progress requests. Please wait a moment before trying again."
          : typeof err?.message === "string"
            ? err.message
            : "Student progress is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress, reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return (
    <ProgressContext.Provider value={{ progress, loading, error, refresh }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useUserProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    return {
      progress: null,
      loading: false,
      error: "",
      refresh: () => {},
    };
  }
  return context;
};

export default ProgressContext;

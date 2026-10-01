import { useEffect, useState, useCallback } from "react";
import { getUserProgress } from "../services/progressService";

const useUserProgress = () => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getUserProgress()
      .then((result) => {
        if (!active) return;
        if (!result || result.success === false) {
          throw new Error(result?.message || "Failed to load student progress.");
        }
        setProgress(result);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          typeof err?.message === "string"
            ? err.message
            : "Student progress is temporarily unavailable.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return { progress, loading, error, refresh };
};

export default useUserProgress;

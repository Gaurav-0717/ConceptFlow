import { useEffect, useState, useCallback } from "react";
import { getLeaderboard } from "../services/leaderboardService";

const useLeaderboard = (period = "weekly") => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getLeaderboard(period)
      .then((result) => {
        if (!active) return;
        if (!result || result.success === false) {
          throw new Error(result?.message || "Failed to load the leaderboard.");
        }
        setLeaderboard(Array.isArray(result.leaderboard) ? result.leaderboard : []);
        setCurrentUser(result.currentUser ?? null);
      })
      .catch((err) => {
        if (!active) return;
        setLeaderboard([]);
        setCurrentUser(null);
        setError(
          typeof err?.message === "string"
            ? err.message
            : "Leaderboard is temporarily unavailable.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period, reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return { leaderboard, currentUser, loading, error, refresh };
};

export default useLeaderboard;

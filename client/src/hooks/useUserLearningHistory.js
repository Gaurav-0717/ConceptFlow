import { useEffect, useState } from "react";
import { getUserLearningHistory } from "../services/userLearningService";

const useUserLearningHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getUserLearningHistory()
      .then((result) => {
        if (!result.success || !Array.isArray(result.history))
          throw new Error("invalid response");
        if (active) setHistory(result.history);
      })
      .catch(() => {
        if (active)
          setError("Learning history could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);
  return { history, setHistory, loading, error, refresh };
};

export default useUserLearningHistory;

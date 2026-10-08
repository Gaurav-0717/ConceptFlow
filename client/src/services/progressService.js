import api from "./api.js";

const request = async (
  promise,
  fallback = "Student progress is temporarily unavailable.",
) => {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message;
    throw new Error(typeof message === "string" ? message : fallback);
  }
};

let inFlightProgress = null;

/**
 * Fetches student progress summary from GET /api/progress.
 * Deduplicates in-flight requests to prevent concurrent network stampedes.
 */
export const getUserProgress = () => {
  if (inFlightProgress) return inFlightProgress;
  inFlightProgress = request(api.get("/progress")).finally(() => {
    inFlightProgress = null;
  });
  return inFlightProgress;
};

export default {
  getUserProgress,
};

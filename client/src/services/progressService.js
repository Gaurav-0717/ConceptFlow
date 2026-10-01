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

/**
 * Fetches student progress summary from GET /api/progress.
 * Requires active authentication (bearer token attached by api client).
 */
export const getUserProgress = () =>
  request(api.get("/progress"));

export default {
  getUserProgress,
};

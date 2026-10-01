import api from "./api.js";

const request = async (
  promise,
  fallback = "Leaderboard is temporarily unavailable.",
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
 * Fetches the public XP leaderboard from GET /api/leaderboard.
 * Rank for the signed-in student is determined by the auth token, not a userId query.
 */
export const getLeaderboard = (period = "weekly") =>
  request(api.get("/leaderboard", { params: { period } }));

export default {
  getLeaderboard,
};

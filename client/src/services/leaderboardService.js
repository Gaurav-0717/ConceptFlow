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
    const isRateLimited = error.response?.status === 429;
    if (isRateLimited) {
      throw new Error(
        typeof message === "string" && message
          ? message
          : "Too many leaderboard requests. Please wait a few moments and try again.",
      );
    }
    throw new Error(typeof message === "string" ? message : fallback);
  }
};

const inFlightLeaderboard = new Map();

/**
 * Fetches the public XP leaderboard from GET /api/leaderboard.
 * Rank for the signed-in student is determined by the auth token, not a userId query.
 * Deduplicates concurrent in-flight requests by period to prevent network stampedes.
 */
export const getLeaderboard = (period = "weekly") => {
  const normalizedPeriod = String(period || "weekly");
  if (inFlightLeaderboard.has(normalizedPeriod)) {
    return inFlightLeaderboard.get(normalizedPeriod);
  }

  const promise = request(
    api.get("/leaderboard", { params: { period: normalizedPeriod } }),
  ).finally(() => {
    inFlightLeaderboard.delete(normalizedPeriod);
  });

  inFlightLeaderboard.set(normalizedPeriod, promise);
  return promise;
};

export default {
  getLeaderboard,
};

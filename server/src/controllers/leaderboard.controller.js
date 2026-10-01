import {
  leaderboardService,
  LeaderboardServiceError,
  VALID_PERIODS,
} from "../services/leaderboardService.js";

export const createLeaderboardControllers = ({
  service = leaderboardService,
} = {}) => ({
  getLeaderboard: async (req, res) => {
    const period = req.query.period || "all-time";
    if (!VALID_PERIODS.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}.`,
      });
    }

    // Rank is always for the authenticated session user — never a client-supplied userId.
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication is required." });
    }

    try {
      const result = await service.getLeaderboard(userId, period, 10);
      return res.status(200).json({
        success: true,
        period,
        leaderboard: result.leaderboard,
        currentUser: result.currentUser,
      });
    } catch (err) {
      const status =
        err instanceof LeaderboardServiceError ? err.statusCode : 503;
      const message =
        err instanceof LeaderboardServiceError
          ? err.message
          : "Leaderboard is temporarily unavailable.";
      return res.status(status).json({ success: false, message });
    }
  },
});

const defaultControllers = createLeaderboardControllers();
export const getLeaderboard = defaultControllers.getLeaderboard;
export default defaultControllers;

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { progressRateLimit } from "../middleware/progressRateLimit.js";
import { createLeaderboardControllers } from "../controllers/leaderboard.controller.js";

export const createLeaderboardRouter = ({
  authMiddleware = requireAuth,
  rateLimitMiddleware = progressRateLimit,
  leaderboardServiceOverride,
} = {}) => {
  const router = Router();
  const controllers = createLeaderboardControllers({
    service: leaderboardServiceOverride,
  });

  // GET /api/leaderboard?period=weekly|monthly|all-time
  router.get("/", authMiddleware, rateLimitMiddleware, controllers.getLeaderboard);

  return router;
};

export default createLeaderboardRouter();

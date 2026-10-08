import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { progressRateLimit } from "../middleware/progressRateLimit.js";
import { createProgressControllers } from "../controllers/progress.controller.js";

export const createProgressRouter = ({
  authMiddleware = requireAuth,
  rateLimitMiddleware = progressRateLimit,
  progressService,
  achievementsService,
} = {}) => {
  const router = Router();
  const controllers = createProgressControllers({
    service: progressService,
    achievements: achievementsService,
  });

  router.get("/", authMiddleware, rateLimitMiddleware, controllers.getProgress);
  router.get(
    "/progress",
    authMiddleware,
    rateLimitMiddleware,
    controllers.getProgress,
  );

  return router;
};

export default createProgressRouter();

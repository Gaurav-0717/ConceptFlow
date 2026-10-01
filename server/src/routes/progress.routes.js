import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createProgressControllers } from "../controllers/progress.controller.js";

export const createProgressRouter = ({
  authMiddleware = requireAuth,
  progressService,
  achievementsService,
} = {}) => {
  const router = Router();
  const controllers = createProgressControllers({
    service: progressService,
    achievements: achievementsService,
  });

  router.get("/", authMiddleware, controllers.getProgress);
  router.get("/progress", authMiddleware, controllers.getProgress);

  return router;
};

export default createProgressRouter();

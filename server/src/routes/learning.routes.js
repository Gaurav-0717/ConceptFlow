import { Router } from "express";
import { aiRateLimit } from "../middleware/aiRateLimit.js";
import { createLearningControllers } from "../controllers/learning.controller.js";
import { optionalAuth } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { createUserLearningHistoryControllers } from "../controllers/userLearningHistory.controller.js";

export const createLearningRouter = (dependencies = {}) => {
  const router = Router();
  const {
    historyService,
    authMiddleware = requireAuth,
    optionalAuthMiddleware = optionalAuth,
    ...learningDependencies
  } = dependencies;
  const controllers = createLearningControllers(learningDependencies);
  const history = createUserLearningHistoryControllers({
    service: historyService,
  });

  router.post(
    "/explanations",
    aiRateLimit,
    optionalAuthMiddleware,
    controllers.generateExplanation,
  );
  router.post(
    "/quiz",
    aiRateLimit,
    optionalAuthMiddleware,
    controllers.createQuiz,
  );
  router.post(
    "/quiz/:quizId/submit",
    aiRateLimit,
    optionalAuthMiddleware,
    controllers.submitQuiz,
  );
  router.post("/history/migrate", authMiddleware, history.migrate);
  router.post("/history", authMiddleware, history.create);
  router.get("/history", authMiddleware, history.list);
  router.get("/history/:id", authMiddleware, history.get);
  router.delete("/history/:id", authMiddleware, history.remove);
  return router;
};

export default createLearningRouter();

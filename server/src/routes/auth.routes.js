import { Router } from "express";
import { createAuthControllers } from "../controllers/auth.controller.js";
import { authRateLimit } from "../middleware/authRateLimit.js";
import { createAuthMiddleware } from "../middleware/auth.js";

export const createAuthRouter = ({ service, authMiddleware } = {}) => {
  const router = Router();
  const controllers = createAuthControllers({ service });
  const requireAuth = authMiddleware || createAuthMiddleware({ service });

  router.post("/register", authRateLimit, controllers.register);
  router.post("/login", authRateLimit, controllers.login);
  router.get("/me", requireAuth, controllers.me);
  return router;
};

export default createAuthRouter();

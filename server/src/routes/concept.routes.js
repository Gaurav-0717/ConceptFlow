import { Router } from "express";
import {
  createGenerateConceptController,
  validateConceptController,
  previewConceptController,
} from "../controllers/concept.controller.js";
import { aiRateLimit } from "../middleware/aiRateLimit.js";

export const createConceptRouter = ({ generateConceptFn } = {}) => {
  const router = Router();
  router.post("/validate", validateConceptController);
  router.post("/preview", previewConceptController);
  router.post(
    "/generate",
    aiRateLimit,
    createGenerateConceptController(generateConceptFn),
  );
  return router;
};

const router = createConceptRouter();

export default router;

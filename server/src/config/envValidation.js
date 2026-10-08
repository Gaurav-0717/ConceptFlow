/**
 * Production Environment Configuration Hardening & Verification
 *
 * Verifies that all required environment variables are set and meet
 * production security standards without leaking secrets or passwords.
 */

import { validateJwtSecret } from "./jwtValidation.js";

/**
 * Validates environment configuration for production deployment.
 *
 * @param {object} [env=process.env]
 * @returns {{ isProduction: boolean, valid: boolean, errors: string[], warnings: string[] }}
 */
export const validateProductionConfig = (env = process.env) => {
  const isProduction = env.NODE_ENV === "production";
  const errors = [];
  const warnings = [];

  if (!isProduction) {
    return {
      isProduction: false,
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  // 1. MONGODB_URI check
  if (!env.MONGODB_URI || typeof env.MONGODB_URI !== "string" || !env.MONGODB_URI.trim()) {
    errors.push("MONGODB_URI is required in production.");
  } else if (!/^mongodb(\+srv)?:\/\//i.test(env.MONGODB_URI.trim())) {
    errors.push("MONGODB_URI must be a valid MongoDB connection URI.");
  }

  // 2. JWT_SECRET check
  const jwtResult = validateJwtSecret(env.JWT_SECRET, { isProduction: true });
  if (!jwtResult.valid) {
    errors.push(jwtResult.reason || "A strong JWT_SECRET is required in production.");
  }

  // 3. CLIENT_URL check
  if (!env.CLIENT_URL || typeof env.CLIENT_URL !== "string" || !env.CLIENT_URL.trim()) {
    errors.push("CLIENT_URL is required in production to configure allowed CORS origins.");
  }

  // 4. GEMINI_API_KEY check (when AI generation is enabled)
  const isAiExplicitlyDisabled =
    env.ENABLE_AI_GENERATION === "false" || env.DISABLE_AI === "true";
  const isAiExplicitlyEnabled = env.ENABLE_AI_GENERATION === "true";

  if (!isAiExplicitlyDisabled) {
    if (!env.GEMINI_API_KEY || typeof env.GEMINI_API_KEY !== "string" || !env.GEMINI_API_KEY.trim()) {
      if (isAiExplicitlyEnabled) {
        errors.push("GEMINI_API_KEY is required in production when AI generation is enabled.");
      } else {
        warnings.push(
          "GEMINI_API_KEY is not configured in production. Dynamic AI concept generation will fall back to samples or return 503.",
        );
      }
    }
  }

  return {
    isProduction: true,
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

export default {
  validateProductionConfig,
};

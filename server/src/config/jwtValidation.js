/**
 * Production JWT Secret Validation & Entropy Verification
 *
 * Ensures cryptographic suitability of JWT secrets in production while
 * maintaining backward compatibility with development and test environments.
 *
 * Security rules:
 * - Production secrets must be >= 32 characters (256 bits for HMAC-SHA256).
 * - Must exhibit sufficient Shannon entropy (>= 3.0 bits/char) and diversity (>= 10 unique characters).
 * - Reject obvious repeating patterns and common placeholder strings.
 * - Never leak or log the secret value in error messages or return payloads.
 */

export class JwtConfigError extends Error {
  constructor(message = "A strong JWT secret is required for production.") {
    super(message);
    this.name = "JwtConfigError";
  }
}

/**
 * Calculates Shannon entropy in bits per character.
 * H = -sum(p_i * log2(p_i))
 */
export const calculateShannonEntropy = (str) => {
  if (!str || typeof str !== "string") return 0;
  const len = str.length;
  if (len === 0) return 0;

  const frequencies = new Map();
  for (let i = 0; i < len; i++) {
    const ch = str[i];
    frequencies.set(ch, (frequencies.get(ch) || 0) + 1);
  }

  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
};

/**
 * Detects whether a string is composed of repeated sub-patterns (1 to 16 chars).
 * Examples: "aaaa...", "abababab...", "123412341234..."
 */
export const hasRepetitivePattern = (str) => {
  if (!str || typeof str !== "string") return false;
  const maxChunk = Math.min(16, Math.floor(str.length / 2));
  for (let len = 1; len <= maxChunk; len++) {
    const chunk = str.slice(0, len);
    const repeated = chunk.repeat(Math.ceil(str.length / len)).slice(0, str.length);
    if (repeated === str) {
      return true;
    }
  }
  return false;
};

const INSECURE_PLACEHOLDER_REGEX =
  /(?:^test|test[-_]?only|test[-_]?secret|changeme|placeholder|default[-_]?secret|your[-_]?secret|replace[-_]?this|admin123|password|insecure)/i;

/**
 * Validates a JWT secret.
 *
 * @param {string} secret
 * @param {object} [options]
 * @param {boolean} [options.isProduction]
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validateJwtSecret = (
  secret,
  { isProduction = process.env.NODE_ENV === "production" } = {},
) => {
  if (!secret || typeof secret !== "string" || !secret.trim()) {
    return {
      valid: false,
      reason: isProduction
        ? "JWT_SECRET is required in production."
        : "Authentication is not configured on the server.",
    };
  }

  const trimmed = secret.trim();

  // In non-production, allow standard development/test secrets.
  if (!isProduction) {
    if (trimmed.length < 16) {
      return {
        valid: false,
        reason: "Authentication secret is too short for development.",
      };
    }
    return { valid: true };
  }

  // --- Production Rules ---
  if (trimmed.length < 32) {
    return {
      valid: false,
      reason: "JWT secret in production must be at least 32 characters long.",
    };
  }

  const uniqueChars = new Set(trimmed).size;
  if (uniqueChars < 10) {
    return {
      valid: false,
      reason: "JWT secret in production lacks character diversity (at least 10 unique characters required).",
    };
  }

  if (hasRepetitivePattern(trimmed)) {
    return {
      valid: false,
      reason: "JWT secret in production contains repetitive patterns.",
    };
  }

  const entropy = calculateShannonEntropy(trimmed);
  if (entropy < 3.0) {
    return {
      valid: false,
      reason: "JWT secret in production has insufficient entropy.",
    };
  }

  if (INSECURE_PLACEHOLDER_REGEX.test(trimmed)) {
    return {
      valid: false,
      reason: "JWT secret in production contains known weak placeholder keywords.",
    };
  }

  return { valid: true };
};

/**
 * Assert that the JWT secret is valid; throws safe JwtConfigError if invalid.
 */
export const assertValidJwtSecret = (
  secret,
  { isProduction = process.env.NODE_ENV === "production" } = {},
) => {
  const result = validateJwtSecret(secret, { isProduction });
  if (!result.valid) {
    throw new JwtConfigError(
      result.reason || "A strong JWT secret is required for production.",
    );
  }
};

export default {
  calculateShannonEntropy,
  hasRepetitivePattern,
  validateJwtSecret,
  assertValidJwtSecret,
  JwtConfigError,
};

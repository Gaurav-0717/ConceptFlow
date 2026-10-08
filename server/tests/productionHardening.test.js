import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  calculateShannonEntropy,
  hasRepetitivePattern,
  validateJwtSecret,
  assertValidJwtSecret,
  JwtConfigError,
} from "../src/config/jwtValidation.js";
import { validateProductionConfig } from "../src/config/envValidation.js";
import {
  CRITICAL_INDEX_SPECS,
  keysMatch,
  matchesIndex,
  verifyDatabaseIndexes,
  verifySchemaIndexes,
  ensureModelIndexes,
} from "../src/config/indexVerification.js";
import { User } from "../src/models/User.js";
import { LearningHistory } from "../src/models/LearningHistory.js";
import { XPActivity } from "../src/models/XPActivity.js";
import { UserAchievement } from "../src/models/UserAchievement.js";
import { QuizSession } from "../src/models/QuizSession.js";
import { ConceptCache } from "../src/models/ConceptCache.js";
import { createAuthService, AuthServiceError } from "../src/services/authService.js";

// ─── 1. JWT SECRET PRODUCTION VALIDATION & ENTROPY ────────────────────────────

test("calculateShannonEntropy returns 0 for empty or single-character strings", () => {
  assert.equal(calculateShannonEntropy(""), 0);
  assert.equal(calculateShannonEntropy(null), 0);
  assert.equal(calculateShannonEntropy("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), 0);
});

test("calculateShannonEntropy returns realistic entropy for diverse strings", () => {
  const hex32 = crypto.randomBytes(32).toString("hex"); // 64 chars
  const hexEntropy = calculateShannonEntropy(hex32);
  assert.ok(hexEntropy >= 3.3, `Expected hex entropy >= 3.3, got ${hexEntropy}`);

  const base64 = crypto.randomBytes(32).toString("base64"); // 44 chars
  const b64Entropy = calculateShannonEntropy(base64);
  assert.ok(b64Entropy >= 4.5, `Expected base64 entropy >= 4.5, got ${b64Entropy}`);
});

test("hasRepetitivePattern identifies repeated sequences correctly", () => {
  assert.equal(hasRepetitivePattern("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), true);
  assert.equal(hasRepetitivePattern("abababababababababababababababab"), true);
  assert.equal(hasRepetitivePattern("12341234123412341234123412341234"), true);
  assert.equal(
    hasRepetitivePattern("jwt-secret-jwt-secret-jwt-secret-jwt-secret-"),
    true,
  );
  assert.equal(
    hasRepetitivePattern(crypto.randomBytes(32).toString("hex")),
    false,
  );
});

test("production JWT validation rejects missing, empty, or whitespace secrets", () => {
  for (const empty of [null, undefined, "", "   ", 12345]) {
    const res = validateJwtSecret(empty, { isProduction: true });
    assert.equal(res.valid, false);
    if (empty && typeof empty === "string" && empty.trim()) {
      assert.ok(!res.reason.includes(String(empty)));
    }
  }
});

test("production JWT validation rejects short secrets (< 32 chars)", () => {
  const shortSecret = "short-key-only-24-chars!";
  const res = validateJwtSecret(shortSecret, { isProduction: true });
  assert.equal(res.valid, false);
  assert.match(res.reason, /at least 32 characters/i);
  assert.ok(!res.reason.includes(shortSecret));
});

test("production JWT validation rejects low unique character count", () => {
  const lowUnique = "11223344112233441122334411223344"; // 32 chars, only 4 unique
  const res = validateJwtSecret(lowUnique, { isProduction: true });
  assert.equal(res.valid, false);
  assert.match(res.reason, /unique characters/i);
  assert.ok(!res.reason.includes(lowUnique));
});

test("production JWT validation rejects repeating sub-patterns", () => {
  const repeating = "abcdef1234abcdef1234abcdef1234abcdef1234";
  const res = validateJwtSecret(repeating, { isProduction: true });
  assert.equal(res.valid, false);
  assert.match(res.reason, /repetitive/i);
});

test("production JWT validation rejects known insecure placeholder keywords", () => {
  const placeholders = [
    "changeme-production-jwt-secret-key-32chars!",
    "test-only-jwt-secret-with-more-than-thirty-two-characters",
    "placeholder-key-for-conceptflow-app-32chars!",
    "your-secret-key-goes-here-replace-this-now",
  ];
  for (const ph of placeholders) {
    const res = validateJwtSecret(ph, { isProduction: true });
    assert.equal(res.valid, false, `Expected placeholder ${ph} to be rejected in production`);
    assert.match(res.reason, /placeholder|weak/i);
    assert.ok(!res.reason.includes(ph));
  }
});

test("production JWT validation accepts cryptographically strong secrets", () => {
  const validHex = crypto.randomBytes(32).toString("hex");
  const resHex = validateJwtSecret(validHex, { isProduction: true });
  assert.equal(resHex.valid, true);

  const validB64 = crypto.randomBytes(32).toString("base64");
  const resB64 = validateJwtSecret(validB64, { isProduction: true });
  assert.equal(resB64.valid, true);

  const complexPassphrase = "Xk9#mQ2$vL8*pY5!wN7&zR4^yT1@cB6+dE~gH3=";
  const resPassphrase = validateJwtSecret(complexPassphrase, { isProduction: true });
  assert.equal(resPassphrase.valid, true);
});

test("non-production allows standard test and development secrets", () => {
  const testSecret = "test-only-jwt-secret-with-more-than-thirty-two-characters";
  const devRes = validateJwtSecret(testSecret, { isProduction: false });
  assert.equal(devRes.valid, true);

  const shorterDevSecret = "dev-secret-key-12345"; // 20 chars
  const devRes2 = validateJwtSecret(shorterDevSecret, { isProduction: false });
  assert.equal(devRes2.valid, true);
});

test("non-production rejects missing secret safely without exposing secret details", () => {
  const res = validateJwtSecret("", { isProduction: false });
  assert.equal(res.valid, false);
  assert.equal(res.reason, "Authentication is not configured on the server.");
});

test("assertValidJwtSecret throws JwtConfigError in production on weak secret", () => {
  assert.throws(
    () => assertValidJwtSecret("weak-secret", { isProduction: true }),
    (err) => err instanceof JwtConfigError && !err.message.includes("weak-secret"),
  );
});

test("authService integration rejects weak secret in production with 503 and safe error", async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const service = createAuthService({
      jwtSecret: "weak-secret",
    });
    await assert.rejects(
      service.register({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      }),
      (err) =>
        err instanceof AuthServiceError &&
        err.statusCode === 503 &&
        err.message === "Authentication is not configured securely on the server." &&
        !err.message.includes("weak-secret"),
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

// ─── 2. PRODUCTION ENVIRONMENT CONFIGURATION VERIFICATION ─────────────────────

test("validateProductionConfig passes in non-production environments", () => {
  const res = validateProductionConfig({ NODE_ENV: "development" });
  assert.equal(res.isProduction, false);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
});

test("validateProductionConfig requires MONGODB_URI in production", () => {
  const res = validateProductionConfig({
    NODE_ENV: "production",
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
    CLIENT_URL: "https://conceptflow.example.com",
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => /MONGODB_URI is required/i.test(e)));
});

test("validateProductionConfig requires valid MONGODB_URI scheme in production", () => {
  const res = validateProductionConfig({
    NODE_ENV: "production",
    MONGODB_URI: "http://invalid-mongo-url",
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
    CLIENT_URL: "https://conceptflow.example.com",
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => /valid MongoDB connection URI/i.test(e)));
});

test("validateProductionConfig requires strong JWT_SECRET in production", () => {
  const res = validateProductionConfig({
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://localhost:27017/conceptflow",
    JWT_SECRET: "weak",
    CLIENT_URL: "https://conceptflow.example.com",
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => /JWT secret/i.test(e)));
});

test("validateProductionConfig requires CLIENT_URL in production", () => {
  const res = validateProductionConfig({
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://localhost:27017/conceptflow",
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => /CLIENT_URL is required/i.test(e)));
});

test("validateProductionConfig enforces GEMINI_API_KEY when AI generation is enabled in production", () => {
  const res = validateProductionConfig({
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://localhost:27017/conceptflow",
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
    CLIENT_URL: "https://conceptflow.example.com",
    ENABLE_AI_GENERATION: "true",
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => /GEMINI_API_KEY is required/i.test(e)));
});

test("validateProductionConfig succeeds when all production requirements are satisfied", () => {
  const res = validateProductionConfig({
    NODE_ENV: "production",
    MONGODB_URI: "mongodb+srv://cluster.example.com/conceptflow",
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
    CLIENT_URL: "https://conceptflow.example.com",
    GEMINI_API_KEY: "valid-production-gemini-key",
    ENABLE_AI_GENERATION: "true",
  });
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
});

// ─── 3. SCHEMA INDEX DEFINITION & DEDUPLICATION HARDENING ─────────────────────

const modelsMap = {
  User,
  LearningHistory,
  XPActivity,
  UserAchievement,
  QuizSession,
  ConceptCache,
};

test("verifySchemaIndexes confirms all critical indexes are defined across models", () => {
  const result = verifySchemaIndexes(modelsMap);
  assert.equal(result.healthy, true, `Missing schema indexes: ${JSON.stringify(result.missing)}`);
  assert.equal(result.verified.length, CRITICAL_INDEX_SPECS.length);
});

test("User model schema defines exactly one clean unique index on email without duplicates", () => {
  const userIndexes = User.schema.indexes();
  const emailIndexes = userIndexes.filter(([keys]) => keys.email === 1);
  assert.equal(
    emailIndexes.length,
    1,
    `Expected exactly 1 email index on User schema, found ${emailIndexes.length}`,
  );
  assert.equal(emailIndexes[0][1]?.unique, true);
  assert.equal(emailIndexes[0][1]?.name, "user_email_unique");
});

test("ConceptCache model schema defines exactly one clean unique index on cacheKey without duplicates", () => {
  const cacheIndexes = ConceptCache.schema.indexes();
  const cacheKeyIndexes = cacheIndexes.filter(([keys]) => keys.cacheKey === 1);
  assert.equal(
    cacheKeyIndexes.length,
    1,
    `Expected exactly 1 cacheKey index on ConceptCache schema, found ${cacheKeyIndexes.length}`,
  );
  assert.equal(cacheKeyIndexes[0][1]?.unique, true);
  assert.equal(cacheKeyIndexes[0][1]?.name, "cache_key_unique");
});

test("QuizSession schema defines unique quizId index and expiresAt TTL index", () => {
  const quizIndexes = QuizSession.schema.indexes();

  const uniqueQuizId = quizIndexes.find(
    ([keys, opts]) =>
      keys.quizId === 1 && opts?.unique === true && opts?.name === "quiz_session_id_unique",
  );
  assert.ok(uniqueQuizId, "QuizSession must define unique quiz_session_id_unique index");

  const ttlExpiresAt = quizIndexes.find(
    ([keys, opts]) =>
      keys.expiresAt === 1 &&
      opts?.expireAfterSeconds === 0 &&
      opts?.name === "quiz_session_expires_at_ttl",
  );
  assert.ok(ttlExpiresAt, "QuizSession must define quiz_session_expires_at_ttl TTL index");
});

test("LearningHistory schema preserves migration uniqueness and recent indexes", () => {
  const historyIndexes = LearningHistory.schema.indexes();

  const migrationUnique = historyIndexes.find(
    ([keys, opts]) =>
      keys.userId === 1 &&
      keys.migrationKey === 1 &&
      opts?.unique === true &&
      opts?.name === "user_history_migration_unique",
  );
  assert.ok(
    migrationUnique,
    "LearningHistory must define user_history_migration_unique compound unique index",
  );

  const recentIndex = historyIndexes.find(
    ([keys, opts]) =>
      keys.userId === 1 && keys.createdAt === -1 && opts?.name === "user_history_recent",
  );
  assert.ok(recentIndex, "LearningHistory must define user_history_recent compound index");
});

test("XPActivity schema preserves actionKey idempotency index and recent index", () => {
  const xpIndexes = XPActivity.schema.indexes();

  const actionKeyUnique = xpIndexes.find(
    ([keys, opts]) =>
      keys.userId === 1 &&
      keys.actionKey === 1 &&
      opts?.unique === true &&
      opts?.name === "user_action_key_unique",
  );
  assert.ok(
    actionKeyUnique,
    "XPActivity must define user_action_key_unique compound unique index",
  );

  const recentIndex = xpIndexes.find(
    ([keys, opts]) =>
      keys.userId === 1 && keys.createdAt === -1 && opts?.name === "user_xp_recent",
  );
  assert.ok(recentIndex, "XPActivity must define user_xp_recent index");
});

test("UserAchievement schema preserves user-achievement uniqueness index", () => {
  const achIndexes = UserAchievement.schema.indexes();

  const achUnique = achIndexes.find(
    ([keys, opts]) =>
      keys.userId === 1 &&
      keys.achievementId === 1 &&
      opts?.unique === true &&
      opts?.name === "user_achievement_unique",
  );
  assert.ok(achUnique, "UserAchievement must define user_achievement_unique compound index");
});

// ─── 4. DATABASE RUNTIME INDEX VERIFICATION HELPER ────────────────────────────

test("keysMatch helper compares MongoDB key pattern specifications accurately", () => {
  assert.equal(keysMatch({ email: 1 }, { email: 1 }), true);
  assert.equal(keysMatch({ userId: 1, createdAt: -1 }, { userId: 1, createdAt: -1 }), true);
  assert.equal(keysMatch({ userId: 1, createdAt: -1 }, { userId: 1, createdAt: 1 }), false);
  assert.equal(keysMatch({ userId: 1 }, { userId: 1, createdAt: -1 }), false);
});

test("matchesIndex matches actual MongoDB index specifications", () => {
  const spec = {
    name: "quiz_session_expires_at_ttl",
    key: { expiresAt: 1 },
    ttl: true,
  };
  assert.equal(
    matchesIndex(
      { name: "quiz_session_expires_at_ttl", key: { expiresAt: 1 }, expireAfterSeconds: 0 },
      spec,
    ),
    true,
  );
  assert.equal(
    matchesIndex(
      { name: "different_name", key: { expiresAt: 1 }, expireAfterSeconds: 0 },
      spec,
    ),
    true,
  );
  assert.equal(
    matchesIndex(
      { name: "quiz_session_expires_at_ttl", key: { expiresAt: 1 } }, // missing expireAfterSeconds
      spec,
    ),
    false,
  );
});

test("verifyDatabaseIndexes returns healthy:true when all critical indexes exist in database", async () => {
  const mockDb = {
    collection: (colName) => ({
      listIndexes: () => ({
        toArray: async () => {
          switch (colName) {
            case "users":
              return [{ name: "user_email_unique", key: { email: 1 }, unique: true }];
            case "user_learning_history":
              return [
                {
                  name: "user_history_migration_unique",
                  key: { userId: 1, migrationKey: 1 },
                  unique: true,
                },
              ];
            case "xp_activities":
              return [
                {
                  name: "user_action_key_unique",
                  key: { userId: 1, actionKey: 1 },
                  unique: true,
                },
              ];
            case "user_achievements":
              return [
                {
                  name: "user_achievement_unique",
                  key: { userId: 1, achievementId: 1 },
                  unique: true,
                },
              ];
            case "quiz_sessions":
              return [
                { name: "quiz_session_id_unique", key: { quizId: 1 }, unique: true },
                {
                  name: "quiz_session_expires_at_ttl",
                  key: { expiresAt: 1 },
                  expireAfterSeconds: 0,
                },
              ];
            case "concept_cache":
              return [
                { name: "cache_key_unique", key: { cacheKey: 1 }, unique: true },
                { name: "expires_at_ttl", key: { expiresAt: 1 }, expireAfterSeconds: 0 },
              ];
            default:
              return [];
          }
        },
      }),
    }),
  };

  const result = await verifyDatabaseIndexes(mockDb);
  assert.equal(result.healthy, true);
  assert.equal(result.missing.length, 0);
  assert.equal(result.verified.length, CRITICAL_INDEX_SPECS.length);
});

test("verifyDatabaseIndexes flags missing critical indexes when database has gaps", async () => {
  const mockDbWithMissing = {
    collection: (colName) => ({
      listIndexes: () => ({
        toArray: async () => {
          if (colName === "quiz_sessions") {
            // Missing TTL index on expiresAt!
            return [{ name: "quiz_session_id_unique", key: { quizId: 1 }, unique: true }];
          }
          if (colName === "users") {
            return [{ name: "user_email_unique", key: { email: 1 }, unique: true }];
          }
          return [];
        },
      }),
    }),
  };

  const result = await verifyDatabaseIndexes(mockDbWithMissing);
  assert.equal(result.healthy, false);
  assert.ok(
    result.missing.some(
      (m) => m.collection === "quiz_sessions" && m.name === "quiz_session_expires_at_ttl",
    ),
  );
});

test("verifyDatabaseIndexes fails safely when database connection is null", async () => {
  const result = await verifyDatabaseIndexes(null);
  assert.equal(result.healthy, false);
  assert.equal(result.missing.length, CRITICAL_INDEX_SPECS.length);
});

// ─── 5. LEARNING HISTORY COMPATIBILITY REGRESSION GUARD ───────────────────────

test("LearningHistory isVerified schema path does NOT have default:false", () => {
  const isVerifiedPath = LearningHistory.schema.path("isVerified");
  assert.equal(
    isVerifiedPath.defaultValue,
    undefined,
    "LearningHistory.isVerified MUST NOT have default:false (preserves legacy document distinction)",
  );
});

test("LearningHistory hydration preserves undefined isVerified for legacy records", () => {
  const legacyRecord = new LearningHistory({
    userId: "64b7f1234567890123456789",
    conceptId: "photosynthesis",
    title: "Photosynthesis",
    type: "flowchart",
    summary: "Process of converting light to chemical energy",
    visualizationType: "flowchart",
    concept: { nodes: [] },
    completed: true,
  });

  // Since it was instantiated without isVerified, isNew hook sets it on validate,
  // but existing DB hydrated documents (isNew === false) maintain undefined!
  const hydrated = LearningHistory.hydrate({
    _id: "64b7f1234567890123456789",
    userId: "64b7f1234567890123456789",
    conceptId: "photosynthesis",
    title: "Photosynthesis",
    type: "flowchart",
    summary: "Process of converting light to chemical energy",
    visualizationType: "flowchart",
    concept: { nodes: [] },
    completed: true,
  });

  assert.equal(
    hydrated.isVerified,
    undefined,
    "Hydrated legacy document without isVerified must remain undefined",
  );
  assert.equal(hydrated.completed, true);
  assert.equal(hydrated.migrationKey, undefined);
});

// ─── 6. MONGOOSE MODEL INITIALIZATION & STARTUP ORDERING ─────────────────────

test("ensureModelIndexes awaits Model.init() across all registered models before verification", async () => {
  const initOrder = [];
  const mockModels = {
    User: {
      init: async () => {
        initOrder.push("User");
      },
    },
    QuizSession: {
      init: async () => {
        initOrder.push("QuizSession");
      },
    },
    LearningHistory: {
      init: async () => {
        initOrder.push("LearningHistory");
      },
    },
  };

  await ensureModelIndexes(mockModels);

  assert.equal(initOrder.length, 3);
  assert.ok(initOrder.includes("User"));
  assert.ok(initOrder.includes("QuizSession"));
  assert.ok(initOrder.includes("LearningHistory"));
});

test("ensureModelIndexes handles empty or non-function model entries safely", async () => {
  await assert.doesNotReject(async () => {
    await ensureModelIndexes(null);
    await ensureModelIndexes({});
    await ensureModelIndexes([{}, { init: null }, { init: 123 }]);
  });
});

test("ensureModelIndexes propagates model initialization errors to fail startup safely", async () => {
  const failingModels = {
    QuizSession: {
      init: async () => {
        throw new Error("Index build failure: conflict on key");
      },
    },
  };

  await assert.rejects(
    async () => {
      await ensureModelIndexes(failingModels);
    },
    { message: /Index build failure/ },
  );
});

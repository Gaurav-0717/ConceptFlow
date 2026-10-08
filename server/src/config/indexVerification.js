/**
 * MongoDB Critical Database & Schema Index Verification
 *
 * Verifies that all correctness-critical unique, TTL, and query indexes
 * are properly declared in Mongoose schemas and exist in the live database.
 */

export const CRITICAL_INDEX_SPECS = [
  {
    collection: "users",
    modelName: "User",
    name: "user_email_unique",
    key: { email: 1 },
    unique: true,
    description: "Unique user email constraint",
  },
  {
    collection: "user_learning_history",
    modelName: "LearningHistory",
    name: "user_history_migration_unique",
    key: { userId: 1, migrationKey: 1 },
    unique: true,
    description: "Per-user migrationKey idempotency and isolation",
  },
  {
    collection: "xp_activities",
    modelName: "XPActivity",
    name: "user_action_key_unique",
    key: { userId: 1, actionKey: 1 },
    unique: true,
    description: "Per-user actionKey idempotency for XP awards",
  },
  {
    collection: "user_achievements",
    modelName: "UserAchievement",
    name: "user_achievement_unique",
    key: { userId: 1, achievementId: 1 },
    unique: true,
    description: "Per-user achievement unlock uniqueness",
  },
  {
    collection: "quiz_sessions",
    modelName: "QuizSession",
    name: "quiz_session_id_unique",
    key: { quizId: 1 },
    unique: true,
    description: "Unique quiz session identifier",
  },
  {
    collection: "quiz_sessions",
    modelName: "QuizSession",
    name: "quiz_session_expires_at_ttl",
    key: { expiresAt: 1 },
    ttl: true,
    expireAfterSeconds: 0,
    description: "QuizSession expiresAt TTL expiration index",
  },
  {
    collection: "concept_cache",
    modelName: "ConceptCache",
    name: "cache_key_unique",
    key: { cacheKey: 1 },
    unique: true,
    description: "Unique concept cache key",
  },
  {
    collection: "concept_cache",
    modelName: "ConceptCache",
    name: "expires_at_ttl",
    key: { expiresAt: 1 },
    ttl: true,
    expireAfterSeconds: 0,
    description: "ConceptCache expiresAt TTL expiration index",
  },
];

/**
 * Compares two key pattern objects for equality.
 */
export const keysMatch = (actualKey = {}, expectedKey = {}) => {
  const actualEntries = Object.entries(actualKey);
  const expectedEntries = Object.entries(expectedKey);
  if (actualEntries.length !== expectedEntries.length) return false;
  for (let i = 0; i < expectedEntries.length; i++) {
    const [actK, actV] = actualEntries[i];
    const [expK, expV] = expectedEntries[i];
    if (actK !== expK || actV !== expV) return false;
  }
  return true;
};

/**
 * Checks if an actual index specification meets the expected requirement.
 */
export const matchesIndex = (actualIndex, spec) => {
  if (!actualIndex) return false;
  const nameMatches = actualIndex.name === spec.name;
  const keyMatches = keysMatch(actualIndex.key, spec.key);

  if (!nameMatches && !keyMatches) return false;

  if (spec.unique && !actualIndex.unique) return false;
  if (spec.ttl && typeof actualIndex.expireAfterSeconds !== "number") return false;

  return true;
};

/**
 * Verifies live indexes in a MongoDB database instance.
 *
 * @param {object} db - MongoDB Database instance (from mongoose.connection.db)
 * @param {object} [options]
 * @param {Array} [options.specs=CRITICAL_INDEX_SPECS]
 * @returns {Promise<{ healthy: boolean, verified: string[], missing: Array<{ collection: string, name: string, description: string }> }>}
 */
export const verifyDatabaseIndexes = async (
  db,
  { specs = CRITICAL_INDEX_SPECS } = {},
) => {
  if (!db || typeof db.collection !== "function") {
    return {
      healthy: false,
      reason: "No active database connection available.",
      verified: [],
      missing: specs.map((s) => ({
        collection: s.collection,
        name: s.name,
        description: s.description,
      })),
    };
  }

  const verified = [];
  const missing = [];

  const specsByCollection = new Map();
  for (const spec of specs) {
    if (!specsByCollection.has(spec.collection)) {
      specsByCollection.set(spec.collection, []);
    }
    specsByCollection.get(spec.collection).push(spec);
  }

  for (const [colName, colSpecs] of specsByCollection.entries()) {
    let actualIndexes = [];
    try {
      actualIndexes = await db.collection(colName).listIndexes().toArray();
    } catch {
      actualIndexes = [];
    }

    for (const spec of colSpecs) {
      const found = actualIndexes.some((idx) => matchesIndex(idx, spec));
      if (found) {
        verified.push(spec.name);
      } else {
        missing.push({
          collection: spec.collection,
          name: spec.name,
          key: spec.key,
          description: spec.description,
        });
      }
    }
  }

  return {
    healthy: missing.length === 0,
    verified,
    missing,
  };
};

/**
 * Verifies that Mongoose models have critical indexes declared in their schemas.
 *
 * @param {object} modelsMap - Map of { ModelName: Model }
 * @param {Array} [specs=CRITICAL_INDEX_SPECS]
 * @returns {{ healthy: boolean, verified: string[], missing: Array<{ modelName: string, name: string }> }}
 */
export const verifySchemaIndexes = (
  modelsMap,
  specs = CRITICAL_INDEX_SPECS,
) => {
  const verified = [];
  const missing = [];

  for (const spec of specs) {
    const model = modelsMap[spec.modelName];
    if (!model || !model.schema) {
      missing.push({
        modelName: spec.modelName,
        name: spec.name,
        reason: "Model or schema not found",
      });
      continue;
    }

    const indexes = model.schema.indexes();
    const found = indexes.some(([keys, options]) => {
      const actualIndex = {
        key: keys,
        name: options?.name,
        unique: options?.unique === true,
        expireAfterSeconds: options?.expireAfterSeconds,
      };
      return matchesIndex(actualIndex, spec);
    });

    if (found) {
      verified.push(spec.name);
    } else {
      missing.push({
        modelName: spec.modelName,
        name: spec.name,
        reason: "Index not found in schema declaration",
      });
    }
  }

  return {
    healthy: missing.length === 0,
    verified,
    missing,
  };
};

export const ensureModelIndexes = async (models) => {
  if (!models) return;
  const modelList = Array.isArray(models) ? models : Object.values(models);
  await Promise.all(
    modelList.map((model) =>
      typeof model?.init === "function" ? model.init() : Promise.resolve(),
    ),
  );
};

export default {
  CRITICAL_INDEX_SPECS,
  keysMatch,
  matchesIndex,
  verifyDatabaseIndexes,
  verifySchemaIndexes,
  ensureModelIndexes,
};

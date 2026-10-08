import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { once } from "node:events";
import {
  historyMigrationItemSchema,
  historyMigrationRequestSchema,
} from "../src/validation/learningHistory.schema.js";
import { createUserLearningHistoryService } from "../src/services/userLearningHistoryService.js";
import { createLearningRouter } from "../src/routes/learning.routes.js";
import { FIXTURE_FLOWCHART } from "../src/fixtures/concept.fixtures.js";
import { LearningHistory } from "../src/models/LearningHistory.js";

const { ObjectId } = mongoose.Types;
const TEST_JWT_SECRET = "test-secret-at-least-32-chars-long-for-migration-tests";

const makeTestStore = () => {
  const documents = [];
  return {
    documents,
    countDocuments: async (filter = {}) => {
      return documents.filter((d) => {
        if (filter.userId && String(d.userId) !== String(filter.userId)) return false;
        if (filter.migrationKey?.$exists && !d.migrationKey) return false;
        return true;
      }).length;
    },
    find: (filter = {}) => {
      let filtered = documents.filter((d) => {
        if (filter.userId && String(d.userId) !== String(filter.userId)) return false;
        return true;
      });
      return {
        sort: () => ({
          limit: (n) => ({
            lean: async () => filtered.slice(0, n),
            toArray: async () => filtered.slice(0, n),
          }),
        }),
        toArray: async () => filtered,
        lean: async () => filtered,
      };
    },
    findOne: async (filter = {}) => {
      return (
        documents.find((d) => {
          if (filter.userId && String(d.userId) !== String(filter.userId)) return false;
          if (filter.migrationKey && d.migrationKey !== filter.migrationKey) return false;
          return true;
        }) || null
      );
    },
    updateOne: async (filter, update, options = {}) => {
      const existing = documents.find((d) => {
        if (filter.userId && String(d.userId) !== String(filter.userId)) return false;
        if (filter.migrationKey && d.migrationKey !== filter.migrationKey) return false;
        return true;
      });
      if (existing) {
        return { upsertedCount: 0, modifiedCount: 0 };
      }
      if (options.upsert) {
        const newDoc = {
          _id: new ObjectId(),
          userId: filter.userId,
          migrationKey: filter.migrationKey,
          ...(update.$setOnInsert || {}),
        };
        documents.push(newDoc);
        return { upsertedCount: 1 };
      }
      return { upsertedCount: 0, modifiedCount: 0 };
    },
  };
};

const createTestApp = (store, { rateLimitLimit = 10 } = {}) => {
  const service = createUserLearningHistoryService({
    getCollection: async () => store,
  });

  const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
      const payload = jwt.verify(authHeader.slice(7), TEST_JWT_SECRET);
      req.user = { id: payload.sub };
      next();
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  };

  let attempts = 0;
  const mockRateLimit = (req, res, next) => {
    attempts += 1;
    if (attempts > rateLimitLimit) {
      return res.status(429).json({ success: false, message: "Too many attempts" });
    }
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/learning",
    createLearningRouter({
      historyService: service,
      authMiddleware,
      migrationRateLimitMiddleware: mockRateLimit,
    }),
  );

  return { app, service };
};

// ─── 1. SCHEMA VALIDATION TESTS ───────────────────────────────────────────────

test("historyMigrationItemSchema accepts client latestQuizScore containing completedAt", () => {
  const clientPayload = {
    migrationKey: "photo:2026-10-08T12:00:00.000Z",
    concept: FIXTURE_FLOWCHART,
    explanationLevel: "Intermediate",
    source: "sample",
    createdAt: "2026-10-08T12:00:00.000Z",
    lastAccessedAt: "2026-10-08T12:00:00.000Z",
    latestQuizScore: {
      score: 4,
      total: 5,
      percentage: 80,
      completedAt: "2026-10-08T12:00:00.000Z", // Accepted
    },
  };

  const parsed = historyMigrationItemSchema.safeParse(clientPayload);
  assert.equal(parsed.success, true, "Must accept completedAt on latestQuizScore");
});

test("historyMigrationItemSchema strictly rejects unrelated unexpected fields on latestQuizScore", () => {
  const payloadWithUnexpected = {
    migrationKey: "photo:2026-10-08T12:00:00.000Z",
    concept: FIXTURE_FLOWCHART,
    latestQuizScore: {
      score: 4,
      total: 5,
      percentage: 80,
      completedAt: "2026-10-08T12:00:00.000Z",
      arbitraryField: "malicious_or_unexpected",
    },
  };

  const parsed = historyMigrationItemSchema.safeParse(payloadWithUnexpected);
  assert.equal(parsed.success, false, "Must reject unexpected fields on latestQuizScore");
  assert.ok(
    parsed.error.issues.some((issue) => issue.code === "unrecognized_keys"),
    "Error must be unrecognized_keys",
  );
});

test("historyMigrationItemSchema accepts ISO timestamps with timezone offsets", () => {
  const offsetPayload = {
    migrationKey: "photo:2026-10-08T17:30:00.000+05:30",
    concept: FIXTURE_FLOWCHART,
    createdAt: "2026-10-08T17:30:00.000+05:30",
    lastAccessedAt: "2026-10-08T17:30:00.000+05:30",
    latestQuizScore: {
      score: 4,
      total: 5,
      percentage: 80,
      completedAt: "2026-10-08T17:30:00.000+05:30",
    },
  };

  const parsed = historyMigrationItemSchema.safeParse(offsetPayload);
  assert.equal(parsed.success, true, "Must accept ISO strings with timezone offsets");
});

test("historyMigrationItemSchema rejects malformed non-ISO datetime strings", () => {
  for (const badDate of ["not-a-date", "2026", "2026-10-08", "tomorrow", "1728394000000"]) {
    const badPayload = {
      migrationKey: "photo:bad-date",
      concept: FIXTURE_FLOWCHART,
      createdAt: badDate,
    };
    const parsed = historyMigrationItemSchema.safeParse(badPayload);
    assert.equal(parsed.success, false, `Must reject malformed date "${badDate}"`);
  }
});

test("historyMigrationRequestSchema accepts empty items array", () => {
  const parsed = historyMigrationRequestSchema.safeParse({ items: [] });
  assert.equal(parsed.success, true);
});

test("historyMigrationRequestSchema rejects oversized batch (> 50 items)", () => {
  const oversized = Array.from({ length: 51 }, (_, i) => ({
    migrationKey: `item-${i}`,
  }));
  const parsed = historyMigrationRequestSchema.safeParse({ items: oversized });
  assert.equal(parsed.success, false);
});

test("historyMigrationRequestSchema rejects request body without items array", () => {
  assert.equal(historyMigrationRequestSchema.safeParse({}).success, false);
  assert.equal(historyMigrationRequestSchema.safeParse({ items: "not-array" }).success, false);
  assert.equal(historyMigrationRequestSchema.safeParse(null).success, false);
});

// ─── 2. HTTP ENDPOINT REPRODUCTION & FIX VERIFICATION ─────────────────────────

test("POST /api/learning/history/migrate: accepts empty items cleanly with 200", async () => {
  const store = makeTestStore();
  const { app } = createTestApp(store);
  const server = app.listen(0);
  await once(server, "listening");
  const port = server.address().port;

  try {
    const userId = new ObjectId().toString();
    const token = jwt.sign({ sub: userId }, TEST_JWT_SECRET);
    const res = await fetch(`http://127.0.0.1:${port}/api/learning/history/migrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: [] }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.migrated, 0);
    assert.equal(data.skipped, 0);
  } finally {
    server.close();
  }
});

test("POST /api/learning/history/migrate: successfully migrates client history with completedAt", async () => {
  const store = makeTestStore();
  const { app, service } = createTestApp(store);
  const server = app.listen(0);
  await once(server, "listening");
  const port = server.address().port;

  try {
    const userId = new ObjectId().toString();
    const token = jwt.sign({ sub: userId }, TEST_JWT_SECRET);

    // Exact payload format sent by deployed frontend after taking a quiz
    const clientItems = [
      {
        migrationKey: "photosynthesis:2026-10-08T12:00:00.000Z",
        concept: FIXTURE_FLOWCHART,
        explanationLevel: "Intermediate",
        source: "sample",
        createdAt: "2026-10-08T12:00:00.000Z",
        lastAccessedAt: "2026-10-08T12:00:00.000Z",
        latestQuizScore: {
          score: 5,
          total: 5,
          percentage: 100,
          completedAt: "2026-10-08T12:00:00.000Z",
        },
      },
    ];

    const res = await fetch(`http://127.0.0.1:${port}/api/learning/history/migrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: clientItems }),
    });

    assert.equal(res.status, 200, "Must succeed with 200 rather than 400 Bad Request");
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.migrated, 1);
    assert.equal(data.skipped, 0);

    // SECURITY GUARANTEES CHECK:
    // Stored record MUST be unverified, completed:false, with migrationKey
    const userHistory = await service.listActivities(userId);
    assert.equal(userHistory.length, 1);
    assert.equal(userHistory[0].isVerified, false, "Migrated record must have isVerified:false");
    assert.equal(userHistory[0].completed, false, "Migrated record must have completed:false");
    assert.equal(
      store.documents[0].migrationKey,
      "photosynthesis:2026-10-08T12:00:00.000Z",
      "Stored database document must retain migrationKey",
    );
  } finally {
    server.close();
  }
});

test("POST /api/learning/history/migrate: mixed batch migrates valid items and skips malformed items gracefully", async () => {
  const store = makeTestStore();
  const { app, service } = createTestApp(store);
  const server = app.listen(0);
  await once(server, "listening");
  const port = server.address().port;

  try {
    const userId = new ObjectId().toString();
    const token = jwt.sign({ sub: userId }, TEST_JWT_SECRET);

    const mixedBatch = [
      {
        // Valid item
        migrationKey: "valid-1:2026-10-08T12:00:00.000Z",
        concept: FIXTURE_FLOWCHART,
        explanationLevel: "Beginner",
      },
      {
        // Malformed item (corrupt concept with no nodes)
        migrationKey: "corrupt-2",
        concept: { id: "bad", title: "Bad", type: "flowchart", nodes: [] },
      },
    ];

    const res = await fetch(`http://127.0.0.1:${port}/api/learning/history/migrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: mixedBatch }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.migrated, 1);
    assert.equal(data.skipped, 1);

    const history = await service.listActivities(userId);
    assert.equal(history.length, 1);
    assert.equal(store.documents[0].migrationKey, "valid-1:2026-10-08T12:00:00.000Z");
  } finally {
    server.close();
  }
});

test("POST /api/learning/history/migrate: enforces 50 item batch limit with 400", async () => {
  const store = makeTestStore();
  const { app } = createTestApp(store);
  const server = app.listen(0);
  await once(server, "listening");
  const port = server.address().port;

  try {
    const userId = new ObjectId().toString();
    const token = jwt.sign({ sub: userId }, TEST_JWT_SECRET);

    const oversizedBatch = Array.from({ length: 51 }, (_, i) => ({
      migrationKey: `key-${i}`,
      concept: FIXTURE_FLOWCHART,
    }));

    const res = await fetch(`http://127.0.0.1:${port}/api/learning/history/migrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: oversizedBatch }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  } finally {
    server.close();
  }
});

test("POST /api/learning/history/migrate: enforces rate limit (429)", async () => {
  const store = makeTestStore();
  const { app } = createTestApp(store, { rateLimitLimit: 2 });
  const server = app.listen(0);
  await once(server, "listening");
  const port = server.address().port;

  try {
    const userId = new ObjectId().toString();
    const token = jwt.sign({ sub: userId }, TEST_JWT_SECRET);

    // Call 1
    const res1 = await fetch(`http://127.0.0.1:${port}/api/learning/history/migrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: [] }),
    });
    assert.equal(res1.status, 200);

    // Call 2
    const res2 = await fetch(`http://127.0.0.1:${port}/api/learning/history/migrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: [] }),
    });
    assert.equal(res2.status, 200);

    // Call 3 (exceeds limit 2)
    const res3 = await fetch(`http://127.0.0.1:${port}/api/learning/history/migrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: [] }),
    });
    assert.equal(res3.status, 429);
  } finally {
    server.close();
  }
});

test("POST /api/learning/history/migrate: migration upsert excludes updatedAt inside $setOnInsert", async () => {
  let capturedUpdate = null;
  const store = makeTestStore();
  const originalUpdateOne = store.updateOne;
  store.updateOne = async (filter, update, options) => {
    capturedUpdate = update;
    return originalUpdateOne(filter, update, options);
  };

  const service = createUserLearningHistoryService({
    getCollection: async () => store,
  });

  const userId = new ObjectId().toString();
  const item = {
    migrationKey: "photosynthesis:2026-10-08T19:00:00.000Z",
    concept: FIXTURE_FLOWCHART,
    explanationLevel: "Intermediate",
    source: "sample",
  };

  const result = await service.migrateActivities(userId, [item]);
  assert.equal(result.migrated, 1);
  assert.ok(capturedUpdate?.$setOnInsert, "Must use $setOnInsert");
  assert.equal(
    capturedUpdate.$setOnInsert.updatedAt,
    undefined,
    "updatedAt must NOT be included inside $setOnInsert to prevent Mongoose timestamp conflict",
  );
  assert.ok(capturedUpdate.$setOnInsert.createdAt, "createdAt must be preserved");
  assert.equal(capturedUpdate.$setOnInsert.isVerified, false, "isVerified must be false");
  assert.equal(capturedUpdate.$setOnInsert.migrationKey, item.migrationKey, "migrationKey must match");
});

test("LearningHistory model + migrateActivities: compiled driver update has no conflicting updatedAt operators (MongoServerError code 40 protection)", async () => {
  const originalUpdateOne = LearningHistory.collection.updateOne;
  const originalCountDocuments = LearningHistory.collection.countDocuments;
  const originalFindOne = LearningHistory.collection.findOne;
  const prevReadyState = mongoose.connection.readyState;

  // Simulate active connection state so Mongoose does not buffer and dispatches to driver
  mongoose.connection.readyState = 1;

  let capturedDriverFilter = null;
  let capturedDriverUpdate = null;
  let capturedDriverOptions = null;

  LearningHistory.collection.updateOne = async (filter, update, options) => {
    capturedDriverFilter = filter;
    capturedDriverUpdate = update;
    capturedDriverOptions = options;
    return {
      acknowledged: true,
      modifiedCount: 0,
      upsertedCount: 1,
      upsertedId: new ObjectId(),
    };
  };
  LearningHistory.collection.countDocuments = async () => 0;
  LearningHistory.collection.findOne = async () => null;

  try {
    const service = createUserLearningHistoryService({
      model: LearningHistory,
      getModel: async () => LearningHistory,
    });

    const userId = new ObjectId().toString();
    const item = {
      migrationKey: "photosynthesis:2026-10-08T19:00:00.000Z",
      concept: FIXTURE_FLOWCHART,
      explanationLevel: "Intermediate",
      source: "sample",
    };

    const result = await service.migrateActivities(userId, [item]);
    assert.equal(result.migrated, 1);
    assert.equal(result.skipped, 0);

    // 1. Verify driver call options
    assert.equal(capturedDriverOptions?.upsert, true, "Driver call must specify upsert: true");

    // 2. Mongoose automatically adds $set.updatedAt due to LearningHistory schema { timestamps: true }
    assert.ok(
      capturedDriverUpdate?.$set?.updatedAt,
      "Mongoose timestamps must inject $set.updatedAt upon query compilation",
    );

    // 3. Migration payload must NOT have updatedAt inside $setOnInsert
    assert.equal(
      capturedDriverUpdate?.$setOnInsert?.updatedAt,
      undefined,
      "$setOnInsert must not contain updatedAt (would cause MongoServerError code 40 ConflictingUpdateOperators)",
    );

    // 4. Assert no overlapping field paths between $set and $setOnInsert (exact Code 40 guard)
    const setKeys = Object.keys(capturedDriverUpdate?.$set || {});
    const setOnInsertKeys = Object.keys(capturedDriverUpdate?.$setOnInsert || {});
    const conflictingKeys = setKeys.filter((key) => setOnInsertKeys.includes(key));
    assert.deepEqual(
      conflictingKeys,
      [],
      "No overlapping update paths allowed between $set and $setOnInsert",
    );

    // 5. Verify security guarantees on compiled insert payload
    assert.equal(
      capturedDriverUpdate.$setOnInsert.isVerified,
      false,
      "isVerified must be explicitly false for untrusted migration",
    );
    assert.equal(
      capturedDriverUpdate.$setOnInsert.completed,
      false,
      "completed must be false for untrusted migration",
    );
    assert.equal(
      capturedDriverUpdate.$setOnInsert.migrationKey,
      item.migrationKey,
      "migrationKey must match",
    );
    assert.ok(
      capturedDriverUpdate.$setOnInsert.createdAt,
      "createdAt must be preserved in $setOnInsert",
    );
  } finally {
    mongoose.connection.readyState = prevReadyState;
    LearningHistory.collection.updateOne = originalUpdateOne;
    if (originalCountDocuments) LearningHistory.collection.countDocuments = originalCountDocuments;
    if (originalFindOne) LearningHistory.collection.findOne = originalFindOne;
  }
});

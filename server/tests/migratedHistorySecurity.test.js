import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { test } from "node:test";
import rateLimit from "express-rate-limit";
import { createAuthMiddleware } from "../src/middleware/auth.js";
import { createLearningRouter } from "../src/routes/learning.routes.js";
import { createUserLearningHistoryService } from "../src/services/userLearningHistoryService.js";
import { createQuizService } from "../src/services/quizService.js";
import { createXPService } from "../src/services/xpService.js";
import { createAchievementService } from "../src/services/achievementService.js";
import { FIXTURE_FLOWCHART } from "../src/fixtures/concept.fixtures.js";
import { createQuizSessionTestStore } from "./quizSessionTestStore.js";
import { LearningHistory } from "../src/models/LearningHistory.js";

const { ObjectId } = mongoose.Types;
const TEST_JWT_SECRET = "migrated-history-security-test-secret-at-least-32-chars";

/**
 * In-memory store for LearningHistory documents with full query, countDocuments, and updateOne support
 */
const makeHistoryCollection = () => {
  const documents = [];
  const matches = (doc, filter) => {
    if (filter.$or) {
      const orMatches = filter.$or.some((subFilter) => matches(doc, subFilter));
      if (!orMatches) return false;
    }
    if (filter.userId) {
      if (String(doc.userId) !== String(filter.userId)) return false;
    }
    if (filter._id) {
      if (!doc._id.equals(filter._id)) return false;
    }
    if (filter.migrationKey) {
      if (filter.migrationKey.$exists) {
        if (!doc.migrationKey) return false;
      } else if (doc.migrationKey !== filter.migrationKey) {
        return false;
      }
    }
    return true;
  };

  return {
    documents,
    insertOne: async (doc) => {
      const insertedId = new ObjectId();
      const record = {
        ...doc,
        _id: insertedId,
        createdAt: doc.createdAt || new Date(),
      };
      documents.push(record);
      return { insertedId };
    },
    countDocuments: async (filter) => {
      return documents.filter((doc) => matches(doc, filter)).length;
    },
    find: (filter) => {
      let selected = documents.filter((doc) => matches(doc, filter));
      const cursor = {
        sort() {
          selected = [...selected].sort((a, b) => b.createdAt - a.createdAt);
          return cursor;
        },
        limit(count) {
          selected = selected.slice(0, count);
          return cursor;
        },
        select() {
          return cursor;
        },
        lean: async () => selected,
        toArray: async () => selected,
      };
      return cursor;
    },
    findOne: async (filter) =>
      documents.find((doc) => matches(doc, filter)) || null,
    deleteOne: async (filter) => {
      const index = documents.findIndex((doc) => matches(doc, filter));
      if (index < 0) return { deletedCount: 0 };
      documents.splice(index, 1);
      return { deletedCount: 1 };
    },
    updateOne: async (filter, update, options = {}) => {
      const existing = documents.find((doc) => matches(doc, filter));
      if (existing) {
        return { upsertedCount: 0, modifiedCount: 0 };
      }
      if (options.upsert) {
        const newDoc = {
          ...(update.$setOnInsert || {}),
          _id: new ObjectId(),
          createdAt: update.$setOnInsert?.createdAt || new Date(),
        };
        documents.push(newDoc);
        return { upsertedCount: 1 };
      }
      return { upsertedCount: 0, modifiedCount: 0 };
    },
  };
};

/**
 * In-memory store for XP activities
 */
const makeXPCollection = () => {
  const documents = [];
  return {
    documents,
    create: async (doc) => {
      if (
        doc.actionKey &&
        documents.some(
          (d) =>
            String(d.userId) === String(doc.userId) &&
            d.actionKey === doc.actionKey,
        )
      ) {
        const error = new Error("Duplicate actionKey");
        error.code = 11000;
        throw error;
      }
      const record = {
        _id: new ObjectId(),
        ...doc,
        createdAt: doc.createdAt || new Date(),
      };
      documents.push(record);
      return record;
    },
    findOne: async (filter) => {
      return (
        documents.find((d) => {
          if (filter.userId && String(d.userId) !== String(filter.userId))
            return false;
          if (filter.actionKey && d.actionKey !== filter.actionKey)
            return false;
          return true;
        }) || null
      );
    },
    find: async (filter) => {
      return documents.filter((d) => {
        if (filter.userId && String(d.userId) !== String(filter.userId))
          return false;
        return true;
      });
    },
    aggregate: async (pipeline) => {
      let filtered = [...documents];
      for (const stage of pipeline) {
        if (stage.$match) {
          filtered = filtered.filter((d) => {
            if (
              stage.$match.userId &&
              String(d.userId) !== String(stage.$match.userId)
            )
              return false;
            return true;
          });
        }
        if (stage.$group) {
          const total = filtered.reduce((sum, d) => sum + (d.amount || 0), 0);
          return [{ _id: null, total, totalXP: total, todayXP: total }];
        }
      }
      return filtered;
    },
  };
};

/**
 * In-memory User model tracking streak
 */
const makeUserModel = (initialUsers = {}) => {
  const users = new Map();
  for (const [id, user] of Object.entries(initialUsers)) {
    users.set(String(id), { ...user, _id: new ObjectId(id) });
  }

  const wrapUser = (id) => {
    const raw = users.get(String(id));
    if (!raw) return null;
    const doc = {
      ...raw,
      save: async function () {
        users.set(String(this._id), { ...this });
        return this;
      },
      lean: async () => ({ ...users.get(String(id)) }),
    };
    return doc;
  };

  return {
    users,
    findById: (id) => wrapUser(id),
    updateOne: async (filter, update) => {
      const user = users.get(String(filter._id));
      if (!user) return { matchedCount: 0 };
      if (update.$set) {
        Object.assign(user, update.$set);
      }
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };
};

const make5QuestionQuiz = () => ({
  questions: Array.from({ length: 5 }, (_, index) => ({
    id: `q${index + 1}`,
    question: `Question ${index + 1}?`,
    options: ["Answer 0 (Correct)", "Answer 1", "Answer 2", "Answer 3"],
    correctAnswerIndex: 0,
    explanation: `Option 0 is the correct answer for question ${index + 1}.`,
  })),
});

const setupTestEnvironment = (users = {}) => {
  const historyStore = makeHistoryCollection();
  const xpStore = makeXPCollection();
  const quizStore = createQuizSessionTestStore();
  const userModel = makeUserModel(users);

  const historyService = createUserLearningHistoryService({
    getCollection: async () => historyStore,
  });

  const xpService = createXPService({
    getModel: async () => xpStore,
    userModel,
    historyModel: {
      find: (filter) => historyStore.find(filter),
    },
  });

  const achievementModel = {
    records: [],
    find: (filter) => ({
      lean: async () =>
        achievementModel.records.filter(
          (r) => String(r.userId) === String(filter.userId),
        ),
    }),
    create: async (doc) => {
      achievementModel.records.push({
        ...doc,
        _id: new ObjectId(),
        unlockedAt: new Date(),
      });
      return doc;
    },
  };

  const achievementService = createAchievementService({
    achievementModel,
    progressService: { getProgress: (id) => xpService.getProgress(id) },
  });
  xpService.setAchievementService(achievementService);

  const quizService = createQuizService({
    getCollection: async () => quizStore.collection,
    contentService: {
      generateQuiz: async () => ({
        source: "fallback",
        quiz: make5QuestionQuiz(),
      }),
    },
    onCompleted: async ({
      userId,
      concept,
      explanationLevel,
      result,
      source,
      quizId,
    }) => {
      await historyService.saveQuizResult({
        userId,
        concept,
        explanationLevel,
        source,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
      });
      if (concept?.id) {
        await xpService.awardConceptCompleted(userId, concept.id, {
          checkAchievements: false,
          updateStreak: false,
        });
      }
      await xpService.awardQuizCompleted(userId, {
        quizId,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
      });
    },
  });

  const authMiddleware = createAuthMiddleware({
    service: {
      verifyToken: (token) => {
        try {
          const payload = jwt.verify(token, TEST_JWT_SECRET);
          return { id: payload.sub, email: payload.email || "user@example.com" };
        } catch {
          return null;
        }
      },
    },
  });

  return {
    historyStore,
    xpStore,
    quizStore,
    userModel,
    historyService,
    xpService,
    achievementService,
    achievementModel,
    quizService,
    authMiddleware,
  };
};

const makeMigratedItem = (keySuffix, { score = 5, total = 5, percentage = 100 } = {}) => ({
  migrationKey: `migrated:concept-${keySuffix}`,
  concept: {
    ...FIXTURE_FLOWCHART,
    id: `concept-${keySuffix}`,
    title: `Migrated Concept ${keySuffix}`,
  },
  explanationLevel: "Beginner",
  source: "sample",
  createdAt: "2026-10-01T10:00:00.000Z",
  lastAccessedAt: "2026-10-01T11:00:00.000Z",
  latestQuizScore: { score, total, percentage },
});

// =========================================================================
// TEST SUITE: SECURE MIGRATED LEARNING HISTORY
// =========================================================================

test("1. Forged latestQuizScore cannot increase verified quizzesCompleted", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  const forgedItems = Array.from({ length: 5 }, (_, i) =>
    makeMigratedItem(`quiz-${i}`, { score: 5, total: 5, percentage: 100 }),
  );

  const migrationResult = await env.historyService.migrateActivities(userId, forgedItems);
  assert.equal(migrationResult.migrated, 5);

  const progress = await env.xpService.getProgress(userId);
  assert.equal(progress.quizzesCompleted, 0, "Migrated quiz scores must not count toward quizzesCompleted");
});

test("2. Forged completed flag cannot increase verified conceptsCompleted", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  // Client creates learning activities attempting self-reported completion
  for (let i = 0; i < 4; i++) {
    await env.historyService.createActivity(userId, {
      concept: {
        ...FIXTURE_FLOWCHART,
        id: `concept-${i}`,
        title: `Forged Concept ${i}`,
      },
      explanationLevel: "Beginner",
      completed: true,
    });
  }

  // Also migrate items with fabricated history
  const forgedItems = Array.from({ length: 4 }, (_, i) =>
    makeMigratedItem(`migrated-concept-${i}`),
  );
  await env.historyService.migrateActivities(userId, forgedItems);

  const progress = await env.xpService.getProgress(userId);
  assert.equal(progress.conceptsCompleted, 0, "Migrated completed flags must not count toward conceptsCompleted");
});

test("3. Forged scores cannot change authoritative quizAccuracy", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  // User migrates fabricated 100% quiz scores
  const forgedItems = [
    makeMigratedItem("fake-1", { score: 10, total: 10, percentage: 100 }),
    makeMigratedItem("fake-2", { score: 20, total: 20, percentage: 100 }),
  ];
  await env.historyService.migrateActivities(userId, forgedItems);

  // Before any real quiz, quizAccuracy is 0
  let progress = await env.xpService.getProgress(userId);
  assert.equal(progress.quizAccuracy, 0, "quizAccuracy must be 0 when only unverified history exists");

  // User takes 1 legitimate quiz answering 3/5 correct (60%)
  const quizRes = await env.quizService.createQuiz(FIXTURE_FLOWCHART, {
    userId,
    explanationLevel: "Beginner",
  });
  const quizId = quizRes.quizId;
  const questions = quizRes.quiz.questions;

  // Answer 3 correctly (answer 0), 2 incorrectly (answer 1)
  const answers = {
    [questions[0].id]: 0,
    [questions[1].id]: 0,
    [questions[2].id]: 0,
    [questions[3].id]: 1,
    [questions[4].id]: 1,
  };
  await env.quizService.submitQuiz(quizId, answers, { userId });

  // Authoritative accuracy must be exactly 60%, NOT skewed by the forged 30/30
  progress = await env.xpService.getProgress(userId);
  assert.equal(progress.quizzesCompleted, 1);
  assert.equal(progress.quizAccuracy, 60, "quizAccuracy must strictly reflect verified quiz performance");
});

test("4. Imported entries cannot unlock first_quiz, first_concept or quiz_master", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  // Migrate 10 entries with 100% quiz scores
  const forgedItems = Array.from({ length: 10 }, (_, i) =>
    makeMigratedItem(`quizmaster-${i}`, { score: 5, total: 5, percentage: 100 }),
  );
  await env.historyService.migrateActivities(userId, forgedItems);

  // Trigger achievement checks
  const newlyUnlocked = await env.achievementService.checkAchievements(userId);
  assert.deepEqual(newlyUnlocked, [], "No achievements should be unlocked by migrated items");

  const unlocked = await env.achievementService.getUserAchievements(userId);
  assert.equal(unlocked.length, 0, "User must have 0 unlocked achievements");
});

test("5. Legitimate server-verified quiz history still contributes to progress and achievements", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  // User has both 2 migrated items AND completes 1 real quiz
  await env.historyService.migrateActivities(userId, [
    makeMigratedItem("migrated-a"),
    makeMigratedItem("migrated-b"),
  ]);

  const quizRes = await env.quizService.createQuiz(FIXTURE_FLOWCHART, {
    userId,
    explanationLevel: "Beginner",
  });
  const quizId = quizRes.quizId;
  const questions = quizRes.quiz.questions;
  const answers = {
    [questions[0].id]: 0,
    [questions[1].id]: 0,
    [questions[2].id]: 0,
    [questions[3].id]: 0,
    [questions[4].id]: 0,
  };

  await env.quizService.submitQuiz(quizId, answers, { userId });

  const progress = await env.xpService.getProgress(userId);
  assert.equal(progress.quizzesCompleted, 1, "Real quiz increments quizzesCompleted");
  assert.equal(progress.conceptsCompleted, 1, "Real quiz increments conceptsCompleted");
  assert.equal(progress.quizAccuracy, 100, "Real quiz yields 100% accuracy");

  const unlocked = await env.achievementService.getUserAchievements(userId);
  const achievementIds = unlocked.map((a) => a.achievementId);
  assert.ok(achievementIds.includes("first_quiz"), "first_quiz achievement is unlocked");
  assert.ok(achievementIds.includes("first_concept"), "first_concept achievement is unlocked");
});

test("6. Imported history does not award XP or update streaks", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 2, longestStreak: 5, lastActiveDate: new Date("2026-10-01") },
  });

  const forgedItems = Array.from({ length: 5 }, (_, i) =>
    makeMigratedItem(`xp-streak-${i}`, { score: 5, total: 5, percentage: 100 }),
  );
  await env.historyService.migrateActivities(userId, forgedItems);

  // User XP must remain 0
  const progress = await env.xpService.getProgress(userId);
  assert.equal(progress.totalXP, 0, "Migrated history must not award XP");
  assert.equal(env.xpStore.documents.length, 0, "No XP ledger records created");

  // Streak must remain untouched
  const user = await env.userModel.findById(userId);
  assert.equal(user.currentStreak, 2, "Current streak must not change");
  assert.equal(user.longestStreak, 5, "Longest streak must not change");
});

test("7. A user cannot migrate entries into another user's account", async () => {
  const userA = new ObjectId().toString();
  const userB = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userA]: { currentStreak: 0, longestStreak: 0 },
    [userB]: { currentStreak: 0, longestStreak: 0 },
  });

  const app = express();
  app.use(express.json());
  app.use(
    "/api/learning",
    createLearningRouter({
      historyService: env.historyService,
      authMiddleware: env.authMiddleware,
      migrationRateLimitMiddleware: (_req, _res, next) => next(),
    }),
  );

  const server = app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/learning/history`;

  try {
    const tokenA = jwt.sign({ sub: userA }, TEST_JWT_SECRET, { expiresIn: "1h" });
    const items = [makeMigratedItem("user-a-item")];

    // User A calls migrate endpoint
    const response = await fetch(`${baseUrl}/migrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ items }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.migrated, 1);

    // Verify User A has 1 item, User B has 0
    const listA = await env.historyService.listActivities(userA);
    const listB = await env.historyService.listActivities(userB);
    assert.equal(listA.length, 1);
    assert.equal(listB.length, 0, "User B must have 0 history items");

    // Unauthenticated request is rejected with 401
    const unauthResponse = await fetch(`${baseUrl}/migrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    assert.equal(unauthResponse.status, 401);
  } finally {
    server.close();
  }
});

test("8. Per-request limits remain enforced (max 50 items)", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  // Attempting to migrate 51 items in a single request must be rejected
  const oversizedItems = Array.from({ length: 51 }, (_, i) =>
    makeMigratedItem(`oversized-${i}`),
  );

  await assert.rejects(
    env.historyService.migrateActivities(userId, oversizedItems),
    (err) => err.statusCode === 400 && err.message.includes("at most 50"),
  );

  // HTTP endpoint also rejects via Zod schema validation
  const app = express();
  app.use(express.json());
  app.use(
    "/api/learning",
    createLearningRouter({
      historyService: env.historyService,
      authMiddleware: env.authMiddleware,
      migrationRateLimitMiddleware: (_req, _res, next) => next(),
    }),
  );

  const server = app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/learning/history`;

  try {
    const token = jwt.sign({ sub: userId }, TEST_JWT_SECRET, { expiresIn: "1h" });
    const response = await fetch(`${baseUrl}/migrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: oversizedItems }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.success, false);
  } finally {
    server.close();
  }
});

test("9. Repeated migration cannot grow storage without the intended account bound", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  // Batch 1: 50 items
  const batch1 = Array.from({ length: 50 }, (_, i) => makeMigratedItem(`b1-${i}`));
  const res1 = await env.historyService.migrateActivities(userId, batch1);
  assert.equal(res1.migrated, 50);

  // Batch 2: 50 items (reaches account quota of 100)
  const batch2 = Array.from({ length: 50 }, (_, i) => makeMigratedItem(`b2-${i}`));
  const res2 = await env.historyService.migrateActivities(userId, batch2);
  assert.equal(res2.migrated, 50);

  // Total count in storage is now 100
  const count = await env.historyStore.countDocuments({
    userId,
    migrationKey: { $exists: true },
  });
  assert.equal(count, 100);

  // Batch 3: Attempting to migrate 5 more items fails with account limit error
  const batch3 = Array.from({ length: 5 }, (_, i) => makeMigratedItem(`b3-${i}`));
  await assert.rejects(
    env.historyService.migrateActivities(userId, batch3),
    (err) => err.statusCode === 400 && err.message.includes("Account migration limit reached"),
  );

  // Idempotent retry of existing items still succeeds without error and without growing storage
  const retryRes = await env.historyService.migrateActivities(userId, batch1.slice(0, 10));
  assert.equal(retryRes.migrated, 0);
  assert.equal(retryRes.skipped, 0);

  const finalCount = await env.historyStore.countDocuments({
    userId,
    migrationKey: { $exists: true },
  });
  assert.equal(finalCount, 100, "Storage must strictly not exceed 100 items per account");
});

test("10. Existing history viewing/deletion and offline migration behavior remain compatible", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  const items = [
    makeMigratedItem("view-test", { score: 4, total: 5, percentage: 80 }),
  ];
  await env.historyService.migrateActivities(userId, items);

  // 1. History listing contains the item with preserved quiz metrics and isVerified: false
  const list = await env.historyService.listActivities(userId);
  assert.equal(list.length, 1);
  assert.equal(list[0].quizScore, 4);
  assert.equal(list[0].quizTotal, 5);
  assert.equal(list[0].quizPercentage, 80);
  assert.equal(list[0].isVerified, false);
  assert.equal(list[0].completed, false);

  // 2. Retrieval by ID works
  const activityId = list[0].id;
  const single = await env.historyService.getActivity(userId, activityId);
  assert.ok(single);
  assert.equal(single.id, activityId);
  assert.equal(single.isVerified, false);

  // 3. Deletion works
  const deleted = await env.historyService.deleteActivity(userId, activityId);
  assert.equal(deleted, true);

  const afterDelete = await env.historyService.listActivities(userId);
  assert.equal(afterDelete.length, 0);
});

test("11. Migration endpoint rate limiting restricts excessive attempts", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  // Use a tight rate limit for this test: max 2 requests per window
  const customRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 2,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    validate: { keyGeneratorIpFallback: false },
    handler: (req, res) =>
      res.status(429).json({
        success: false,
        message:
          "Too many history migration attempts. Please wait a few minutes and try again.",
      }),
  });

  const app = express();
  app.use(express.json());
  app.use(
    "/api/learning",
    createLearningRouter({
      historyService: env.historyService,
      authMiddleware: env.authMiddleware,
      migrationRateLimitMiddleware: customRateLimit,
    }),
  );

  const server = app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/learning/history/migrate`;

  try {
    const token = jwt.sign({ sub: userId }, TEST_JWT_SECRET, { expiresIn: "1h" });
    const sendRequest = () =>
      fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: [] }),
      });

    const res1 = await sendRequest();
    assert.equal(res1.status, 200);

    const res2 = await sendRequest();
    assert.equal(res2.status, 200);

    // 3rd attempt exceeds limit of 2
    const res3 = await sendRequest();
    assert.equal(res3.status, 429);
    const body3 = await res3.json();
    assert.equal(body3.success, false);
  } finally {
    server.close();
  }
});

test("12. Legacy pre-isVerified verified record contributes to progress without awarding duplicate XP", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 1, longestStreak: 2 },
  });

  // Pre-existing XP records for this user (e.g. 30 XP already earned when the quiz was taken)
  await env.xpStore.create({
    userId: new ObjectId(userId),
    amount: 30,
    reason: "quiz_completed",
    actionKey: "quiz:old-quiz-1",
  });

  // Legacy record in history collection: no isVerified field, no migrationKey, completed: true
  const legacyDoc = {
    userId: new ObjectId(userId),
    conceptId: "legacy-photosynthesis",
    completed: true,
    quizScore: 4,
    quizTotal: 5,
    quizPercentage: 80,
    // Note: isVerified is completely absent
    // Note: migrationKey is completely absent
  };
  await env.historyStore.insertOne(legacyDoc);

  // Compute progress
  const progress = await env.xpService.getProgress(userId);
  assert.equal(progress.conceptsCompleted, 1, "Legacy completed concept must be counted");
  assert.equal(progress.quizzesCompleted, 1, "Legacy completed quiz must be counted");
  assert.equal(progress.quizAccuracy, 80, "Legacy quiz accuracy must be computed accurately");
  assert.equal(progress.totalXP, 30, "Legacy history calculation must not award duplicate XP");
  assert.equal(env.xpStore.documents.length, 1, "No duplicate XP ledger records should be created");
});

test("13. Legacy pre-isVerified migrated record with forged score/completed is strictly excluded", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  // Legacy migrated record from before Task 3E-1:
  // Under the old schema, migrationKey was set and completed was set to true if latestQuizScore existed
  const oldMigratedDoc = {
    userId: new ObjectId(userId),
    conceptId: "old-migrated-concept",
    migrationKey: "legacy:offline:entry-123",
    completed: true, // was forged/auto-set under old schema
    quizScore: 5,
    quizTotal: 5,
    quizPercentage: 100,
    // Note: isVerified is absent
  };
  await env.historyStore.insertOne(oldMigratedDoc);

  const progress = await env.xpService.getProgress(userId);
  assert.equal(progress.conceptsCompleted, 0, "Old migrated record must not count toward conceptsCompleted");
  assert.equal(progress.quizzesCompleted, 0, "Old migrated record must not count toward quizzesCompleted");
  assert.equal(progress.quizAccuracy, 0, "Old migrated record must not count toward quizAccuracy");
});

test("14. Legacy pre-isVerified exploratory visit without completion is excluded", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0 },
  });

  const oldVisitDoc = {
    userId: new ObjectId(userId),
    conceptId: "old-visit-concept",
    completed: false,
    // isVerified is absent
    // migrationKey is absent
  };
  await env.historyStore.insertOne(oldVisitDoc);

  const progress = await env.xpService.getProgress(userId);
  assert.equal(progress.conceptsCompleted, 0, "Exploratory visit must not count toward conceptsCompleted");
  assert.equal(progress.quizzesCompleted, 0);
});

test("15. Real Mongoose LearningHistory hydration preserves undefined isVerified for legacy records", () => {
  // Legacy document from MongoDB where isVerified was never stored
  const legacyRaw = {
    _id: new ObjectId(),
    userId: new ObjectId(),
    conceptId: "legacy-concept",
    title: "Legacy Concept",
    type: "flowchart",
    visualizationType: "flowchart",
    summary: "Legacy summary",
    concept: FIXTURE_FLOWCHART,
    completed: true,
    quizScore: 4,
    quizTotal: 5,
  };

  const legacyHydrated = LearningHistory.hydrate(legacyRaw);
  assert.equal(legacyHydrated.isVerified, undefined, "Legacy document must not have isVerified defaulted to false");
  assert.equal("isVerified" in legacyHydrated.toObject(), false, "isVerified must not be present in legacy object");

  // New unverified activity
  const unverifiedRaw = {
    _id: new ObjectId(),
    userId: new ObjectId(),
    conceptId: "unverified-concept",
    title: "Unverified Concept",
    type: "flowchart",
    visualizationType: "flowchart",
    summary: "Summary",
    concept: FIXTURE_FLOWCHART,
    completed: false,
    isVerified: false,
  };
  const unverifiedHydrated = LearningHistory.hydrate(unverifiedRaw);
  assert.equal(unverifiedHydrated.isVerified, false, "Unverified document must have isVerified: false");

  // New verified quiz activity
  const verifiedRaw = {
    _id: new ObjectId(),
    userId: new ObjectId(),
    conceptId: "verified-concept",
    title: "Verified Concept",
    type: "flowchart",
    visualizationType: "flowchart",
    summary: "Summary",
    concept: FIXTURE_FLOWCHART,
    completed: true,
    isVerified: true,
  };
  const verifiedHydrated = LearningHistory.hydrate(verifiedRaw);
  assert.equal(verifiedHydrated.isVerified, true, "Verified document must have isVerified: true");
});


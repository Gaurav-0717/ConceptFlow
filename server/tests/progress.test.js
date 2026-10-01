import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { test } from "node:test";
import { createAuthMiddleware } from "../src/middleware/auth.js";
import { createProgressRouter } from "../src/routes/progress.routes.js";
import {
  createXPService,
  XP_AMOUNTS,
} from "../src/services/xpService.js";
import { FIXTURE_FLOWCHART } from "../src/fixtures/concept.fixtures.js";

const { ObjectId } = mongoose.Types;
const TEST_JWT_SECRET =
  "test-only-jwt-secret-with-more-than-thirty-two-characters";

const createMockXPStorage = () => {
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
            if (stage.$match.reason && stage.$match.reason.$ne) {
              if (d.reason === stage.$match.reason.$ne) return false;
            }
            if (stage.$match.createdAt && stage.$match.createdAt.$gte) {
              if (new Date(d.createdAt) < stage.$match.createdAt.$gte)
                return false;
            }
            if (stage.$match.createdAt && stage.$match.createdAt.$lte) {
              if (new Date(d.createdAt) > stage.$match.createdAt.$lte)
                return false;
            }
            return true;
          });
        }
        if (stage.$group) {
          const total = filtered.reduce((sum, d) => sum + (d.amount || 0), 0);
          return [{ _id: null, total }];
        }
      }
      return [];
    },
  };
};

const createMockHistoryModel = (docs = []) => ({
  find: (filter) => ({
    lean: async () => {
      return docs.filter((d) => {
        const targetUser = filter.userId || filter.$or?.[0]?.userId;
        if (targetUser && String(d.userId) !== String(targetUser)) return false;
        return true;
      });
    },
  }),
});

test("XP creation awards correct amounts for each reason", async () => {
  const storage = createMockXPStorage();
  const service = createXPService({
    getModel: async () => storage,
    userModel: null,
  });
  const userId = new ObjectId().toString();

  const cResult = await service.awardXP(userId, "concept_completed", {
    checkDailyGoal: false,
  });
  assert.equal(cResult.awarded, true);
  assert.equal(cResult.amount, 10);

  const eResult = await service.awardXP(userId, "explanation_completed", {
    checkDailyGoal: false,
  });
  assert.equal(eResult.awarded, true);
  assert.equal(eResult.amount, 5);

  const qResult = await service.awardXP(userId, "quiz_completed", {
    checkDailyGoal: false,
  });
  assert.equal(qResult.awarded, true);
  assert.equal(qResult.amount, 20);

  const hResult = await service.awardXP(userId, "high_quiz_score", {
    checkDailyGoal: false,
  });
  assert.equal(hResult.awarded, true);
  assert.equal(hResult.amount, 10);

  const dResult = await service.awardXP(userId, "daily_goal", {
    checkDailyGoal: false,
  });
  assert.equal(dResult.awarded, true);
  assert.equal(dResult.amount, 25);

  assert.equal(storage.documents.length, 5);
});

test("duplicate prevention prevents awarding XP multiple times for the same actionKey", async () => {
  const storage = createMockXPStorage();
  const service = createXPService({
    getModel: async () => storage,
    userModel: null,
  });
  const userId = new ObjectId().toString();

  // Award concept XP
  const first = await service.awardConceptCompleted(userId, "photosynthesis");
  assert.equal(first.awarded, true);
  assert.equal(first.amount, 10);

  // Attempt duplicate concept XP
  const duplicate = await service.awardConceptCompleted(
    userId,
    "photosynthesis",
  );
  assert.equal(duplicate.awarded, false);
  assert.equal(duplicate.duplicate, true);

  // Only 1 document stored
  assert.equal(storage.documents.length, 1);
});

test("user isolation ensures rewards and progress are isolated between users", async () => {
  const storage = createMockXPStorage();
  const historyDocs = [];
  const historyModel = createMockHistoryModel(historyDocs);
  const service = createXPService({
    getModel: async () => storage,
    historyModel,
    userModel: null,
  });

  const userA = new ObjectId().toString();
  const userB = new ObjectId().toString();

  // User A completes concept
  await service.awardConceptCompleted(userA, "concept-alpha");
  historyDocs.push({
    userId: userA,
    conceptId: "concept-alpha",
    completed: true,
  });

  // User B can also complete concept-alpha independently
  const userBResult = await service.awardConceptCompleted(
    userB,
    "concept-alpha",
  );
  assert.equal(userBResult.awarded, true);

  const progressA = await service.getProgress(userA);
  const progressB = await service.getProgress(userB);

  assert.equal(progressA.totalXP, 10);
  assert.equal(progressA.conceptsCompleted, 1);

  assert.equal(progressB.totalXP, 10);
  assert.equal(progressB.conceptsCompleted, 0); // User B has no historyDocs yet
});

test("progress calculation computes totalXP, todayXP, concepts, quizzes, and accuracy", async () => {
  const storage = createMockXPStorage();
  const userId = new ObjectId().toString();
  const historyDocs = [
    {
      userId,
      conceptId: "concept-1",
      completed: true,
    },
    {
      userId,
      conceptId: "concept-2",
      completed: true,
    },
    {
      userId,
      conceptId: "concept-1",
      quizScore: 4,
      quizTotal: 5, // 80%
    },
    {
      userId,
      conceptId: "concept-2",
      quizScore: 5,
      quizTotal: 5, // 100%
    },
  ];
  const historyModel = createMockHistoryModel(historyDocs);
  const service = createXPService({
    getModel: async () => storage,
    historyModel,
    userModel: null,
  });

  await service.awardConceptCompleted(userId, "concept-1"); // +10
  await service.awardConceptCompleted(userId, "concept-2"); // +10

  const progress = await service.getProgress(userId);
  assert.equal(progress.totalXP, 20);
  assert.equal(progress.todayXP, 20);
  assert.equal(progress.conceptsCompleted, 2);
  assert.equal(progress.quizzesCompleted, 2);
  // (4 + 5) / (5 + 5) = 9/10 = 90%
  assert.equal(progress.quizAccuracy, 90);
  assert.equal(progress.currentStreak, 0);
});

test("quiz XP awards +20 for completion and +10 bonus for >= 80% score", async () => {
  const storage = createMockXPStorage();
  const service = createXPService({
    getModel: async () => storage,
    userModel: null,
  });
  const userId = new ObjectId().toString();

  // Test standard score (< 80%)
  const standardResult = await service.awardQuizCompleted(userId, {
    quizId: "quiz-session-1",
    conceptId: "photosynthesis",
    percentage: 70,
  });
  assert.equal(standardResult.quizXPAwarded, true);
  assert.equal(standardResult.highScoreXPAwarded, false);
  assert.equal(standardResult.totalAwarded, 20);

  // Test high score (>= 80%)
  const highScoreResult = await service.awardQuizCompleted(userId, {
    quizId: "quiz-session-2",
    conceptId: "water-cycle",
    percentage: 85,
  });
  assert.equal(highScoreResult.quizXPAwarded, true);
  assert.equal(highScoreResult.highScoreXPAwarded, true);
  // Reached >= 30 XP (20 from quiz 1 + 20 + 10 from quiz 2 = 50 >= 30) -> awards daily_goal (+25)
  assert.equal(highScoreResult.dailyGoalAwarded, true);
  assert.equal(highScoreResult.totalAwarded, 20 + 10 + 25);
});

test("GET /api/progress requires authentication and returns student progress", async () => {
  const storage = createMockXPStorage();
  const service = createXPService({
    getModel: async () => storage,
    userModel: null,
  });
  const userId = new ObjectId().toString();

  await service.awardConceptCompleted(userId, "photosynthesis");

  const app = express();
  const authMiddleware = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication is required." });
    }
    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, TEST_JWT_SECRET);
      req.user = { id: payload.sub };
      return next();
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token." });
    }
  };

  const mockAchievementsService = {
    checkAchievements: async () => [],
    getUserAchievements: async () => [],
  };

  app.use(
    "/api/progress",
    createProgressRouter({
      authMiddleware,
      progressService: service,
      achievementsService: mockAchievementsService,
    }),
  );

  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api/progress`;

  try {
    // 1. Unauthenticated request rejected with 401
    const unauth = await fetch(baseUrl);
    assert.equal(unauth.status, 401);

    // 2. Authenticated request returns 200 with progress fields
    const token = jwt.sign({ sub: userId }, TEST_JWT_SECRET);
    const authed = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(authed.status, 200);
    const data = await authed.json();
    assert.equal(data.success, true);
    assert.equal(data.totalXP, 10);
    assert.equal(data.todayXP, 10);
    assert.equal(data.currentStreak, 0);
  } finally {
    server.close();
    await once(server, "close");
  }
});

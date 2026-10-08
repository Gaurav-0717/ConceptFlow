import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { test } from "node:test";
import { createAuthMiddleware } from "../src/middleware/auth.js";
import { createLearningRouter } from "../src/routes/learning.routes.js";
import { createProgressRouter } from "../src/routes/progress.routes.js";
import { createProgressControllers } from "../src/controllers/progress.controller.js";
import { createUserLearningHistoryService } from "../src/services/userLearningHistoryService.js";
import { createQuizService } from "../src/services/quizService.js";
import { createXPService, XP_AMOUNTS } from "../src/services/xpService.js";
import { createAchievementService } from "../src/services/achievementService.js";
import { FIXTURE_FLOWCHART } from "../src/fixtures/concept.fixtures.js";
import { createQuizSessionTestStore } from "./quizSessionTestStore.js";

const { ObjectId } = mongoose.Types;
const TEST_JWT_SECRET = "test-secret-key-at-least-32-chars-long-security-suite";

/**
 * In-memory store for LearningHistory documents
 */
const makeHistoryCollection = () => {
  const documents = [];
  const matches = (doc, filter) =>
    (!filter.userId || String(doc.userId) === String(filter.userId)) &&
    (!filter._id || doc._id.equals(filter._id));

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
  };
};

/**
 * In-memory store for XP activity documents
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
          const todayStart = stage.$group.todayXP?.$sum?.$cond?.[0]?.$gte?.[1];
          const todayXP = todayStart
            ? filtered.reduce(
                (sum, d) =>
                  new Date(d.createdAt) >= todayStart
                    ? sum + (d.amount || 0)
                    : sum,
                0,
              )
            : undefined;
          return [{ _id: null, total, totalXP: total, todayXP }];
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
        conceptId: concept?.id,
        percentage: result.percentage,
      });
      return true;
    },
  });

  const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, TEST_JWT_SECRET);
      req.user = { id: payload.sub };
      next();
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/learning",
    createLearningRouter({
      quizzes: quizService,
      historyService,
      authMiddleware,
      optionalAuthMiddleware: (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          try {
            const token = authHeader.split(" ")[1];
            const payload = jwt.verify(token, TEST_JWT_SECRET);
            req.user = { id: payload.sub };
          } catch {}
        }
        next();
      },
    }),
  );

  const progressControllers = createProgressControllers({
    service: xpService,
    achievements: achievementService,
  });
  app.get("/api/progress", authMiddleware, progressControllers.getProgress);

  const signToken = (userId) =>
    jwt.sign({ sub: String(userId) }, TEST_JWT_SECRET, { expiresIn: "1h" });

  return {
    app,
    historyStore,
    xpStore,
    quizStore,
    userModel,
    achievementModel,
    xpService,
    historyService,
    quizService,
    signToken,
  };
};

test("1. Client cannot manufacture completed concepts by sending completed:true to /history", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });

  const server = env.app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = env.signToken(userId);
    // Malicious attempt with disallowed field 'xp' is rejected with 400
    const disallowedRes = await fetch(`${baseUrl}/api/learning/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        concept: FIXTURE_FLOWCHART,
        explanationLevel: "Beginner",
        completed: true,
        xp: 500,
      }),
    });
    assert.equal(disallowedRes.status, 400);

    // Client attempts to claim concept completion and fake quiz score
    const response = await fetch(`${baseUrl}/api/learning/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        concept: FIXTURE_FLOWCHART,
        explanationLevel: "Beginner",
        completed: true,
        quizScore: 5,
        quizTotal: 5,
        quizPercentage: 100,
      }),
    });

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.success, true);

    // Stored activity MUST have completed: false, and no quizScore
    assert.equal(body.activity.completed, false);
    assert.equal(body.activity.quizScore, undefined);

    // Verify progress: conceptsCompleted must still be 0, totalXP must be 0
    const progressRes = await fetch(`${baseUrl}/api/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const progress = await progressRes.json();
    assert.equal(progress.conceptsCompleted, 0);
    assert.equal(progress.quizzesCompleted, 0);
    assert.equal(progress.totalXP, 0);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("2. Client sending quizScore:100 while answering incorrectly does not receive score of 100", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });

  const createdQuiz = await env.quizService.createQuiz(FIXTURE_FLOWCHART, {
    userId,
  });

  const server = env.app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = env.signToken(userId);
    // Intentionally submit all wrong answers (index 1 when correct is 0)
    // along with a forged quizScore: 100
    const allWrongAnswers = Object.fromEntries(
      createdQuiz.quiz.questions.map((q) => [q.id, 1]),
    );

    const submitRes = await fetch(
      `${baseUrl}/api/learning/quiz/${createdQuiz.quizId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: allWrongAnswers,
          quizScore: 100,
        }),
      },
    );

    assert.equal(submitRes.status, 200);
    const data = await submitRes.json();
    // Server must calculate 0, NOT 100
    assert.equal(data.result.score, 0);
    assert.equal(data.result.percentage, 0);
    assert.equal(data.result.total, 5);

    // Check history saved on server
    const historyList = await env.historyService.listActivities(userId);
    assert.equal(historyList.length, 1);
    assert.equal(historyList[0].quizScore, 0);
    assert.equal(historyList[0].quizPercentage, 0);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("3-6. Client cannot forge score, percentage, accuracy, or correctAnswers in quiz submission", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });

  const createdQuiz = await env.quizService.createQuiz(FIXTURE_FLOWCHART, {
    userId,
  });

  const server = env.app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = env.signToken(userId);
    // 2 correct (q1, q2), 3 incorrect (q3, q4, q5)
    const answers = {
      q1: 0, // correct
      q2: 0, // correct
      q3: 1, // wrong
      q4: 1, // wrong
      q5: 1, // wrong
    };

    const submitRes = await fetch(
      `${baseUrl}/api/learning/quiz/${createdQuiz.quizId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers,
          score: 100,
          percentage: 100,
          accuracy: 100,
          correctAnswers: 5,
        }),
      },
    );

    assert.equal(submitRes.status, 200);
    const data = await submitRes.json();
    // True score is 2 out of 5 = 40%
    assert.equal(data.result.score, 2);
    assert.equal(data.result.percentage, 40);
    assert.equal(data.result.total, 5);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("7. Client sending xp:10000 in submit or history is ignored; only server-defined XP is awarded", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });

  const createdQuiz = await env.quizService.createQuiz(FIXTURE_FLOWCHART, {
    userId,
  });

  const server = env.app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = env.signToken(userId);
    const answers = Object.fromEntries(
      createdQuiz.quiz.questions.map((q) => [q.id, 0]),
    );

    const submitRes = await fetch(
      `${baseUrl}/api/learning/quiz/${createdQuiz.quizId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers,
          xp: 10000,
        }),
      },
    );

    assert.equal(submitRes.status, 200);

    const progressRes = await fetch(`${baseUrl}/api/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const progress = await progressRes.json();

    // Valid 100% quiz earns:
    // base quiz: 20 + high score: 10 + concept completed: 10 + daily goal: 25 = 65 XP
    // Client cannot manufacture 10000 XP
    assert.equal(progress.totalXP, 65);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("8. Client sending completed:true repeatedly to /history does not increase conceptsCompleted or award XP", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });

  const server = env.app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = env.signToken(userId);

    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${baseUrl}/api/learning/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          concept: FIXTURE_FLOWCHART,
          explanationLevel: "Beginner",
          completed: true,
        }),
      });
      assert.equal(res.status, 201);
    }

    const progressRes = await fetch(`${baseUrl}/api/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const progress = await progressRes.json();
    assert.equal(progress.conceptsCompleted, 0);
    assert.equal(progress.totalXP, 0);
    assert.equal(env.achievementModel.records.length, 0);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("9. Client submitting the same quiz twice receives 404 on second attempt and no duplicate XP or history", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });

  const createdQuiz = await env.quizService.createQuiz(FIXTURE_FLOWCHART, {
    userId,
  });

  const server = env.app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = env.signToken(userId);
    const answers = Object.fromEntries(
      createdQuiz.quiz.questions.map((q) => [q.id, 0]),
    );

    // First submission
    const firstRes = await fetch(
      `${baseUrl}/api/learning/quiz/${createdQuiz.quizId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      },
    );
    assert.equal(firstRes.status, 200);

    // Second submission of the same quiz
    const secondRes = await fetch(
      `${baseUrl}/api/learning/quiz/${createdQuiz.quizId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      },
    );
    assert.equal(secondRes.status, 404);

    // History and progress must reflect exactly 1 quiz completion
    const history = await env.historyService.listActivities(userId);
    assert.equal(history.length, 1);

    const progressRes = await fetch(`${baseUrl}/api/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const progress = await progressRes.json();
    assert.equal(progress.quizzesCompleted, 1);
    assert.equal(progress.totalXP, 65);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("10. Client cannot alter another user's progress by submitting their quiz session", async () => {
  const userA = new ObjectId().toString();
  const userB = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userA]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
    [userB]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });

  // User A creates a quiz
  const createdQuiz = await env.quizService.createQuiz(FIXTURE_FLOWCHART, {
    userId: userA,
  });

  const server = env.app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const tokenB = env.signToken(userB);
    const answers = Object.fromEntries(
      createdQuiz.quiz.questions.map((q) => [q.id, 0]),
    );

    // User B attempts to submit User A's quiz
    const attackRes = await fetch(
      `${baseUrl}/api/learning/quiz/${createdQuiz.quizId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({ answers }),
      },
    );
    assert.equal(attackRes.status, 404);

    // User A's progress and User B's progress remain untouched
    const progressA = await env.xpService.getProgress(userA);
    const progressB = await env.xpService.getProgress(userB);
    assert.equal(progressA.quizzesCompleted, 0);
    assert.equal(progressA.totalXP, 0);
    assert.equal(progressB.quizzesCompleted, 0);
    assert.equal(progressB.totalXP, 0);

    // Quiz session still exists for User A to submit
    const tokenA = env.signToken(userA);
    const legitRes = await fetch(
      `${baseUrl}/api/learning/quiz/${createdQuiz.quizId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ answers }),
      },
    );
    assert.equal(legitRes.status, 200);

    const progressAAfter = await env.xpService.getProgress(userA);
    assert.equal(progressAAfter.quizzesCompleted, 1);
    assert.equal(progressAAfter.totalXP, 65);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("11. Invalid/forged quiz results do not increase XP with high-score bonus", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });

  const createdQuiz = await env.quizService.createQuiz(FIXTURE_FLOWCHART, {
    userId,
  });

  const server = env.app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = env.signToken(userId);
    // 0 out of 5 correct, but malicious client sends quizScore: 100, percentage: 100
    const answers = Object.fromEntries(
      createdQuiz.quiz.questions.map((q) => [q.id, 1]),
    );

    const res = await fetch(
      `${baseUrl}/api/learning/quiz/${createdQuiz.quizId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers,
          quizScore: 100,
          percentage: 100,
        }),
      },
    );
    assert.equal(res.status, 200);

    const progressRes = await fetch(`${baseUrl}/api/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const progress = await progressRes.json();

    // 0% score receives base quiz XP (20) and concept completed (10) and daily goal (25), but NO high score bonus (10)
    assert.equal(progress.totalXP, 55);
    assert.equal(progress.quizAccuracy, 0);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("12. Valid quiz submission produces correct server-calculated score and full XP", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });

  const createdQuiz = await env.quizService.createQuiz(FIXTURE_FLOWCHART, {
    userId,
  });

  const server = env.app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = env.signToken(userId);
    // 4 out of 5 correct = 80% (qualifies for high_quiz_score bonus)
    const answers = {
      q1: 0,
      q2: 0,
      q3: 0,
      q4: 0,
      q5: 1, // wrong
    };

    const res = await fetch(
      `${baseUrl}/api/learning/quiz/${createdQuiz.quizId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      },
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.result.score, 4);
    assert.equal(body.result.percentage, 80);

    const progressRes = await fetch(`${baseUrl}/api/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const progress = await progressRes.json();
    assert.equal(progress.conceptsCompleted, 1);
    assert.equal(progress.quizzesCompleted, 1);
    assert.equal(progress.quizAccuracy, 80);
    assert.equal(progress.totalXP, 65); // 20 base + 10 high score + 10 concept + 25 daily goal
    const achievementIds = env.achievementModel.records.map(
      (record) => record.achievementId,
    );
    assert.ok(achievementIds.includes("first_concept"));
    assert.ok(achievementIds.includes("first_quiz"));
    assert.ok(
      progress.achievements.every(
        (achievement) =>
          Object.keys(achievement).sort().join(",") ===
          "achievementId,unlockedAt",
      ),
    );
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("13. Streak updates follow verified activity; forged requests do not update streak", async () => {
  const userId = new ObjectId().toString();
  const env = setupTestEnvironment({
    [userId]: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });

  const server = env.app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = env.signToken(userId);

    // Attempt 1: Forged history submission claiming completed: true
    await fetch(`${baseUrl}/api/learning/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        concept: FIXTURE_FLOWCHART,
        explanationLevel: "Intermediate",
        completed: true,
      }),
    });

    let userDoc = env.userModel.users.get(userId);
    assert.equal(userDoc.currentStreak, 0);
    assert.equal(userDoc.longestStreak, 0);

    // Attempt 2: Legitimate quiz completion
    const createdQuiz = await env.quizService.createQuiz(FIXTURE_FLOWCHART, {
      userId,
    });
    const answers = Object.fromEntries(
      createdQuiz.quiz.questions.map((q) => [q.id, 0]),
    );

    const submitRes = await fetch(
      `${baseUrl}/api/learning/quiz/${createdQuiz.quizId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      },
    );
    assert.equal(submitRes.status, 200);

    userDoc = env.userModel.users.get(userId);
    assert.equal(userDoc.currentStreak, 1);
    assert.equal(userDoc.longestStreak, 1);
  } finally {
    server.close();
    await once(server, "close");
  }
});

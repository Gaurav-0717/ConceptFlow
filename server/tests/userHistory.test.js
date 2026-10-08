import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;
import { test } from "node:test";
import { createAuthMiddleware } from "../src/middleware/auth.js";
import { createLearningRouter } from "../src/routes/learning.routes.js";
import { createAuthService } from "../src/services/authService.js";
import { createUserLearningHistoryService } from "../src/services/userLearningHistoryService.js";
import { createQuizService } from "../src/services/quizService.js";
import { learningActivityRequestSchema } from "../src/validation/learningHistory.schema.js";
import { FIXTURE_FLOWCHART } from "../src/fixtures/concept.fixtures.js";
import { createQuizSessionTestStore } from "./quizSessionTestStore.js";

const makeCollection = () => {
  const documents = [];
  const matches = (document, filter) =>
    (!filter.userId || String(document.userId) === String(filter.userId)) &&
    (!filter.migrationKey || document.migrationKey === filter.migrationKey) &&
    (!filter._id || document._id.equals(filter._id));
  return {
    documents,
    insertOne: async (document) => {
      const insertedId = new ObjectId();
      documents.push({ ...document, _id: insertedId });
      return { insertedId };
    },
    find: (filter) => {
      let selected = documents.filter((document) => matches(document, filter));
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
      documents.find((document) => matches(document, filter)) || null,
    deleteOne: async (filter) => {
      const index = documents.findIndex((document) =>
        matches(document, filter),
      );
      if (index < 0) return { deletedCount: 0 };
      documents.splice(index, 1);
      return { deletedCount: 1 };
    },
    updateOne: async (filter, update) => {
      const existing = documents.find((document) => matches(document, filter));
      if (existing) return { upsertedCount: 0 };
      documents.push({ ...update.$setOnInsert, _id: new ObjectId() });
      return { upsertedCount: 1 };
    },
  };
};

const activity = {
  concept: FIXTURE_FLOWCHART,
  explanationLevel: "Beginner",
  completed: true,
  quizScore: 4,
  quizTotal: 5,
  quizPercentage: 80,
};

test("history storage rejects client userId and inconsistent quiz scores", () => {
  assert.equal(
    learningActivityRequestSchema.safeParse({ ...activity, userId: "attacker" })
      .success,
    false,
  );
  assert.equal(
    learningActivityRequestSchema.safeParse({ ...activity, quizTotal: 3 })
      .success,
    false,
  );
});

test("activity creation, retrieval, and deletion are scoped to the supplied user ID", async () => {
  const collection = makeCollection();
  const service = createUserLearningHistoryService({
    getCollection: async () => collection,
  });
  const userA = new ObjectId().toString();
  const userB = new ObjectId().toString();
  const created = await service.createActivity(userA, activity);

  assert.equal(created.title, FIXTURE_FLOWCHART.title);
  assert.equal(created.quizScore, 4);
  assert.equal(created.source, undefined);
  assert.equal((await service.listActivities(userA)).length, 1);
  assert.equal((await service.listActivities(userB)).length, 0);
  assert.equal(await service.getActivity(userB, created.id), null);
  assert.equal(await service.deleteActivity(userB, created.id), false);
  assert.equal((await service.getActivity(userA, created.id)).id, created.id);
  assert.equal(await service.deleteActivity(userA, created.id), true);
});

test("local-history migration is owner-scoped and idempotent", async () => {
  const collection = makeCollection();
  const service = createUserLearningHistoryService({
    getCollection: async () => collection,
  });
  const userA = new ObjectId().toString();
  const userB = new ObjectId().toString();
  const items = [
    {
      migrationKey: "photosynthesis:access-1",
      concept: FIXTURE_FLOWCHART,
      explanationLevel: "Intermediate",
      source: "sample",
      createdAt: "2026-10-01T10:00:00.000Z",
      lastAccessedAt: "2026-10-01T11:00:00.000Z",
      latestQuizScore: { score: 3, total: 5, percentage: 60 },
    },
  ];

  assert.deepEqual(await service.migrateActivities(userA, items), {
    migrated: 1,
    skipped: 0,
  });
  assert.deepEqual(await service.migrateActivities(userA, items), {
    migrated: 0,
    skipped: 0,
  });
  assert.deepEqual(await service.listActivities(userB), []);
  assert.equal((await service.listActivities(userA))[0].quizPercentage, 60);
});

test("history storage outage fails safely and does not create cross-user records", async () => {
  const service = createUserLearningHistoryService({
    getCollection: async () => null,
  });
  const userId = new ObjectId().toString();
  await assert.rejects(
    service.createActivity(userId, activity),
    (error) => error.statusCode === 503,
  );
  await assert.rejects(
    service.listActivities(userId),
    (error) => error.statusCode === 503,
  );
});

test("history HTTP routes use authenticated req.user and prevent cross-account access", async () => {
  const collection = makeCollection();
  const service = createUserLearningHistoryService({
    getCollection: async () => collection,
  });
  const userA = new ObjectId().toString();
  const userB = new ObjectId().toString();
  const secret =
    "history-route-test-secret-with-more-than-thirty-two-characters";
  const authService = createAuthService({ jwtSecret: secret });
  const authMiddleware = createAuthMiddleware({ service: authService });
  const tokenA = jwt.sign({ sub: userA }, secret, { expiresIn: "1h" });
  const tokenB = jwt.sign({ sub: userB }, secret, { expiresIn: "1h" });
  const app = express();
  app.use(express.json());
  app.use(
    "/api/learning",
    createLearningRouter({ historyService: service, authMiddleware }),
  );
  const server = app.listen(0);
  await once(server, "listening");

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/learning/history`;
    const request = async (method, path = "", body, token) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.json() };
    };

    assert.equal((await request("GET")).status, 401);
    const forged = await request(
      "POST",
      "",
      { ...activity, userId: userB },
      tokenA,
    );
    assert.equal(forged.status, 400);
    const created = await request("POST", "", activity, tokenA);
    assert.equal(created.status, 201);
    assert.equal(
      (await request("GET", "", undefined, tokenB)).body.history.length,
      0,
    );
    assert.equal(
      (await request("GET", `/${created.body.activity.id}`, undefined, tokenB))
        .status,
      404,
    );
    assert.equal(
      (
        await request(
          "DELETE",
          `/${created.body.activity.id}`,
          undefined,
          tokenB,
        )
      ).status,
      404,
    );
    const ownerGet = await request(
      "GET",
      `/${created.body.activity.id}`,
      undefined,
      tokenA,
    );
    assert.equal(ownerGet.status, 200);
    assert.equal(ownerGet.body.activity.id, created.body.activity.id);
    assert.equal(
      (await request("GET", "", undefined, tokenA)).body.history.length,
      1,
    );
    assert.equal(
      (
        await request(
          "DELETE",
          `/${created.body.activity.id}`,
          undefined,
          tokenA,
        )
      ).status,
      200,
    );
    assert.equal(
      (await request("GET", "", undefined, tokenA)).body.history.length,
      0,
    );
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("authenticated quiz completion persists score without exposing answers before submit", async () => {
  const collection = makeCollection();
  const historyService = createUserLearningHistoryService({
    getCollection: async () => collection,
  });
  const userA = new ObjectId().toString();
  const userB = new ObjectId().toString();
  const quizSessionStore = createQuizSessionTestStore();
  const quiz = {
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: `q${index + 1}`,
      question: `Question ${index + 1}?`,
      options: ["A", "B", "C", "D"],
      correctAnswerIndex: 0,
      explanation: "Because A is correct.",
    })),
  };
  const quizzes = createQuizService({
    getCollection: async () => quizSessionStore.collection,
    contentService: {
      generateQuiz: async () => ({ source: "fallback", quiz }),
    },
    idFactory: () => "owned-quiz",
    onCompleted: async ({ userId, concept, result, source }) => {
      await historyService.saveQuizResult({
        userId,
        concept,
        source,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
      });
      return true;
    },
  });

  const created = await quizzes.createQuiz(FIXTURE_FLOWCHART, {
    userId: userA,
  });
  assert.equal(
    created.quiz.questions.every(
      (question) =>
        !("correctAnswerIndex" in question) && !("explanation" in question),
    ),
    true,
  );
  const answers = Object.fromEntries(
    created.quiz.questions.map((question) => [question.id, 0]),
  );
  await assert.rejects(
    quizzes.submitQuiz(created.quizId, answers, { userId: userB }),
    (error) => error.statusCode === 404,
  );
  const submitted = await quizzes.submitQuiz(created.quizId, answers, {
    userId: userA,
  });
  assert.equal(submitted.historySaved, true);
  assert.equal(submitted.score, 5);
  assert.equal(submitted.total, 5);
  assert.equal(submitted.percentage, 100);
  assert.equal((await historyService.listActivities(userA)).length, 1);
  assert.equal((await historyService.listActivities(userB)).length, 0);
  await assert.rejects(
    quizzes.submitQuiz(created.quizId, answers, { userId: userA }),
    (error) => error.statusCode === 404,
  );
});

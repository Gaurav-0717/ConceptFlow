import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { test } from "node:test";
import {
  createLeaderboardService,
  LeaderboardServiceError,
  getPeriodStart,
  VALID_PERIODS,
} from "../src/services/leaderboardService.js";
import { createLeaderboardControllers } from "../src/controllers/leaderboard.controller.js";

const { ObjectId } = mongoose.Types;
const TEST_JWT_SECRET =
  "test-only-jwt-secret-with-more-than-thirty-two-characters";

// ---------------------------------------------------------------------------
// Inline auth middleware (matches pattern in progress.test.js)
// ---------------------------------------------------------------------------
const makeAuthMiddleware = () => (req, res, next) => {
  const header = req.get("authorization") || "";
  const match = /^Bearer\s+([A-Za-z0-9._~-]+)$/i.exec(header);
  const token = match?.[1] || null;
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Authentication required." });
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

// ---------------------------------------------------------------------------
// Mock user registry shared with mock aggregate
// ---------------------------------------------------------------------------
const mockUsers = new Map();
const addUser = (id, name) => {
  mockUsers.set(String(id), { name });
  return id;
};
const clearUsers = () => mockUsers.clear();

// ---------------------------------------------------------------------------
// Mock XP storage with aggregate support for leaderboard queries
// ---------------------------------------------------------------------------
const createMockLeaderboardStorage = (initialDocs = []) => {
  const documents = [...initialDocs];
  return {
    documents,
    findOne: async () => null,
    create: async (doc) => {
      const record = { _id: new ObjectId(), ...doc };
      documents.push(record);
      return record;
    },
    /**
     * Minimal aggregate supporting leaderboard pipeline stages:
     * $match → $group → $sort → $setWindowFields → $facet → $limit →
     * $lookup → $unwind → $project
     */
    aggregate: async (pipeline) => runPipeline([...documents], pipeline),
  };
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const runPipeline = (inputDocs, pipeline) => {
  let docs = [...inputDocs];

  for (const stage of pipeline) {
    if (stage.$match) {
      docs = docs.filter((d) => {
        if (stage.$match.createdAt?.$gte) {
          if (new Date(d.createdAt) < stage.$match.createdAt.$gte) return false;
        }
        if (stage.$match._id !== undefined) {
          if (String(d._id) !== String(stage.$match._id)) return false;
        }
        if (stage.$match.userId !== undefined) {
          if (String(d.userId) !== String(stage.$match.userId)) return false;
        }
        return true;
      });
      continue;
    }

    if (stage.$group) {
      const map = new Map();
      for (const d of docs) {
        const key = String(d.userId);
        map.set(key, (map.get(key) || 0) + (d.amount || 0));
      }
      docs = Array.from(map.entries()).map(([uid, xp]) => ({
        _id: uid,
        userId: uid,
        xp,
      }));
      continue;
    }

    if (stage.$sort) {
      const entries = Object.entries(stage.$sort);
      docs = [...docs].sort((a, b) => {
        for (const [key, dir] of entries) {
          const av = a[key] ?? 0;
          const bv = b[key] ?? 0;
          if (av !== bv) return dir === -1 ? bv - av : av - bv;
        }
        return String(a._id ?? a.userId) < String(b._id ?? b.userId) ? -1 : 1;
      });
      continue;
    }

    if (stage.$setWindowFields) {
      let currentRank = 1;
      docs = docs.map((d, i) => {
        if (i > 0 && d.xp < docs[i - 1].xp) currentRank = i + 1;
        return { ...d, rank: currentRank };
      });
      continue;
    }

    if (stage.$facet) {
      const faceted = {};
      for (const [key, subPipeline] of Object.entries(stage.$facet)) {
        faceted[key] = runPipeline(docs, subPipeline);
      }
      docs = [faceted];
      continue;
    }

    if (stage.$limit) {
      docs = docs.slice(0, stage.$limit);
      continue;
    }

    if (stage.$lookup) {
      docs = docs.map((d) => {
        const uid = String(d.userId || d._id);
        const user = mockUsers.get(uid);
        return { ...d, user: user ? [user] : [] };
      });
      continue;
    }

    if (stage.$unwind) {
      const field =
        typeof stage.$unwind === "string"
          ? stage.$unwind.replace("$", "")
          : String(stage.$unwind.path || "").replace("$", "");
      docs = docs.flatMap((d) => {
        if (!d[field] || d[field].length === 0) return [];
        return d[field].map((u) => ({ ...d, [field]: u }));
      });
      continue;
    }

    if (stage.$project) {
      docs = docs.map((d) => {
        const out = {};
        for (const [k, expr] of Object.entries(stage.$project)) {
          if (expr === 0) continue;
          if (typeof expr === "string" && expr.startsWith("$")) {
            const path = expr.slice(1).split(".");
            let val = d;
            for (const p of path) val = val?.[p];
            out[k] = val;
          } else if (expr === 1 || expr === true) {
            out[k] = d[k];
          }
        }
        return out;
      });
      continue;
    }
  }

  return docs;
};

const makeService = (documents = []) => {
  const storage = createMockLeaderboardStorage(documents);
  return {
    service: createLeaderboardService({ getModel: async () => storage }),
    storage,
  };
};

// ---------------------------------------------------------------------------
// UNIT TESTS
// ---------------------------------------------------------------------------

test("getPeriodStart returns null for all-time", () => {
  assert.equal(getPeriodStart("all-time"), null);
});

test("getPeriodStart returns start of current ISO week (Monday UTC) for weekly", () => {
  // 2026-10-07 is a Wednesday → week starts Monday 2026-10-05
  const ref = new Date("2026-10-07T14:00:00.000Z");
  const start = getPeriodStart("weekly", ref);
  assert.equal(start.toISOString().slice(0, 10), "2026-10-05");
});

test("getPeriodStart returns start of current month for monthly", () => {
  const ref = new Date("2026-10-15T12:00:00.000Z");
  const start = getPeriodStart("monthly", ref);
  assert.equal(start.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("VALID_PERIODS contains weekly, monthly, all-time", () => {
  assert.deepEqual([...VALID_PERIODS].sort(), ["all-time", "monthly", "weekly"]);
});

test("getLeaderboard rejects invalid period with 400 error", async () => {
  clearUsers();
  const uid = addUser(new ObjectId(), "Alice");
  const { service } = makeService();

  await assert.rejects(
    () => service.getLeaderboard(String(uid), "yearly"),
    (err) => {
      assert.ok(err instanceof LeaderboardServiceError);
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes("Invalid period"));
      return true;
    },
  );
});

test("getLeaderboard rejects invalid userId with 400 error", async () => {
  clearUsers();
  const { service } = makeService();

  await assert.rejects(
    () => service.getLeaderboard("not-an-objectid", "all-time"),
    (err) => {
      assert.ok(err instanceof LeaderboardServiceError);
      assert.equal(err.statusCode, 400);
      return true;
    },
  );
});

test("all-time ranking: orders entries by total XP descending", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const bobId   = addUser(new ObjectId(), "Bob");
  const carolId = addUser(new ObjectId(), "Carol");
  const now = new Date();

  const { service } = makeService([
    { userId: aliceId, amount: 50, reason: "quiz_completed", createdAt: now },
    { userId: bobId,   amount: 80, reason: "quiz_completed", createdAt: now },
    { userId: carolId, amount: 30, reason: "quiz_completed", createdAt: now },
  ]);

  const result = await service.getLeaderboard(String(aliceId), "all-time", 10);

  assert.equal(result.leaderboard.length, 3);
  assert.equal(result.leaderboard[0].displayName, "Bob");
  assert.equal(result.leaderboard[0].xp, 80);
  assert.equal(result.leaderboard[0].rank, 1);
  assert.equal(result.leaderboard[1].displayName, "Alice");
  assert.equal(result.leaderboard[1].xp, 50);
  assert.equal(result.leaderboard[1].rank, 2);
  assert.equal(result.leaderboard[2].displayName, "Carol");
  assert.equal(result.leaderboard[2].xp, 30);
  assert.equal(result.leaderboard[2].rank, 3);
});

test("weekly ranking: excludes XP earned before current Monday", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const bobId   = addUser(new ObjectId(), "Bob");

  // Reference: Wednesday 2026-10-07 → week starts Monday 2026-10-05
  const ref      = new Date("2026-10-07T12:00:00.000Z");
  const lastWeek = new Date("2026-10-04T23:59:59.000Z"); // Sunday before

  const { service } = makeService([
    // This week
    { userId: aliceId, amount: 40, reason: "quiz_completed", createdAt: new Date("2026-10-06T10:00:00.000Z") },
    { userId: bobId,   amount: 20, reason: "quiz_completed", createdAt: new Date("2026-10-07T08:00:00.000Z") },
    // Last week — must NOT count
    { userId: aliceId, amount: 999, reason: "quiz_completed", createdAt: lastWeek },
    { userId: bobId,   amount: 999, reason: "quiz_completed", createdAt: lastWeek },
  ]);

  const result = await service.getLeaderboard(String(aliceId), "weekly", 10, ref);

  assert.equal(result.leaderboard.length, 2);
  assert.equal(result.leaderboard[0].displayName, "Alice");
  assert.equal(result.leaderboard[0].xp, 40);
  assert.equal(result.leaderboard[1].displayName, "Bob");
  assert.equal(result.leaderboard[1].xp, 20);
});

test("monthly ranking: excludes XP earned before the 1st of current month", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const bobId   = addUser(new ObjectId(), "Bob");

  const ref       = new Date("2026-10-15T12:00:00.000Z");
  const lastMonth = new Date("2026-09-30T23:59:59.000Z");

  const { service } = makeService([
    // This month
    { userId: aliceId, amount: 60, reason: "quiz_completed", createdAt: new Date("2026-10-10T10:00:00.000Z") },
    { userId: bobId,   amount: 30, reason: "quiz_completed", createdAt: new Date("2026-10-12T08:00:00.000Z") },
    // Last month — must NOT count
    { userId: bobId,   amount: 999, reason: "quiz_completed", createdAt: lastMonth },
  ]);

  const result = await service.getLeaderboard(String(aliceId), "monthly", 10, ref);

  assert.equal(result.leaderboard.length, 2);
  assert.equal(result.leaderboard[0].displayName, "Alice");
  assert.equal(result.leaderboard[0].xp, 60);
  assert.equal(result.leaderboard[1].displayName, "Bob");
  assert.equal(result.leaderboard[1].xp, 30);
});

test("currentUser rank is returned even when outside top 10", async () => {
  clearUsers();
  // 11 top users + Dave (rank 12)
  const topIds = Array.from({ length: 11 }, (_, i) =>
    addUser(new ObjectId(), `TopUser${i + 1}`),
  );
  const daveId = addUser(new ObjectId(), "Dave");
  const now = new Date();

  const { service } = makeService([
    ...topIds.map((uid) => ({
      userId: uid,
      amount: 100,
      reason: "quiz_completed",
      createdAt: now,
    })),
    { userId: daveId, amount: 5, reason: "concept_completed", createdAt: now },
  ]);

  const result = await service.getLeaderboard(String(daveId), "all-time", 10);

  assert.equal(result.leaderboard.length, 10);
  assert.ok(result.leaderboard.every((e) => e.xp === 100));

  assert.ok(result.currentUser !== null);
  assert.equal(result.currentUser.displayName, "Dave");
  assert.equal(result.currentUser.xp, 5);
  assert.ok(result.currentUser.rank > 10, "Dave's rank should be outside top 10");
});

test("tied users share the same rank (dense ranking)", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const bobId   = addUser(new ObjectId(), "Bob");
  const carolId = addUser(new ObjectId(), "Carol");
  const now = new Date();

  const { service } = makeService([
    { userId: aliceId, amount: 50, reason: "quiz_completed", createdAt: now },
    { userId: bobId,   amount: 50, reason: "quiz_completed", createdAt: now },
    { userId: carolId, amount: 20, reason: "quiz_completed", createdAt: now },
  ]);

  const result = await service.getLeaderboard(String(carolId), "all-time", 10);

  const topTwo = result.leaderboard.slice(0, 2);
  assert.ok(topTwo.every((e) => e.rank === 1), "Tied users should both have rank 1");
  assert.equal(result.leaderboard[2].rank, 3);
  assert.equal(result.leaderboard[2].displayName, "Carol");
});

test("user privacy: leaderboard entries expose ONLY rank, displayName, and xp", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const now = new Date();

  const { service } = makeService([
    { userId: aliceId, amount: 50, reason: "quiz_completed", createdAt: now },
  ]);

  const result = await service.getLeaderboard(String(aliceId), "all-time", 10);

  for (const entry of result.leaderboard) {
    assert.ok(!("email" in entry), "email must NOT appear");
    assert.ok(!("passwordHash" in entry), "passwordHash must NOT appear");
    assert.ok(!("userId" in entry), "userId must NOT appear");
    assert.ok(!("_id" in entry), "_id must NOT appear");
    assert.ok("displayName" in entry, "displayName must be present");
    assert.ok("xp" in entry, "xp must be present");
    assert.ok("rank" in entry, "rank must be present");
    assert.equal(Object.keys(entry).length, 3, "Only 3 keys allowed");
  }
});

test("user isolation: currentUser reflects caller only, not another user", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const bobId   = addUser(new ObjectId(), "Bob");
  const now = new Date();

  const docs = [
    { userId: aliceId, amount: 80, reason: "quiz_completed", createdAt: now },
    { userId: bobId,   amount: 40, reason: "quiz_completed", createdAt: now },
  ];

  const { service: svc1 } = makeService(docs);
  const aliceResult = await svc1.getLeaderboard(String(aliceId), "all-time", 10);
  assert.equal(aliceResult.currentUser?.displayName, "Alice");
  assert.equal(aliceResult.currentUser?.xp, 80);

  const { service: svc2 } = makeService(docs);
  const bobResult = await svc2.getLeaderboard(String(bobId), "all-time", 10);
  assert.equal(bobResult.currentUser?.displayName, "Bob");
  assert.equal(bobResult.currentUser?.xp, 40);
});

// ---------------------------------------------------------------------------
// HTTP INTEGRATION TESTS
// ---------------------------------------------------------------------------

const startTestServer = (service) => {
  const app = express();
  app.use(express.json());

  // Inline JWT auth (matches progress.test.js pattern)
  const authMiddleware = (req, res, next) => {
    const header = req.get("authorization") || "";
    const match = /^Bearer\s+([A-Za-z0-9._~-]+)$/i.exec(header);
    const token = match?.[1] || null;
    if (!token)
      return res.status(401).json({ success: false, message: "Auth required." });
    try {
      const payload = jwt.verify(token, TEST_JWT_SECRET);
      req.user = { id: payload.sub };
      return next();
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token." });
    }
  };

  const controllers = createLeaderboardControllers({ service });
  app.get("/api/leaderboard", authMiddleware, controllers.getLeaderboard);
  return app;
};

test("HTTP: returns 200 with correct shape for all valid periods", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const now = new Date();
  const { service } = makeService([
    { userId: aliceId, amount: 50, reason: "quiz_completed", createdAt: now },
  ]);

  const server = startTestServer(service).listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const token = jwt.sign({ sub: String(aliceId) }, TEST_JWT_SECRET);

  try {
    for (const period of ["all-time", "weekly", "monthly"]) {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/leaderboard?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      assert.equal(res.status, 200, `period=${period} should return 200`);
      const data = await res.json();
      assert.equal(data.success, true, `period=${period} success`);
      assert.equal(data.period, period);
      assert.ok(Array.isArray(data.leaderboard), "leaderboard must be array");
      assert.ok("currentUser" in data, "currentUser must be present");
    }
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("HTTP: returns 400 for invalid period query param", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const { service } = makeService([]);

  const server = startTestServer(service).listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const token = jwt.sign({ sub: String(aliceId) }, TEST_JWT_SECRET);

  try {
    const res = await fetch(
      `http://127.0.0.1:${port}/api/leaderboard?period=yearly`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(typeof data.message === "string");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("HTTP: returns 401 when no auth token provided", async () => {
  clearUsers();
  const { service } = makeService([]);

  const server = startTestServer(service).listen(0);
  await once(server, "listening");
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/leaderboard`);
    assert.ok(
      res.status === 401 || res.status === 403,
      `Expected 401/403, got ${res.status}`,
    );
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("currentUser rank is returned when inside top 10", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const bobId = addUser(new ObjectId(), "Bob");
  const carolId = addUser(new ObjectId(), "Carol");
  const now = new Date();

  const { service } = makeService([
    { userId: aliceId, amount: 50, reason: "quiz_completed", createdAt: now },
    { userId: bobId, amount: 80, reason: "quiz_completed", createdAt: now },
    { userId: carolId, amount: 30, reason: "quiz_completed", createdAt: now },
  ]);

  const result = await service.getLeaderboard(String(aliceId), "all-time", 10);

  assert.equal(result.currentUser.displayName, "Alice");
  assert.equal(result.currentUser.xp, 50);
  assert.equal(result.currentUser.rank, 2);
  assert.equal(result.leaderboard[1].displayName, "Alice");
});

test("HTTP: never returns email, password, quiz answers, or private history", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const now = new Date();
  const { service } = makeService([
    { userId: aliceId, amount: 50, reason: "quiz_completed", createdAt: now },
  ]);

  const server = startTestServer(service).listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const token = jwt.sign({ sub: String(aliceId) }, TEST_JWT_SECRET);

  try {
    const res = await fetch(
      `http://127.0.0.1:${port}/api/leaderboard?period=all-time`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    assert.equal(res.status, 200);
    const body = await res.text();
    const forbidden = [
      "email",
      "password",
      "passwordHash",
      "quizAnswers",
      "answers",
      "learningHistory",
      "conceptsStudied",
      "explanations",
    ];
    const lower = body.toLowerCase();
    for (const key of forbidden) {
      assert.ok(!lower.includes(key.toLowerCase()), `${key} must not appear`);
    }

    const data = JSON.parse(body);
    const entries = [...data.leaderboard, data.currentUser].filter(Boolean);
    for (const entry of entries) {
      assert.deepEqual(Object.keys(entry).sort(), [
        "displayName",
        "rank",
        "xp",
      ]);
    }
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("HTTP: query userId does not change the authenticated user's rank", async () => {
  clearUsers();
  const aliceId = addUser(new ObjectId(), "Alice");
  const bobId = addUser(new ObjectId(), "Bob");
  const now = new Date();
  const { service } = makeService([
    { userId: aliceId, amount: 80, reason: "quiz_completed", createdAt: now },
    { userId: bobId, amount: 40, reason: "quiz_completed", createdAt: now },
  ]);

  const server = startTestServer(service).listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const token = jwt.sign({ sub: String(aliceId) }, TEST_JWT_SECRET);

  try {
    const res = await fetch(
      `http://127.0.0.1:${port}/api/leaderboard?period=all-time&userId=${bobId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.currentUser.displayName, "Alice");
    assert.equal(data.currentUser.xp, 80);
    assert.notEqual(data.currentUser.displayName, "Bob");
  } finally {
    server.close();
    await once(server, "close");
  }
});

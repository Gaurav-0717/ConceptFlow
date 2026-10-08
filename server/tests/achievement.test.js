import assert from "node:assert/strict";
import mongoose from "mongoose";
import { test } from "node:test";
import {
  ACHIEVEMENT_RULES,
  createAchievementService,
} from "../src/services/achievementService.js";
import { ACHIEVEMENT_TYPES } from "../src/models/UserAchievement.js";
import { createXPService } from "../src/services/xpService.js";

const { ObjectId } = mongoose.Types;

// ---------------------------------------------------------------------------
// Mocks (no live MongoDB required)
// ---------------------------------------------------------------------------

const ZERO_PROGRESS = Object.freeze({
  totalXP: 0,
  conceptsCompleted: 0,
  quizzesCompleted: 0,
  quizAccuracy: 0,
  currentStreak: 0,
  longestStreak: 0,
  todayXP: 0,
});

const createMockProgressService = (progressByUser = {}) => {
  const calls = [];
  return {
    calls,
    getProgress: async (userId) => {
      calls.push(String(userId));
      return { ...ZERO_PROGRESS, ...(progressByUser[String(userId)] || {}) };
    },
  };
};

/**
 * Mimics the UserAchievement model: enum validation on achievementId and
 * the unique { userId, achievementId } index (duplicate key -> code 11000).
 */
const createMockAchievementModel = ({
  seed = [],
  beforeFind,
  createError,
} = {}) => {
  const records = seed.map((record) => ({ ...record }));
  const createAttempts = [];
  return {
    records,
    createAttempts,
    find: (filter) => ({
      lean: async () => {
        await beforeFind?.();
        return records
          .filter((record) => String(record.userId) === String(filter.userId))
          .map((record) => ({ ...record }));
      },
    }),
    create: async (doc) => {
      createAttempts.push(doc.achievementId);
      const injected = createError?.(doc);
      if (injected) throw injected;
      if (!ACHIEVEMENT_TYPES.includes(doc.achievementId)) {
        const error = new Error("Validation failed: achievementId");
        error.name = "ValidationError";
        throw error;
      }
      if (
        records.some(
          (record) =>
            String(record.userId) === String(doc.userId) &&
            record.achievementId === doc.achievementId,
        )
      ) {
        const error = new Error("E11000 duplicate key error");
        error.code = 11000;
        throw error;
      }
      const record = { _id: new ObjectId(), unlockedAt: new Date(), ...doc };
      records.push(record);
      return record;
    },
  };
};

const idsFor = (records, userId) =>
  records
    .filter((record) => String(record.userId) === String(userId))
    .map((record) => record.achievementId)
    .sort();

const runCheck = async (progress) => {
  const userId = new ObjectId().toString();
  const achievementModel = createMockAchievementModel();
  const service = createAchievementService({
    achievementModel,
    progressService: createMockProgressService({ [userId]: progress }),
  });
  const unlocked = await service.checkAchievements(userId);
  return { unlocked, achievementModel, userId };
};

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

test("every achievement type has exactly one centralized rule", () => {
  assert.deepEqual(
    Object.keys(ACHIEVEMENT_RULES).sort(),
    [...ACHIEVEMENT_TYPES].sort(),
  );
  for (const rule of Object.values(ACHIEVEMENT_RULES)) {
    assert.equal(typeof rule, "function");
    assert.equal(rule({ ...ZERO_PROGRESS }), false);
  }
});

const THRESHOLDS = [
  { id: "first_concept", field: "conceptsCompleted", unlockAt: 1 },
  { id: "first_quiz", field: "quizzesCompleted", unlockAt: 1 },
  { id: "quiz_master", field: "quizzesCompleted", unlockAt: 5 },
  { id: "streak_3", field: "currentStreak", unlockAt: 3 },
  { id: "streak_7", field: "currentStreak", unlockAt: 7 },
  { id: "xp_100", field: "totalXP", unlockAt: 100 },
  { id: "xp_500", field: "totalXP", unlockAt: 500 },
];

for (const { id, field, unlockAt } of THRESHOLDS) {
  test(`${id} unlocks at ${field} = ${unlockAt}`, async () => {
    assert.equal(
      ACHIEVEMENT_RULES[id]({ ...ZERO_PROGRESS, [field]: unlockAt }),
      true,
    );
    const { unlocked, achievementModel, userId } = await runCheck({
      [field]: unlockAt,
    });
    assert.ok(unlocked.includes(id), `${id} should unlock`);
    assert.ok(idsFor(achievementModel.records, userId).includes(id));
  });

  test(`${id} does not unlock at ${field} = ${unlockAt - 1}`, async () => {
    assert.equal(
      ACHIEVEMENT_RULES[id]({ ...ZERO_PROGRESS, [field]: unlockAt - 1 }),
      false,
    );
    const { unlocked, achievementModel, userId } = await runCheck({
      [field]: unlockAt - 1,
    });
    assert.equal(unlocked.includes(id), false, `${id} should stay locked`);
    assert.equal(idsFor(achievementModel.records, userId).includes(id), false);
  });
}

test("each rule depends only on its own metric", async () => {
  // A single field at threshold unlocks only the rules that read that field.
  const { unlocked: quizOnly } = await runCheck({ quizzesCompleted: 5 });
  assert.deepEqual(quizOnly.sort(), ["first_quiz", "quiz_master"]);

  const { unlocked: streakOnly } = await runCheck({ currentStreak: 7 });
  assert.deepEqual(streakOnly.sort(), ["streak_3", "streak_7"]);

  const { unlocked: xpOnly } = await runCheck({ totalXP: 500 });
  assert.deepEqual(xpOnly.sort(), ["xp_100", "xp_500"]);

  const { unlocked: conceptOnly } = await runCheck({ conceptsCompleted: 1 });
  assert.deepEqual(conceptOnly, ["first_concept"]);

  const { unlocked: none } = await runCheck({});
  assert.deepEqual(none, []);
});

test("invalid user IDs never query progress or create achievements", async () => {
  const achievementModel = createMockAchievementModel();
  const progressService = createMockProgressService();
  const service = createAchievementService({
    achievementModel,
    progressService,
  });
  assert.deepEqual(await service.checkAchievements("not-an-object-id"), []);
  assert.deepEqual(await service.getUserAchievements("not-an-object-id"), []);
  assert.equal(progressService.calls.length, 0);
  assert.equal(achievementModel.createAttempts.length, 0);
});

test("checkAchievements reuses supplied progress instead of querying it again", async () => {
  const userId = new ObjectId().toString();
  const achievementModel = createMockAchievementModel();
  const progressService = createMockProgressService();
  const service = createAchievementService({
    achievementModel,
    progressService,
  });

  const unlocked = await service.checkAchievements(userId, {
    ...ZERO_PROGRESS,
    conceptsCompleted: 1,
  });

  assert.deepEqual(unlocked, ["first_concept"]);
  assert.deepEqual(progressService.calls, []);
});

// ---------------------------------------------------------------------------
// Duplicates and races
// ---------------------------------------------------------------------------

test("already unlocked achievements are not inserted again", async () => {
  const userId = new ObjectId().toString();
  const achievementModel = createMockAchievementModel();
  const service = createAchievementService({
    achievementModel,
    progressService: createMockProgressService({
      [userId]: { quizzesCompleted: 5, totalXP: 100 },
    }),
  });

  const first = await service.checkAchievements(userId);
  assert.deepEqual(first.sort(), ["first_quiz", "quiz_master", "xp_100"]);
  const attemptsAfterFirst = achievementModel.createAttempts.length;

  const second = await service.checkAchievements(userId);
  assert.deepEqual(second, []);
  // No insert is even attempted for achievements that are already unlocked.
  assert.equal(achievementModel.createAttempts.length, attemptsAfterFirst);
  assert.equal(achievementModel.records.length, 3);
});

test("duplicate-key (11000) errors are swallowed and other unlocks continue", async () => {
  const userId = new ObjectId().toString();
  const achievementModel = createMockAchievementModel({
    createError: (doc) => {
      if (doc.achievementId !== "first_quiz") return null;
      const error = new Error("E11000 duplicate key error");
      error.code = 11000;
      return error;
    },
  });
  const service = createAchievementService({
    achievementModel,
    progressService: createMockProgressService({
      [userId]: { quizzesCompleted: 5 },
    }),
  });

  const originalError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    const unlocked = await service.checkAchievements(userId);
    assert.deepEqual(unlocked, ["quiz_master"]);
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 0, "11000 must not be logged as a failure");
  assert.deepEqual(idsFor(achievementModel.records, userId), ["quiz_master"]);
});

test("non-duplicate insert errors are logged and propagated", async () => {
  const userId = new ObjectId().toString();
  const achievementModel = createMockAchievementModel({
    createError: (doc) =>
      doc.achievementId === "xp_100" ? new Error("write concern failed") : null,
  });
  const service = createAchievementService({
    achievementModel,
    progressService: createMockProgressService({
      [userId]: { totalXP: 500 },
    }),
  });

  const originalError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    await assert.rejects(
      service.checkAchievements(userId),
      /write concern failed/,
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 1);
  assert.deepEqual(idsFor(achievementModel.records, userId), []);
});

test("concurrent checks cannot create duplicate records under a unique index", async () => {
  const userId = new ObjectId().toString();
  let releaseReads;
  let reads = 0;
  const readBarrier = new Promise((resolve) => {
    releaseReads = resolve;
  });
  const achievementModel = createMockAchievementModel({
    // Hold every read until all concurrent checks have read the (empty) set,
    // so each one believes nothing is unlocked yet.
    beforeFind: async () => {
      reads += 1;
      if (reads === 3) releaseReads();
      await readBarrier;
    },
  });
  const service = createAchievementService({
    achievementModel,
    progressService: createMockProgressService({
      [userId]: {
        conceptsCompleted: 1,
        quizzesCompleted: 5,
        currentStreak: 7,
        totalXP: 500,
      },
    }),
  });

  const results = await Promise.all([
    service.checkAchievements(userId),
    service.checkAchievements(userId),
    service.checkAchievements(userId),
  ]);

  // Every check attempted every insert, but the unique index let only one win.
  assert.equal(
    achievementModel.createAttempts.length,
    ACHIEVEMENT_TYPES.length * 3,
  );
  assert.deepEqual(
    idsFor(achievementModel.records, userId),
    [...ACHIEVEMENT_TYPES].sort(),
  );
  // Each achievement is reported as newly unlocked exactly once overall.
  const reported = results.flat().sort();
  assert.deepEqual(reported, [...ACHIEVEMENT_TYPES].sort());
});

// ---------------------------------------------------------------------------
// Unknown IDs
// ---------------------------------------------------------------------------

test("unknown achievement IDs stored in MongoDB are ignored safely", async () => {
  const userId = new ObjectId().toString();
  const achievementModel = createMockAchievementModel({
    seed: [
      {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        achievementId: "legacy_badge",
        unlockedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ],
  });
  const service = createAchievementService({
    achievementModel,
    progressService: createMockProgressService({
      [userId]: { conceptsCompleted: 1 },
    }),
  });

  const unlocked = await service.checkAchievements(userId);
  assert.deepEqual(unlocked, ["first_concept"]);
  // Only known rule IDs are ever attempted; the unknown one is never re-created.
  assert.ok(
    achievementModel.createAttempts.every((id) =>
      ACHIEVEMENT_TYPES.includes(id),
    ),
  );
  assert.equal(
    achievementModel.records.filter((r) => r.achievementId === "legacy_badge")
      .length,
    1,
  );

  // Unknown legacy IDs remain displayable, but Mongo internals stay private.
  const listed = await service.getUserAchievements(userId);
  assert.ok(
    listed.every(
      (record) =>
        Object.keys(record).sort().join(",") === "achievementId,unlockedAt",
    ),
  );
  assert.deepEqual(listed.map((record) => record.achievementId).sort(), [
    "first_concept",
    "legacy_badge",
  ]);
});

test("no achievement outside the schema enum can be created", async () => {
  const userId = new ObjectId().toString();
  const achievementModel = createMockAchievementModel();
  const service = createAchievementService({
    achievementModel,
    progressService: createMockProgressService({
      [userId]: {
        conceptsCompleted: 99,
        quizzesCompleted: 99,
        currentStreak: 99,
        totalXP: 9999,
      },
    }),
  });
  await service.checkAchievements(userId);
  assert.ok(
    achievementModel.records.every((record) =>
      ACHIEVEMENT_TYPES.includes(record.achievementId),
    ),
  );
  assert.equal(achievementModel.records.length, ACHIEVEMENT_TYPES.length);
});

// ---------------------------------------------------------------------------
// User isolation
// ---------------------------------------------------------------------------

test("achievements for user A never affect user B", async () => {
  const userA = new ObjectId().toString();
  const userB = new ObjectId().toString();
  const achievementModel = createMockAchievementModel();
  const progressService = createMockProgressService({
    [userA]: { quizzesCompleted: 5, totalXP: 500 },
    [userB]: { quizzesCompleted: 1 },
  });
  const service = createAchievementService({
    achievementModel,
    progressService,
  });

  const unlockedA = await service.checkAchievements(userA);
  assert.deepEqual(unlockedA.sort(), [
    "first_quiz",
    "quiz_master",
    "xp_100",
    "xp_500",
  ]);

  // User A's first_quiz record must not stop user B from earning first_quiz.
  const unlockedB = await service.checkAchievements(userB);
  assert.deepEqual(unlockedB, ["first_quiz"]);

  assert.deepEqual(idsFor(achievementModel.records, userB), ["first_quiz"]);
  assert.deepEqual(
    (await service.getUserAchievements(userB)).map((r) => r.achievementId),
    ["first_quiz"],
  );
  assert.equal((await service.getUserAchievements(userA)).length, 4);
  assert.deepEqual(progressService.calls, [userA, userB]);
});

// ---------------------------------------------------------------------------
// Streaks (existing updateStreak behavior, exercised through awardXP)
// ---------------------------------------------------------------------------

const createMockXPStorage = () => {
  const documents = [];
  return {
    documents,
    findOne: async (filter) =>
      documents.find(
        (d) =>
          String(d.userId) === String(filter.userId) &&
          (!filter.actionKey || d.actionKey === filter.actionKey),
      ) || null,
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
      const record = { _id: new ObjectId(), ...doc };
      documents.push(record);
      return record;
    },
  };
};

const createMockUserModel = (seed = {}) => {
  const users = new Map(
    Object.entries(seed).map(([id, fields]) => [
      id,
      { currentStreak: 0, longestStreak: 0, lastActivityDate: null, ...fields },
    ]),
  );
  return {
    users,
    findById: (id) => {
      const stored = users.get(String(id));
      if (!stored) return null;
      return {
        ...stored,
        async save() {
          users.set(String(id), {
            currentStreak: this.currentStreak,
            longestStreak: this.longestStreak,
            lastActivityDate: this.lastActivityDate,
          });
        },
      };
    },
  };
};

const createStreakHarness = (seed) => {
  const userModel = createMockUserModel(seed);
  const service = createXPService({
    getModel: async () => createMockXPStorage.shared,
    userModel,
  });
  return { userModel, service };
};

// One shared XP storage per harness instance.
const makeHarness = (seed) => {
  const storage = createMockXPStorage();
  const userModel = createMockUserModel(seed);
  const service = createXPService({
    getModel: async () => storage,
    userModel,
  });
  let counter = 0;
  const act = (userId, createdAt, actionKey) =>
    service.awardXP(userId, "concept_completed", {
      actionKey: actionKey ?? `streak-test:${++counter}`,
      createdAt,
      checkDailyGoal: false,
    });
  const user = (userId) => userModel.users.get(String(userId));
  return { storage, userModel, service, act, user };
};

// All dates are explicit UTC instants: updateStreak buckets by UTC day.
const utc = (day, hour = 12, minute = 0) =>
  new Date(Date.UTC(2026, 0, day, hour, minute));

test("streak: first activity sets currentStreak to 1", async () => {
  const userId = new ObjectId().toString();
  const { act, user } = makeHarness({ [userId]: {} });
  await act(userId, utc(10));
  assert.equal(user(userId).currentStreak, 1);
  assert.equal(user(userId).longestStreak, 1);
  assert.equal(
    user(userId).lastActivityDate.toISOString(),
    "2026-01-10T00:00:00.000Z",
  );
});

test("streak: same-UTC-day activity does not increment", async () => {
  const userId = new ObjectId().toString();
  const { act, user } = makeHarness({ [userId]: {} });
  await act(userId, utc(10, 0, 5));
  await act(userId, utc(10, 12));
  await act(userId, utc(10, 23, 55));
  assert.equal(user(userId).currentStreak, 1);
  assert.equal(user(userId).longestStreak, 1);
});

test("streak: activity on the next UTC day increments", async () => {
  const userId = new ObjectId().toString();
  const { act, user } = makeHarness({ [userId]: {} });
  await act(userId, utc(10));
  await act(userId, utc(11));
  assert.equal(user(userId).currentStreak, 2);
  assert.equal(user(userId).longestStreak, 2);
});

test("streak: day boundaries follow UTC, not local time", async () => {
  // 23:30 UTC and 00:30 UTC the next day are one hour apart and fall on the
  // same local day in UTC+05:30, but on consecutive UTC days.
  const userId = new ObjectId().toString();
  const { act, user } = makeHarness({ [userId]: {} });
  await act(userId, utc(10, 23, 30));
  await act(userId, utc(11, 0, 30));
  assert.equal(user(userId).currentStreak, 2);
});

test("streak: multiple consecutive days increment one per day", async () => {
  const userId = new ObjectId().toString();
  const { act, user } = makeHarness({ [userId]: {} });
  for (let day = 1; day <= 7; day += 1) {
    await act(userId, utc(day));
    assert.equal(user(userId).currentStreak, day);
  }
  assert.equal(user(userId).longestStreak, 7);
});

test("streak: a missed day starts a new streak at 1", async () => {
  const userId = new ObjectId().toString();
  const { act, user } = makeHarness({ [userId]: {} });
  await act(userId, utc(10));
  await act(userId, utc(11));
  await act(userId, utc(12));
  await act(userId, utc(14)); // 13th skipped
  assert.equal(user(userId).currentStreak, 1);
  assert.equal(
    user(userId).lastActivityDate.toISOString(),
    "2026-01-14T00:00:00.000Z",
  );
});

test("streak: longestStreak grows when currentStreak exceeds it", async () => {
  const userId = new ObjectId().toString();
  const { act, user } = makeHarness({
    [userId]: {
      currentStreak: 3,
      longestStreak: 3,
      lastActivityDate: new Date("2026-01-09T00:00:00.000Z"),
    },
  });
  await act(userId, utc(10));
  assert.equal(user(userId).currentStreak, 4);
  assert.equal(user(userId).longestStreak, 4);
});

test("streak: a broken or shorter new streak never reduces longestStreak", async () => {
  const userId = new ObjectId().toString();
  const { act, user } = makeHarness({
    [userId]: {
      currentStreak: 2,
      longestStreak: 9,
      lastActivityDate: new Date("2026-01-09T00:00:00.000Z"),
    },
  });
  await act(userId, utc(10)); // continues to 3
  assert.equal(user(userId).currentStreak, 3);
  assert.equal(user(userId).longestStreak, 9);

  await act(userId, utc(15)); // gap -> reset
  assert.equal(user(userId).currentStreak, 1);
  assert.equal(user(userId).longestStreak, 9);
});

test("streak: duplicate XP for the same action does not touch the streak", async () => {
  const userId = new ObjectId().toString();
  const { act, user, storage } = makeHarness({
    [userId]: {
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: new Date("2026-01-09T00:00:00.000Z"),
    },
  });
  const first = await act(userId, utc(10), "concept_completed:photosynthesis");
  assert.equal(first.awarded, true);
  assert.equal(user(userId).currentStreak, 2);

  const duplicate = await act(
    userId,
    utc(10, 18),
    "concept_completed:photosynthesis",
  );
  assert.equal(duplicate.awarded, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(user(userId).currentStreak, 2);
  assert.equal(storage.documents.length, 1);

  // Replaying the already-rewarded action on the next day earns no XP and,
  // with the existing design, does not extend the streak either.
  const nextDayDuplicate = await act(
    userId,
    utc(11),
    "concept_completed:photosynthesis",
  );
  assert.equal(nextDayDuplicate.duplicate, true);
  assert.equal(user(userId).currentStreak, 2);
});

test("streak: one user's activity never changes another user's streak", async () => {
  const userA = new ObjectId().toString();
  const userB = new ObjectId().toString();
  const { act, user } = makeHarness({
    [userA]: {},
    [userB]: {
      currentStreak: 5,
      longestStreak: 6,
      lastActivityDate: new Date("2026-01-01T00:00:00.000Z"),
    },
  });
  await act(userA, utc(10));
  await act(userA, utc(11));
  await act(userA, utc(12));
  assert.equal(user(userA).currentStreak, 3);
  assert.deepEqual(user(userB), {
    currentStreak: 5,
    longestStreak: 6,
    lastActivityDate: new Date("2026-01-01T00:00:00.000Z"),
  });
});

test("streak feeds achievements: three consecutive UTC days unlock streak_3", async () => {
  const userId = new ObjectId().toString();
  const { act, user } = makeHarness({ [userId]: {} });
  await act(userId, utc(10));
  await act(userId, utc(11));
  await act(userId, utc(12));

  const achievementModel = createMockAchievementModel();
  const service = createAchievementService({
    achievementModel,
    progressService: {
      getProgress: async () => ({
        ...ZERO_PROGRESS,
        currentStreak: user(userId).currentStreak,
      }),
    },
  });
  assert.deepEqual(await service.checkAchievements(userId), ["streak_3"]);
});

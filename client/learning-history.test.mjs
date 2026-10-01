import assert from "node:assert/strict";
import { test } from "node:test";
import { createLearningHistoryService } from "./src/services/learningHistoryService.js";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

const concept = {
  id: "photosynthesis",
  title: "Photosynthesis",
  type: "flowchart",
  summary: "Plants transform light energy.",
  nodes: [{ id: "light", label: "Light" }],
  connections: [],
};

test("history records and retrieves concept access metadata", () => {
  const storage = createStorage();
  const service = createLearningHistoryService({
    storage,
    now: () => new Date("2026-10-01T10:00:00.000Z"),
  });
  const history = service.recordConceptAccess({
    concept,
    level: "Beginner",
    source: "fallback",
  });
  assert.equal(history.length, 1);
  assert.equal(history[0].title, "Photosynthesis");
  assert.equal(history[0].type, "flowchart");
  assert.equal(history[0].level, "Beginner");
  assert.equal(history[0].source, "fallback");
  assert.deepEqual(service.getLearningHistory(), history);
});

test("repeat access updates the record without duplicating the concept", () => {
  const storage = createStorage();
  let currentTime = new Date("2026-10-01T10:00:00.000Z");
  const service = createLearningHistoryService({
    storage,
    now: () => currentTime,
  });
  service.recordConceptAccess({ concept, level: "Beginner" });
  currentTime = new Date("2026-10-02T10:00:00.000Z");
  const history = service.recordConceptAccess({
    concept,
    level: "Advanced",
    source: "gemini",
  });
  assert.equal(history.length, 1);
  assert.equal(history[0].level, "Advanced");
  assert.equal(history[0].lastAccessedAt, currentTime.toISOString());
  assert.equal(history[0].createdAt, "2026-10-01T10:00:00.000Z");
});

test("latest quiz result is stored on the matching history entry", () => {
  const storage = createStorage();
  const service = createLearningHistoryService({ storage });
  service.recordConceptAccess({ concept });
  const history = service.saveQuizResult({
    conceptId: concept.id,
    score: 4,
    total: 5,
    percentage: 80,
  });
  assert.deepEqual(history[0].latestQuizScore, {
    score: 4,
    total: 5,
    percentage: 80,
    completedAt: history[0].lastAccessedAt,
  });
});

test("malformed, blocked, and unavailable storage degrade to empty history", () => {
  const malformedStorage = {
    getItem: () => "{bad json",
    setItem: () => {},
  };
  assert.deepEqual(
    createLearningHistoryService({
      storage: malformedStorage,
    }).getLearningHistory(),
    [],
  );
  assert.deepEqual(
    createLearningHistoryService({ storage: undefined }).getLearningHistory(),
    [],
  );

  const blockedStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  const blockedService = createLearningHistoryService({
    storage: blockedStorage,
  });
  assert.deepEqual(blockedService.recordConceptAccess({ concept }), []);
  assert.deepEqual(blockedService.getLearningHistory(), []);
});

test("throwing localStorage getter does not break history initialization", () => {
  const previousDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("storage access denied");
    },
  });
  try {
    assert.deepEqual(createLearningHistoryService().getLearningHistory(), []);
  } finally {
    if (previousDescriptor)
      Object.defineProperty(globalThis, "localStorage", previousDescriptor);
    else delete globalThis.localStorage;
  }
});

test("migration owner is isolated and successful migration can clear local records", () => {
  const storage = createStorage();
  const service = createLearningHistoryService({ storage });
  service.recordConceptAccess({ concept });
  service.setMigrationOwner("user-a");
  assert.equal(service.getMigrationOwner(), "user-a");
  assert.equal(service.getMigrationOwner(), "user-a");
  service.clearLearningHistory();
  service.clearMigrationOwner();
  assert.deepEqual(service.getLearningHistory(), []);
  assert.equal(service.getMigrationOwner(), null);
});

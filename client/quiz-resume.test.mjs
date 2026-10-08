import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearQuizResume,
  getQuizResumeKey,
  restoreQuizResume,
  saveQuizResume,
  shouldClearResumeAfterSubmit,
} from "./src/services/quizSessionStorage.js";

const createStorage = () => {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

const makeResponse = (quizId = "quiz-1") => ({
  success: true,
  quizId,
  source: "fallback",
  expiresAt: "2026-10-07T18:00:00.000Z",
  concept: { id: "concept-1", title: "Concept" },
  quiz: {
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: `q${index + 1}`,
      question: `Question ${index + 1}?`,
      options: ["A", "B", "C", "D"],
    })),
  },
});

test("quiz resume storage is account-scoped and stores only client progress", () => {
  const storage = createStorage();
  assert.notEqual(getQuizResumeKey("user-a"), getQuizResumeKey("user-b"));
  assert.notEqual(getQuizResumeKey("user-a"), getQuizResumeKey(null));
  assert.notEqual(
    getQuizResumeKey("user-a", "concept-a"),
    getQuizResumeKey("user-a", "concept-b"),
  );
  assert.equal(
    saveQuizResume(
      {
        quizId: "quiz-1",
        selectedAnswers: { q1: 2, invalid: -1 },
        activeQuestionIndex: 3,
      },
      "user-a",
      "concept-a",
      storage,
    ),
    true,
  );
  const saved = JSON.parse(
    storage.getItem(getQuizResumeKey("user-a", "concept-a")),
  );
  assert.deepEqual(Object.keys(saved).sort(), [
    "activeQuestionIndex",
    "quizId",
    "selectedAnswers",
  ]);
  assert.deepEqual(saved.selectedAnswers, { q1: 2 });
  assert.equal("userId" in saved, false);
  assert.equal("token" in saved, false);
});

test("restore filters unknown questions and invalid answer indexes", async () => {
  const storage = createStorage();
  saveQuizResume(
    {
      quizId: "quiz-1",
      selectedAnswers: { q1: 1, q2: 4, missing: 0, q3: "1" },
      activeQuestionIndex: 3,
    },
    null,
    undefined,
    storage,
  );
  let requestedQuizId;
  const restored = await restoreQuizResume({
    storage,
    getQuiz: async (quizId) => {
      requestedQuizId = quizId;
      return makeResponse();
    },
  });
  assert.equal(restored.status, "restored");
  assert.equal(requestedQuizId, "quiz-1");
  assert.deepEqual(restored.selectedAnswers, { q1: 1 });
  assert.equal(restored.activeQuestionIndex, 3);
  assert.deepEqual(restored.quiz.questions[0], {
    id: "q1",
    question: "Question 1?",
    options: ["A", "B", "C", "D"],
  });
});

test("invalid active question index resets safely to the first question", async () => {
  const storage = createStorage();
  saveQuizResume(
    {
      quizId: "quiz-1",
      selectedAnswers: {},
      activeQuestionIndex: 99,
    },
    null,
    undefined,
    storage,
  );
  const restored = await restoreQuizResume({
    storage,
    getQuiz: async () => makeResponse(),
  });
  assert.equal(restored.activeQuestionIndex, 0);
});

test("malformed resume data is cleared without disturbing another account", async () => {
  const storage = createStorage();
  storage.setItem(getQuizResumeKey("user-a"), "{bad json");
  storage.setItem(
    getQuizResumeKey("user-b"),
    JSON.stringify({
      quizId: "quiz-b",
      selectedAnswers: {},
      activeQuestionIndex: 0,
    }),
  );
  const result = await restoreQuizResume({
    userId: "user-a",
    storage,
    getQuiz: async () => {
      throw new Error("should not fetch malformed state");
    },
  });
  assert.equal(result.status, "none");
  assert.equal(storage.getItem(getQuizResumeKey("user-a")), null);
  assert.notEqual(storage.getItem(getQuizResumeKey("user-b")), null);
});

test("a definitive 404 clears the active resume record", async () => {
  const storage = createStorage();
  saveQuizResume(
    { quizId: "quiz-1", selectedAnswers: {}, activeQuestionIndex: 0 },
    null,
    undefined,
    storage,
  );
  const result = await restoreQuizResume({
    storage,
    getQuiz: async () => ({ success: false, status: 404 }),
  });
  assert.equal(result.status, "missing");
  assert.equal(storage.getItem(getQuizResumeKey(null)), null);
});

test("a quiz from a different concept scope is not restored", async () => {
  const storage = createStorage();
  saveQuizResume(
    { quizId: "quiz-1", selectedAnswers: {}, activeQuestionIndex: 0 },
    null,
    "concept-a",
    storage,
  );
  const result = await restoreQuizResume({
    scopeId: "concept-a",
    expectedConceptId: "concept-a",
    storage,
    getQuiz: async () => ({
      ...makeResponse(),
      concept: { id: "concept-b", title: "Other concept" },
    }),
  });
  assert.equal(result.status, "missing");
  assert.equal(storage.getItem(getQuizResumeKey(null, "concept-a")), null);
});

test("503 and network failures preserve the active resume record", async () => {
  for (const getQuiz of [
    async () => ({ success: false, status: 503 }),
    async () => {
      throw new Error("network unavailable");
    },
  ]) {
    const storage = createStorage();
    saveQuizResume(
      { quizId: "quiz-1", selectedAnswers: {}, activeQuestionIndex: 0 },
      null,
      undefined,
      storage,
    );
    const result = await restoreQuizResume({ storage, getQuiz });
    assert.equal(result.status, "unavailable");
    assert.notEqual(storage.getItem(getQuizResumeKey(null)), null);
  }
});

test("resume cleanup removes only the active account record", () => {
  const storage = createStorage();
  saveQuizResume(
    { quizId: "quiz-a", selectedAnswers: {}, activeQuestionIndex: 0 },
    "user-a",
    undefined,
    storage,
  );
  saveQuizResume(
    { quizId: "quiz-b", selectedAnswers: {}, activeQuestionIndex: 0 },
    "user-b",
    undefined,
    storage,
  );
  clearQuizResume("user-a", undefined, storage);
  assert.equal(storage.getItem(getQuizResumeKey("user-a")), null);
  assert.notEqual(storage.getItem(getQuizResumeKey("user-b")), null);
});

test("structurally invalid resume records are cleared without fetching", async () => {
  const invalidRecords = [
    JSON.stringify([]),
    JSON.stringify(null),
    JSON.stringify({ selectedAnswers: {}, activeQuestionIndex: 0 }),
    JSON.stringify({ quizId: "  ", selectedAnswers: {}, activeQuestionIndex: 0 }),
    JSON.stringify({ quizId: "quiz-1", selectedAnswers: [], activeQuestionIndex: 0 }),
    JSON.stringify({ quizId: "quiz-1", selectedAnswers: {}, activeQuestionIndex: "2" }),
    JSON.stringify({ quizId: "quiz-1", selectedAnswers: {} }),
  ];
  for (const rawValue of invalidRecords) {
    const storage = createStorage();
    storage.setItem(getQuizResumeKey(null), rawValue);
    let fetched = false;
    const result = await restoreQuizResume({
      storage,
      getQuiz: async () => {
        fetched = true;
        return makeResponse();
      },
    });
    assert.equal(result.status, "none", rawValue);
    assert.equal(fetched, false, rawValue);
    assert.equal(storage.getItem(getQuizResumeKey(null)), null, rawValue);
  }
});

test("restore never surfaces answer keys or explanations even if returned", async () => {
  const storage = createStorage();
  saveQuizResume(
    { quizId: "quiz-1", selectedAnswers: { q2: 3 }, activeQuestionIndex: 1 },
    null,
    undefined,
    storage,
  );
  const leaky = makeResponse();
  leaky.quiz.questions = leaky.quiz.questions.map((question) => ({
    ...question,
    correctAnswerIndex: 0,
    explanation: "secret",
  }));
  const restored = await restoreQuizResume({
    storage,
    getQuiz: async () => leaky,
  });
  assert.equal(restored.status, "restored");
  assert.deepEqual(restored.selectedAnswers, { q2: 3 });
  assert.equal(restored.activeQuestionIndex, 1);
  const serialized = JSON.stringify(restored);
  assert.equal(serialized.includes("correctAnswerIndex"), false);
  assert.equal(serialized.includes("secret"), false);
  // Storage itself never contains answer keys either.
  const stored = storage.getItem(getQuizResumeKey(null));
  assert.equal(stored.includes("correctAnswerIndex"), false);
});

test("successful submission and definitive 404 clear resume; 503/network keep it", () => {
  assert.equal(
    shouldClearResumeAfterSubmit({ success: true, result: { score: 5 } }),
    true,
  );
  assert.equal(
    shouldClearResumeAfterSubmit({ success: false, status: 404 }),
    true,
  );
  assert.equal(
    shouldClearResumeAfterSubmit({ success: false, status: 503 }),
    false,
  );
  assert.equal(
    shouldClearResumeAfterSubmit({ success: false, status: 400 }),
    false,
  );
  assert.equal(
    shouldClearResumeAfterSubmit({ success: false, message: "network" }),
    false,
  );
  assert.equal(shouldClearResumeAfterSubmit({ success: true }), false);
  assert.equal(shouldClearResumeAfterSubmit(undefined), false);

  const storage = createStorage();
  saveQuizResume(
    { quizId: "quiz-1", selectedAnswers: { q1: 0 }, activeQuestionIndex: 4 },
    "user-a",
    "concept-a",
    storage,
  );
  const response = { success: true, result: { score: 5 } };
  if (shouldClearResumeAfterSubmit(response)) {
    clearQuizResume("user-a", "concept-a", storage);
  }
  assert.equal(storage.getItem(getQuizResumeKey("user-a", "concept-a")), null);
});

test("restarting a quiz clears only that scope's resume record", () => {
  const storage = createStorage();
  saveQuizResume(
    { quizId: "quiz-a", selectedAnswers: { q1: 1 }, activeQuestionIndex: 2 },
    null,
    "concept-a",
    storage,
  );
  saveQuizResume(
    { quizId: "quiz-b", selectedAnswers: {}, activeQuestionIndex: 0 },
    null,
    "concept-b",
    storage,
  );
  clearQuizResume(null, "concept-a", storage);
  assert.equal(storage.getItem(getQuizResumeKey(null, "concept-a")), null);
  assert.notEqual(storage.getItem(getQuizResumeKey(null, "concept-b")), null);
});

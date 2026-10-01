import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { test } from "node:test";
import { createLearningContentService } from "../src/services/learningContentService.js";
import { createQuizService } from "../src/services/quizService.js";
import {
  explanationSchema,
  quizSchema,
} from "../src/validation/learning.schema.js";
import { prepareConcept } from "../src/services/conceptService.js";
import { FIXTURE_FLOWCHART } from "../src/fixtures/concept.fixtures.js";
import { createLearningRouter } from "../src/routes/learning.routes.js";

const makeExplanation = () => ({
  beginner:
    "Plants use sunlight to make stored food from water and carbon dioxide.",
  intermediate:
    "Light reactions capture energy, then the Calvin cycle builds sugars from carbon dioxide.",
  advanced:
    "Photophosphorylation generates ATP and NADPH to drive carbon fixation into carbohydrates.",
  keyTakeaways: ["Light energy is converted into chemical energy."],
  terminology: [
    {
      term: "Chlorophyll",
      definition: "A pigment that absorbs light energy in plants.",
    },
  ],
});

const makeQuiz = () => ({
  questions: Array.from({ length: 5 }, (_, index) => ({
    id: `question-${index + 1}`,
    question: `Which named element is part of the concept, question ${index + 1}?`,
    options: ["Sunlight", "Moonlight", "Sound", "Metal"],
    correctAnswerIndex: 0,
    explanation: "Sunlight is explicitly described as an input in the concept.",
  })),
});

test("Gemini explanation validates all three levels, takeaways, and terminology", async () => {
  const service = createLearningContentService({
    generateStructuredResponseFn: async (prompt) => {
      assert.match(prompt, /Photosynthesis/);
      return { text: JSON.stringify(makeExplanation()) };
    },
  });
  const result = await service.generateExplanation(FIXTURE_FLOWCHART);
  assert.equal(result.source, "gemini");
  assert.equal(explanationSchema.safeParse(result.explanation).success, true);
});

test("explanation retries invalid output and accepts a valid second response", async () => {
  let calls = 0;
  const service = createLearningContentService({
    generateStructuredResponseFn: async () => {
      calls += 1;
      return {
        text: JSON.stringify(
          calls === 1 ? { beginner: "short" } : makeExplanation(),
        ),
      };
    },
  });
  const result = await service.generateExplanation(FIXTURE_FLOWCHART);
  assert.equal(calls, 2);
  assert.equal(result.source, "gemini");
});

test("invalid and empty explanation responses return a validated concept-based fallback", async () => {
  for (const response of [
    { text: "not json" },
    { text: "" },
    { text: JSON.stringify({ beginner: "short" }) },
  ]) {
    const service = createLearningContentService({
      generateStructuredResponseFn: async () => response,
    });
    const result = await service.generateExplanation(FIXTURE_FLOWCHART);
    assert.equal(result.source, "fallback");
    assert.equal(explanationSchema.safeParse(result.explanation).success, true);
  }
});

test("concept-based fallbacks validate with unusually long text and short labels", async () => {
  const edgeConcept = {
    id: "edge-concept",
    title: "Long concept ".repeat(250),
    type: "flowchart",
    summary: "x",
    nodes: [
      { id: "one", label: "x" },
      { id: "two", label: "y" },
    ],
    connections: [],
  };
  const service = createLearningContentService({
    generateStructuredResponseFn: async () => {
      throw new Error("offline");
    },
  });
  const explanation = await service.generateExplanation(edgeConcept);
  const quiz = await service.generateQuiz(edgeConcept);
  assert.equal(
    explanationSchema.safeParse(explanation.explanation).success,
    true,
  );
  assert.equal(quizSchema.safeParse(quiz.quiz).success, true);
});

test("invalid concepts are rejected before explanation generation", async () => {
  let calls = 0;
  const service = createLearningContentService({
    generateStructuredResponseFn: async () => {
      calls += 1;
      return { text: "{}" };
    },
  });
  await assert.rejects(
    service.generateExplanation({ title: "unvalidated" }),
    /valid concept is required/i,
  );
  assert.equal(calls, 0);
});

test("quiz schema requires five questions, four options, unique IDs, and valid answer indexes", () => {
  assert.equal(quizSchema.safeParse(makeQuiz()).success, true);
  assert.equal(
    quizSchema.safeParse({ questions: makeQuiz().questions.slice(0, 4) })
      .success,
    false,
  );
  const invalidIndex = makeQuiz();
  invalidIndex.questions[0].correctAnswerIndex = 4;
  assert.equal(quizSchema.safeParse(invalidIndex).success, false);
  const duplicateOptions = makeQuiz();
  duplicateOptions.questions[0].options[3] = "Sunlight";
  assert.equal(quizSchema.safeParse(duplicateOptions).success, false);
});

test("Gemini quiz is validated and exposes no answer key before submit", async () => {
  const service = createLearningContentService({
    generateStructuredResponseFn: async () => ({
      text: JSON.stringify(makeQuiz()),
    }),
  });
  const quizService = createQuizService({
    contentService: service,
    idFactory: () => "quiz-1",
  });
  const result = await quizService.createQuiz(FIXTURE_FLOWCHART);
  assert.equal(result.source, "gemini");
  assert.equal(result.quiz.questions.length, 5);
  assert.ok(
    result.quiz.questions.every((question) => question.options.length === 4),
  );
  assert.ok(
    result.quiz.questions.every(
      (question) => !("correctAnswerIndex" in question),
    ),
  );
  assert.ok(
    result.quiz.questions.every((question) => !("explanation" in question)),
  );
});

test("invalid Gemini quiz falls back to five validated questions", async () => {
  const service = createLearningContentService({
    generateStructuredResponseFn: async () => ({
      text: JSON.stringify({ questions: [] }),
    }),
  });
  const result = await service.generateQuiz(FIXTURE_FLOWCHART);
  assert.equal(result.source, "fallback");
  assert.equal(quizSchema.safeParse(result.quiz).success, true);
});

test("quiz scoring accepts correct answers and returns explanations only after submission", async () => {
  let quizId = 0;
  const quizService = createQuizService({
    contentService: {
      generateQuiz: async () => ({ source: "fallback", quiz: makeQuiz() }),
    },
    idFactory: () => `quiz-${++quizId}`,
  });
  const generated = await quizService.createQuiz(FIXTURE_FLOWCHART);
  const answers = Object.fromEntries(
    generated.quiz.questions.map((question) => [question.id, 0]),
  );
  const result = await quizService.submitQuiz(generated.quizId, answers);
  assert.deepEqual(
    { score: result.score, total: result.total, percentage: result.percentage },
    { score: 5, total: 5, percentage: 100 },
  );
  assert.ok(
    result.answers.every((answer) => answer.correct && answer.explanation),
  );
});

test("quiz scoring handles incorrect answers", async () => {
  const quizService = createQuizService({
    contentService: {
      generateQuiz: async () => ({ source: "gemini", quiz: makeQuiz() }),
    },
    idFactory: () => "quiz-wrong",
  });
  const generated = await quizService.createQuiz(FIXTURE_FLOWCHART);
  const answers = Object.fromEntries(
    generated.quiz.questions.map((question, index) => [
      question.id,
      index === 0 ? 0 : 1,
    ]),
  );
  const result = await quizService.submitQuiz(generated.quizId, answers);
  assert.equal(result.score, 1);
  assert.equal(result.percentage, 20);
  assert.equal(result.answers[1].correct, false);
});

test("quiz submission rejects missing answers, invalid indexes, and unknown question IDs", async () => {
  const quizService = createQuizService({
    contentService: {
      generateQuiz: async () => ({ source: "fallback", quiz: makeQuiz() }),
    },
    idFactory: (() => {
      let id = 0;
      return () => `quiz-${++id}`;
    })(),
  });
  const missing = await quizService.createQuiz(FIXTURE_FLOWCHART);
  await assert.rejects(
    quizService.submitQuiz(missing.quizId, {}),
    /one valid answer/i,
  );

  const invalidIndex = await quizService.createQuiz(FIXTURE_FLOWCHART);
  const outOfRange = Object.fromEntries(
    invalidIndex.quiz.questions.map((question) => [question.id, 4]),
  );
  await assert.rejects(
    quizService.submitQuiz(invalidIndex.quizId, outOfRange),
    /one valid answer/i,
  );

  const unknown = await quizService.createQuiz(FIXTURE_FLOWCHART);
  await assert.rejects(
    quizService.submitQuiz(
      unknown.quizId,
      Object.fromEntries(
        unknown.quiz.questions
          .map((question) => [question.id, 0])
          .concat([["extra", 0]]),
      ),
    ),
    /do not match/i,
  );
});

test("quiz can be restarted after completion and expired quizzes cannot be submitted", async () => {
  let now = 1000;
  let nextId = 0;
  const quizService = createQuizService({
    contentService: {
      generateQuiz: async () => ({ source: "fallback", quiz: makeQuiz() }),
    },
    now: () => now,
    idFactory: () => `quiz-${++nextId}`,
  });
  const first = await quizService.createQuiz(FIXTURE_FLOWCHART);
  const answers = Object.fromEntries(
    first.quiz.questions.map((question) => [question.id, 0]),
  );
  await quizService.submitQuiz(first.quizId, answers);
  const restarted = await quizService.createQuiz(FIXTURE_FLOWCHART);
  assert.notEqual(restarted.quizId, first.quizId);

  now += 2 * 60 * 60 * 1000 + 1;
  await assert.rejects(
    quizService.submitQuiz(restarted.quizId, answers),
    /expired/i,
  );
});

test("valid generated explanations are derived only from the supplied validated concept", async () => {
  const service = createLearningContentService({
    generateStructuredResponseFn: async (prompt) => {
      assert.match(prompt, /Validated concept data/);
      return { text: JSON.stringify(makeExplanation()) };
    },
  });
  const result = await service.generateExplanation(FIXTURE_FLOWCHART);
  assert.equal(prepareConcept(FIXTURE_FLOWCHART).valid, true);
  assert.equal(result.explanation.beginner, makeExplanation().beginner);
});

test("learning API returns explanations and hides quiz answers until submit", async () => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  const contentService = {
    generateExplanation: async () => ({
      source: "fallback",
      explanation: makeExplanation(),
    }),
    generateQuiz: async () => ({ source: "fallback", quiz: makeQuiz() }),
  };
  const quizzes = createQuizService({
    contentService,
    idFactory: () => "api-quiz",
  });
  app.use("/api/learning", createLearningRouter({ contentService, quizzes }));
  const server = app.listen(0);
  await once(server, "listening");

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/learning`;
    const post = async (path, body) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };

    const explanation = await post("/explanations", {
      concept: FIXTURE_FLOWCHART,
    });
    assert.equal(explanation.status, 200);
    assert.equal(explanation.body.source, "fallback");
    assert.equal(
      explanation.body.explanation.advanced,
      makeExplanation().advanced,
    );

    const created = await post("/quiz", { concept: FIXTURE_FLOWCHART });
    assert.equal(created.status, 200);
    assert.equal(created.body.quiz.questions.length, 5);
    assert.ok(
      created.body.quiz.questions.every(
        (question) => !("correctAnswerIndex" in question),
      ),
    );

    const answers = Object.fromEntries(
      created.body.quiz.questions.map((question) => [question.id, 0]),
    );
    const submitted = await post(`/quiz/${created.body.quizId}/submit`, {
      answers,
    });
    assert.equal(submitted.status, 200);
    assert.equal(submitted.body.result.score, 5);
    assert.ok(
      submitted.body.result.answers.every(
        (answer) => answer.correctAnswerIndex === 0,
      ),
    );
  } finally {
    server.close();
    await once(server, "close");
  }
});

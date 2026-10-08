import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import app from "../src/app.js";
import {
  createConceptCacheService,
  buildCacheKey,
  normalizeInput,
  CONCEPT_PROMPT_VERSION,
  CONCEPT_SCHEMA_VERSION,
} from "../src/services/conceptCacheService.js";
import { createConceptGenerationService } from "../src/services/conceptGenerationService.js";
import { generateFallbackConcept } from "../src/services/fallbackConceptService.js";
import {
  createAIConceptService,
  MAX_ATTEMPTS,
} from "../src/services/aiConceptService.js";
import { GeminiServiceError } from "../src/services/geminiService.js";
import { getMongoDatabase } from "../src/config/database.js";
import { prepareConcept } from "../src/services/conceptService.js";
import { FIXTURE_FLOWCHART } from "../src/fixtures/concept.fixtures.js";

const createMemoryCollection = () => {
  const documents = new Map();
  const collection = {
    findOne: async (filter) => {
      const document = documents.get(filter.cacheKey);
      if (!document) return null;
      if (
        document.schemaVersion !== filter.schemaVersion ||
        document.promptVersion !== filter.promptVersion ||
        document.model !== filter.model
      )
        return null;
      if (document.expiresAt <= filter.expiresAt.$gt) return null;
      return structuredClone(document);
    },
    deleteOne: async ({ cacheKey }) => ({
      deletedCount: documents.delete(cacheKey) ? 1 : 0,
    }),
    updateOne: async ({ cacheKey }, update) => {
      const existing = documents.get(cacheKey);
      documents.set(cacheKey, {
        ...(existing || {}),
        ...update.$set,
        createdAt: existing?.createdAt || update.$setOnInsert.createdAt,
      });
      return { upsertedCount: existing ? 0 : 1 };
    },
  };
  return { collection, documents };
};

const createCache = (memory = createMemoryCollection()) => ({
  ...memory,
  service: createConceptCacheService({
    getCollection: async () => memory.collection,
    now: () => new Date("2026-10-01T00:00:00.000Z"),
  }),
});

test("cache normalization folds case, whitespace, and trailing punctuation", () => {
  assert.equal(
    normalizeInput(" Explain   Photosynthesis! "),
    "explain photosynthesis",
  );
  assert.equal(
    buildCacheKey({ input: " Explain Photosynthesis! " }),
    buildCacheKey({ input: "explain photosynthesis" }),
  );
});

test("cache keys distinguish topic, subject, difficulty, versions, and model", () => {
  const base = {
    input: "Explain photosynthesis",
    subject: "Biology",
    difficulty: "Beginner",
  };
  const key = buildCacheKey(base);
  assert.notEqual(
    key,
    buildCacheKey({ ...base, input: "Explain respiration" }),
  );
  assert.notEqual(key, buildCacheKey({ ...base, subject: "Chemistry" }));
  assert.notEqual(key, buildCacheKey({ ...base, difficulty: "Advanced" }));
  assert.notEqual(key, buildCacheKey({ ...base, schemaVersion: "2" }));
  assert.notEqual(key, buildCacheKey({ ...base, promptVersion: "2" }));
  assert.notEqual(key, buildCacheKey({ ...base, model: "another-model" }));
});

test("cache miss returns null", async () => {
  const { service } = createCache();
  assert.equal(
    await service.getCachedConcept({ input: "photosynthesis" }),
    null,
  );
});

test("cache hit returns the validated saved concept", async () => {
  const { service } = createCache();
  await service.saveCachedConcept({
    input: "Explain Photosynthesis!",
    concept: FIXTURE_FLOWCHART,
  });
  const concept = await service.getCachedConcept({
    input: "explain photosynthesis",
  });
  assert.equal(concept.title, FIXTURE_FLOWCHART.title);
});

test("cache rejects entries from older schema or prompt versions", async () => {
  const { service, documents } = createCache();
  await service.saveCachedConcept({
    input: "photosynthesis",
    concept: FIXTURE_FLOWCHART,
  });
  const [cacheKey, document] = documents.entries().next().value;
  document.schemaVersion = "0";
  documents.set(cacheKey, document);
  assert.equal(
    await service.getCachedConcept({ input: "photosynthesis" }),
    null,
  );
  assert.equal(CONCEPT_SCHEMA_VERSION, "1");
  assert.equal(CONCEPT_PROMPT_VERSION, "1");
});

test("invalid cached concepts are deleted and never returned", async () => {
  const { service, documents } = createCache();
  await service.saveCachedConcept({
    input: "photosynthesis",
    concept: FIXTURE_FLOWCHART,
  });
  const [cacheKey, document] = documents.entries().next().value;
  document.concept = { ...document.concept, title: "" };
  documents.set(cacheKey, document);
  assert.equal(
    await service.getCachedConcept({ input: "photosynthesis" }),
    null,
  );
  assert.equal(documents.has(cacheKey), false);
});

test("cache refuses unvalidated concepts", async () => {
  const { service } = createCache();
  await assert.rejects(
    service.saveCachedConcept({
      input: "bad concept",
      concept: { title: "invalid" },
    }),
    /Only validated concepts/,
  );
});

test("successful Gemini output is cached and a later request avoids Gemini", async () => {
  const { service: cache } = createCache();
  let geminiCalls = 0;
  let cacheWrites = 0;
  const generation = createConceptGenerationService({
    cacheService: {
      getCachedConcept: cache.getCachedConcept,
      saveCachedConcept: async (request) => {
        cacheWrites += 1;
        return cache.saveCachedConcept(request);
      },
    },
    geminiService: async () => {
      geminiCalls += 1;
      return FIXTURE_FLOWCHART;
    },
  });

  assert.equal(
    (await generation({ input: "Explain Photosynthesis!" })).source,
    "gemini",
  );
  assert.equal(
    (await generation({ input: "explain photosynthesis" })).source,
    "cache",
  );
  assert.equal(geminiCalls, 1);
  assert.equal(cacheWrites, 1);
});

test("cache save failure does not discard a valid Gemini result", async () => {
  const generation = createConceptGenerationService({
    cacheService: {
      getCachedConcept: async () => null,
      saveCachedConcept: async () => {
        throw new Error("offline");
      },
    },
    geminiService: async () => FIXTURE_FLOWCHART,
  });
  const result = await generation({ input: "photosynthesis" });
  assert.equal(result.source, "gemini");
  assert.equal(result.concept.title, FIXTURE_FLOWCHART.title);
});

test("photosynthesis uses the validated flowchart fallback", () => {
  const concept = generateFallbackConcept({ input: "Explain photosynthesis" });
  assert.equal(concept.type, "flowchart");
  assert.equal(prepareConcept(concept).valid, true);
});

test("water cycle uses the validated cycle fallback", () => {
  const concept = generateFallbackConcept({ input: "Explain the water cycle" });
  assert.equal(concept.type, "cycle");
  assert.equal(prepareConcept(concept).valid, true);
});

test("TCP handshake uses the validated sequence fallback", () => {
  const concept = generateFallbackConcept({
    input: "Explain TCP three way handshake",
  });
  assert.equal(concept.type, "sequence");
  assert.equal(prepareConcept(concept).valid, true);
});

test("OSI model uses the validated hierarchy fallback", () => {
  const concept = generateFallbackConcept({ input: "Explain OSI model" });
  assert.equal(concept.type, "hierarchy");
  assert.equal(prepareConcept(concept).valid, true);
});

test("French Revolution uses the validated timeline fallback", () => {
  const concept = generateFallbackConcept({
    input: "Explain the French Revolution",
  });
  assert.equal(concept.type, "timeline");
  assert.equal(prepareConcept(concept).valid, true);
});

test("unknown topics receive a valid deterministic generic fallback", () => {
  const first = generateFallbackConcept({
    input: "Explain cellular respiration",
  });
  const second = generateFallbackConcept({
    input: "Explain cellular respiration",
  });
  assert.equal(first.type, "flowchart");
  assert.equal(first.id, second.id);
  assert.equal(prepareConcept(first).valid, true);
});

test("cache hit returns source=cache without calling Gemini", async () => {
  let geminiCalls = 0;
  const generation = createConceptGenerationService({
    cacheService: {
      getCachedConcept: async () => FIXTURE_FLOWCHART,
      saveCachedConcept: async () =>
        assert.fail("Cache hits are not rewritten"),
    },
    geminiService: async () => {
      geminiCalls += 1;
      return FIXTURE_FLOWCHART;
    },
  });
  const result = await generation({ input: "photosynthesis" });
  assert.equal(result.source, "cache");
  assert.equal(geminiCalls, 0);
});

test("cache miss with Gemini success returns source=gemini", async () => {
  const generation = createConceptGenerationService({
    cacheService: {
      getCachedConcept: async () => null,
      saveCachedConcept: async () => {},
    },
    geminiService: async () => FIXTURE_FLOWCHART,
  });
  assert.equal(
    (await generation({ input: "photosynthesis" })).source,
    "gemini",
  );
});

test("Gemini retries before falling back after transient failures", async () => {
  let calls = 0;
  const gemini = createAIConceptService({
    generateConceptFn: async () => {
      calls += 1;
      throw new GeminiServiceError("timeout", 503);
    },
  });
  const generation = createConceptGenerationService({
    cacheService: {
      getCachedConcept: async () => null,
      saveCachedConcept: async () => {},
    },
    geminiService: gemini,
  });
  const result = await generation({ input: "Explain photosynthesis" });
  assert.equal(calls, MAX_ATTEMPTS);
  assert.equal(result.source, "fallback");
  assert.equal(result.concept.type, "flowchart");
});

test("invalid Gemini JSON retries before falling back", async () => {
  let calls = 0;
  const gemini = createAIConceptService({
    generateConceptFn: async () => {
      calls += 1;
      return { text: "not json" };
    },
  });
  const generation = createConceptGenerationService({
    cacheService: {
      getCachedConcept: async () => null,
      saveCachedConcept: async () => {},
    },
    geminiService: gemini,
  });
  const result = await generation({ input: "Explain the water cycle" });
  assert.equal(calls, MAX_ATTEMPTS);
  assert.equal(result.source, "fallback");
  assert.equal(result.concept.type, "cycle");
});

test("MongoDB unavailable with Gemini success still returns Gemini output", async () => {
  const cacheService = {
    getCachedConcept: async () => {
      throw new Error("MongoDB offline");
    },
    saveCachedConcept: async () => {
      throw new Error("MongoDB offline");
    },
  };
  const generation = createConceptGenerationService({
    cacheService,
    geminiService: async () => FIXTURE_FLOWCHART,
  });
  assert.equal(
    (await generation({ input: "photosynthesis" })).source,
    "gemini",
  );
});

test("MongoDB and Gemini unavailable returns a validated fallback", async () => {
  const cacheService = {
    getCachedConcept: async () => {
      throw new Error("MongoDB offline");
    },
    saveCachedConcept: async () => {
      throw new Error("MongoDB offline");
    },
  };
  const generation = createConceptGenerationService({
    cacheService,
    geminiService: async () => {
      throw new Error("Gemini offline");
    },
  });
  const result = await generation({ input: "Explain the French Revolution" });
  assert.equal(result.source, "fallback");
  assert.equal(prepareConcept(result.concept).valid, true);
});

test("Mongo connection returns null when MONGODB_URI is not configured", async () => {
  const originalUri = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  try {
    assert.equal(await getMongoDatabase(), null);
  } finally {
    if (originalUri !== undefined) process.env.MONGODB_URI = originalUri;
  }
});

test("Mongo connection degrades cleanly when the configured server is offline", async () => {
  const originalUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = "mongodb://127.0.0.1:1/conceptflow-test";
  try {
    assert.equal(await getMongoDatabase(), null);
  } finally {
    if (originalUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalUri;
  }
});

test("fallback concept preserves optional learning metadata", () => {
  const concept = generateFallbackConcept({
    input: "Explain photosynthesis",
    subject: "Biology",
    difficulty: "Beginner",
  });
  assert.equal(concept.subject, "Biology");
  assert.equal(concept.difficulty, "Beginner");
});

test("real Express app serves health, validation, preview, and offline generation", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalMongoUri = process.env.MONGODB_URI;
  process.env.GEMINI_API_KEY = "";
  process.env.MONGODB_URI = "";
  const server = app.listen(0);
  await once(server, "listening");

  try {
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;
    const health = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "http://localhost:5174" },
    });
    assert.equal(health.status, 200);
    assert.equal(
      health.headers.get("access-control-allow-origin"),
      "http://localhost:5174",
    );

    const dynamicDevPort = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "http://localhost:57891" },
    });
    assert.equal(dynamicDevPort.status, 200);
    assert.equal(
      dynamicDevPort.headers.get("access-control-allow-origin"),
      "http://localhost:57891",
    );

    const blockedOrigin = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(
      blockedOrigin.headers.get("access-control-allow-origin"),
      null,
    );

    const post = async (path, body) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };

    const validation = await post("/concepts/validate", {
      concept: FIXTURE_FLOWCHART,
    });
    assert.equal(validation.status, 200);
    assert.equal(validation.body.valid, true);

    const preview = await post("/concepts/preview", {
      concept: FIXTURE_FLOWCHART,
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.source, "sample");

    const generated = await post("/concepts/generate", {
      input: "Explain photosynthesis",
    });
    assert.equal(generated.status, 200);
    assert.equal(generated.body.source, "fallback");
    assert.equal(prepareConcept(generated.body.concept).valid, true);

    const explanation = await post("/learning/explanations", {
      concept: FIXTURE_FLOWCHART,
    });
    assert.equal(explanation.status, 200);
    assert.equal(explanation.body.source, "fallback");
    assert.equal(typeof explanation.body.explanation.beginner, "string");

    const quizUnavailable = await post("/learning/quiz", {
      concept: FIXTURE_FLOWCHART,
    });
    assert.equal(quizUnavailable.status, 503);
    assert.equal(quizUnavailable.body.success, false);
    assert.match(quizUnavailable.body.message, /storage.*unavailable/i);
  } finally {
    server.close();
    await once(server, "close");
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    if (originalMongoUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalMongoUri;
  }
});

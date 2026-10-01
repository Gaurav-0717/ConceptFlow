import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { test } from "node:test";
import { createConceptRouter } from "../src/routes/concept.routes.js";
import { createAIConceptService } from "../src/services/aiConceptService.js";
import {
  GeminiServiceError,
  generateConcept as callGemini,
} from "../src/services/geminiService.js";
import {
  FIXTURE_FLOWCHART,
  FIXTURE_CYCLE,
  FIXTURE_TIMELINE,
  FIXTURE_HIERARCHY,
  FIXTURE_SEQUENCE,
} from "../src/fixtures/concept.fixtures.js";

const withApi = async (generateConceptFn, run) => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/concepts", createConceptRouter({ generateConceptFn }));
  const server = app.listen(0);
  await once(server, "listening");

  try {
    const { port } = server.address();
    await run(async (path, body) => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    });
  } finally {
    server.close();
    await once(server, "close");
  }
};

const mockResult = (concept) => async () => ({ text: JSON.stringify(concept) });

const assertGeneratedType = async (fixture, expectedType) => {
  const generate = createAIConceptService({
    generateConceptFn: mockResult(fixture),
  });
  await withApi(generate, async (post) => {
    const { status, body } = await post("/api/concepts/generate", {
      input: "Explain this concept",
    });
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.source, "gemini");
    assert.equal(body.concept.type, expectedType);
  });
};

test("generation accepts a valid flowchart", () =>
  assertGeneratedType(FIXTURE_FLOWCHART, "flowchart"));
test("generation accepts a valid cycle", () =>
  assertGeneratedType(FIXTURE_CYCLE, "cycle"));
test("generation accepts a valid timeline", () =>
  assertGeneratedType(FIXTURE_TIMELINE, "timeline"));
test("generation accepts a valid hierarchy", () =>
  assertGeneratedType(FIXTURE_HIERARCHY, "hierarchy"));
test("generation accepts a valid sequence", () =>
  assertGeneratedType(FIXTURE_SEQUENCE, "sequence"));

test("missing input returns HTTP 400 without calling Gemini", async () => {
  let calls = 0;
  await withApi(
    async () => {
      calls += 1;
    },
    async (post) => {
      const { status, body } = await post("/api/concepts/generate", {});
      assert.equal(status, 400);
      assert.equal(body.errors[0].path, "input");
      assert.equal(calls, 0);
    },
  );
});

test("empty and whitespace-only input return HTTP 400", async () => {
  await withApi(
    async () => assert.fail("Gemini must not be called"),
    async (post) => {
      for (const input of ["", "  \n\t  "]) {
        const { status } = await post("/api/concepts/generate", { input });
        assert.equal(status, 400);
      }
    },
  );
});

test("oversized input returns HTTP 400", async () => {
  await withApi(
    async () => assert.fail("Gemini must not be called"),
    async (post) => {
      const { status, body } = await post("/api/concepts/generate", {
        input: "x".repeat(2001),
      });
      assert.equal(status, 400);
      assert.match(body.message, /2000/);
    },
  );
});

test("malformed model JSON retries once then returns a clean validation failure", async () => {
  let calls = 0;
  const generate = createAIConceptService({
    generateConceptFn: async () => {
      calls += 1;
      return { text: "not JSON" };
    },
  });
  await withApi(generate, async (post) => {
    const { status, body } = await post("/api/concepts/generate", {
      input: "Explain photosynthesis",
    });
    assert.equal(status, 502);
    assert.equal(body.message, "Generated concept validation failed");
    assert.equal(calls, 2);
  });
});

test("schema-invalid model output is rejected", async () => {
  const invalid = { ...FIXTURE_FLOWCHART, title: "" };
  const generate = createAIConceptService({
    generateConceptFn: mockResult(invalid),
  });
  await withApi(generate, async (post) => {
    const { status, body } = await post("/api/concepts/generate", {
      input: "Photosynthesis",
    });
    assert.equal(status, 502);
    assert.equal(body.message, "Generated concept validation failed");
    assert.ok(body.errors.some((error) => error.path.includes("title")));
  });
});

test("semantic-invalid model output is rejected", async () => {
  const invalid = {
    ...FIXTURE_FLOWCHART,
    nodes: [{ id: "only", label: "Only node" }],
    connections: [],
  };
  const generate = createAIConceptService({
    generateConceptFn: mockResult(invalid),
  });
  await withApi(generate, async (post) => {
    const { status, body } = await post("/api/concepts/generate", {
      input: "Photosynthesis",
    });
    assert.equal(status, 502);
    assert.ok(body.errors.some((error) => error.path === "nodes"));
  });
});

test("first invalid response retries with correction and accepts a valid second response", async () => {
  const prompts = [];
  const generate = createAIConceptService({
    generateConceptFn: async (prompt) => {
      prompts.push(prompt);
      return {
        text: JSON.stringify(
          prompts.length === 1
            ? { ...FIXTURE_FLOWCHART, title: "" }
            : FIXTURE_FLOWCHART,
        ),
      };
    },
  });
  await withApi(generate, async (post) => {
    const { status, body } = await post("/api/concepts/generate", {
      input: "Explain photosynthesis",
    });
    assert.equal(status, 200);
    assert.equal(body.concept.type, "flowchart");
    assert.equal(prompts.length, 2);
    assert.match(prompts[1], /previous response did not satisfy/i);
  });
});

test("two invalid model responses return validation errors", async () => {
  const generate = createAIConceptService({
    generateConceptFn: mockResult({ title: "incomplete" }),
  });
  await withApi(generate, async (post) => {
    const { status, body } = await post("/api/concepts/generate", {
      input: "Explain photosynthesis",
    });
    assert.equal(status, 502);
    assert.equal(body.message, "Generated concept validation failed");
    assert.ok(Array.isArray(body.errors) && body.errors.length > 0);
  });
});

test("transient Gemini timeout retries once", async () => {
  let calls = 0;
  const generate = createAIConceptService({
    generateConceptFn: async () => {
      calls += 1;
      if (calls === 1) throw new GeminiServiceError("timeout", 503);
      return { text: JSON.stringify(FIXTURE_FLOWCHART) };
    },
  });
  await withApi(generate, async (post) => {
    const { status } = await post("/api/concepts/generate", {
      input: "Explain photosynthesis",
    });
    assert.equal(status, 200);
    assert.equal(calls, 2);
  });
});

test("Gemini API credential failure is not retried or exposed", async () => {
  let calls = 0;
  const secret = "test-only-provider-secret";
  const generate = createAIConceptService({
    generateConceptFn: async () => {
      calls += 1;
      throw new GeminiServiceError("invalid_credentials", 503);
    },
  });
  await withApi(generate, async (post) => {
    const { status, body } = await post("/api/concepts/generate", {
      input: "Explain photosynthesis",
    });
    assert.equal(status, 503);
    assert.equal(calls, 1);
    assert.doesNotMatch(JSON.stringify(body), new RegExp(secret));
    assert.doesNotMatch(JSON.stringify(body), /stack|filesystem|api.?key/i);
  });
});

test("missing GEMINI_API_KEY fails cleanly before contacting Google", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(callGemini("test prompt"), (error) => {
      assert.equal(error.code, "missing_api_key");
      assert.doesNotMatch(error.message, /key|secret/i);
      return true;
    });
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

test("Gemini adapter uses schema-constrained JSON output without returning its key", async () => {
  const key = "never-return-this-key";
  let request;
  const result = await callGemini("educational prompt", {
    apiKey: key,
    model: "test-model",
    clientFactory: (options) => {
      assert.equal(options.apiKey, key);
      return {
        models: {
          generateContent: async (modelRequest) => {
            request = modelRequest;
            return { text: JSON.stringify(FIXTURE_FLOWCHART) };
          },
        },
      };
    },
  });

  assert.equal(request.model, "test-model");
  assert.equal(request.config.responseMimeType, "application/json");
  assert.ok(
    request.config.responseJsonSchema.properties.type.enum.includes("sequence"),
  );
  assert.equal(result.text, JSON.stringify(FIXTURE_FLOWCHART));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(key));
});

test("Gemini adapter classifies provider timeouts and sanitizes provider errors", async () => {
  const secret = "provider-error-secret";
  await assert.rejects(
    callGemini("educational prompt", {
      apiKey: "server-only-test-key",
      clientFactory: () => ({
        models: {
          generateContent: async () => {
            const error = new Error(secret);
            error.name = "AbortError";
            throw error;
          },
        },
      }),
    }),
    (error) => {
      assert.equal(error.code, "timeout");
      assert.doesNotMatch(error.message, new RegExp(secret));
      assert.doesNotMatch(error.message, /server-only-test-key/);
      return true;
    },
  );

  await assert.rejects(
    callGemini("educational prompt", {
      apiKey: "server-only-test-key",
      clientFactory: () => ({
        models: {
          generateContent: async () => {
            const error = new Error(secret);
            error.status = 401;
            throw error;
          },
        },
      }),
    }),
    (error) => {
      assert.equal(error.code, "invalid_credentials");
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
});

test("existing validate endpoint remains available", async () => {
  await withApi(
    async () => assert.fail("Generation service must not be called"),
    async (post) => {
      const { status, body } = await post("/api/concepts/validate", {
        concept: FIXTURE_FLOWCHART,
      });
      assert.equal(status, 200);
      assert.equal(body.valid, true);
    },
  );
});

test("existing preview endpoint remains available", async () => {
  await withApi(
    async () => assert.fail("Generation service must not be called"),
    async (post) => {
      const { status, body } = await post("/api/concepts/preview", {
        concept: FIXTURE_TIMELINE,
      });
      assert.equal(status, 200);
      assert.equal(body.source, "sample");
    },
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import app from "../src/app.js";
import { getHealth, getReadiness } from "../src/controllers/health.controller.js";
import { errorHandler, sanitizeErrorMessage } from "../src/middleware/errorHandler.js";
import { authRateLimit } from "../src/middleware/authRateLimit.js";
import {
  quizCreationRateLimit,
  quizSubmissionRateLimit,
} from "../src/middleware/quizRateLimit.js";
import { progressRateLimit } from "../src/middleware/progressRateLimit.js";

// Helper for making lightweight HTTP requests
const request = (server, { method = "GET", path = "/", headers = {}, body = null } = {}) => {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const port = typeof addr === "string" ? addr : addr.port;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            // not json
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json || data,
          });
        });
      },
    );
    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
};

// ─── 1. ROUTE-SPECIFIC RATE LIMITING ──────────────────────────────────────────

test("rate limiters return safe 429 status and sanitized json message", async () => {
  const testApp = express();
  testApp.use(express.json());

  // Define route-specific limiter with 1-request threshold to trigger limit cleanly
  const testAuthLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 1,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        success: false,
        message: "Too many sign-in attempts. Please wait and try again.",
      }),
  });

  const testQuizLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 1,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        success: false,
        message:
          "Too many quiz creation requests. Please wait a few minutes and try again.",
      }),
  });

  testApp.post("/test/auth", testAuthLimiter, (req, res) => res.json({ ok: true }));
  testApp.post("/test/quiz-create", testQuizLimiter, (req, res) => res.json({ ok: true }));

  const server = http.createServer(testApp);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));

  try {
    // First request passes
    const okRes = await request(server, { method: "POST", path: "/test/auth" });
    assert.equal(okRes.statusCode, 200);

    // Second request is rejected with 429
    const blockedRes = await request(server, { method: "POST", path: "/test/auth" });
    assert.equal(blockedRes.statusCode, 429);
    assert.equal(blockedRes.body.success, false);
    assert.match(blockedRes.body.message, /too many sign-in attempts/i);
    assert.equal(blockedRes.body.stack, undefined);

    // Quiz creation limit rejected with 429
    await request(server, { method: "POST", path: "/test/quiz-create" });
    const blockedQuiz = await request(server, { method: "POST", path: "/test/quiz-create" });
    assert.equal(blockedQuiz.statusCode, 429);
    assert.equal(blockedQuiz.body.success, false);
    assert.match(blockedQuiz.body.message, /too many quiz creation requests/i);
  } finally {
    server.close();
  }

  // Verify exported production rate limiters are active functions
  assert.equal(typeof authRateLimit, "function");
  assert.equal(typeof quizCreationRateLimit, "function");
  assert.equal(typeof quizSubmissionRateLimit, "function");
  assert.equal(typeof progressRateLimit, "function");
});

// ─── 2. HEALTH & READINESS ENDPOINTS ──────────────────────────────────────────

test("health endpoint reports accurate database status without leaking secrets", () => {
  const originalState = mongoose.connection.readyState;

  try {
    // 1. Emulate connected DB
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 1,
      configurable: true,
    });

    const resConnected = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    getHealth({}, resConnected);
    assert.equal(resConnected.statusCode, 200);
    assert.equal(resConnected.body.success, true);
    assert.equal(resConnected.body.status, "HEALTHY");
    assert.equal(resConnected.body.database, "CONNECTED");

    // 2. Emulate disconnected DB
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 0,
      configurable: true,
    });

    const resDisconnected = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    getHealth({}, resDisconnected);
    assert.equal(resDisconnected.statusCode, 200);
    assert.equal(resDisconnected.body.success, true);
    assert.equal(resDisconnected.body.status, "DEGRADED");
    assert.equal(resDisconnected.body.database, "DISCONNECTED");

    // 3. Readiness check when disconnected returns 503
    const resReadyFail = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    getReadiness({}, resReadyFail);
    assert.equal(resReadyFail.statusCode, 503);
    assert.equal(resReadyFail.body.success, false);
    assert.equal(resReadyFail.body.status, "NOT_READY");

    // 4. Readiness check when connected returns 200
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 1,
      configurable: true,
    });
    const resReadyOk = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    getReadiness({}, resReadyOk);
    assert.equal(resReadyOk.statusCode, 200);
    assert.equal(resReadyOk.body.success, true);
    assert.equal(resReadyOk.body.status, "READY");
  } finally {
    Object.defineProperty(mongoose.connection, "readyState", {
      value: originalState,
      configurable: true,
    });
  }
});

// ─── 3. SECURITY HEADERS AUDIT (HELMET) ──────────────────────────────────────

test("Express app serves security headers from Helmet without breaking API", async () => {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));

  try {
    const res = await request(server, { method: "GET", path: "/api/health" });
    assert.equal(res.statusCode, 200);

    // Verify Helmet security headers
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.equal(res.headers["x-frame-options"], "SAMEORIGIN");
    assert.equal(res.headers["cross-origin-resource-policy"], "cross-origin");
    assert.equal(res.headers["x-dns-prefetch-control"], "off");
    assert.equal(res.headers["x-powered-by"], undefined);
  } finally {
    server.close();
  }
});

// ─── 4. SAFE ERROR HANDLING & SANITIZATION ────────────────────────────────────

test("sanitizeErrorMessage redacts connection URIs, filesystem paths, and secrets", () => {
  const raw1 = "Failed to connect to mongodb+srv://admin:p@ssword@cluster.net/testDB";
  assert.equal(sanitizeErrorMessage(raw1), "Failed to connect to [redacted]");

  const raw2 = "Error at C:\\Users\\Administrator\\Desktop\\ConceptFlow\\server\\src\\index.js:45";
  assert.ok(!sanitizeErrorMessage(raw2).includes("Desktop\\ConceptFlow"));

  const raw3 = "Invalid Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token string";
  assert.ok(!sanitizeErrorMessage(raw3).includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
});

test("errorHandler suppresses 500 internal details and returns safe responses", () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    // 500 error in production
    errorHandler(new Error("Secret DB password error"), {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "An internal server error occurred.");
    assert.equal(res.body.stack, undefined);

    // 400 client error returns sanitized message
    const clientErr = new Error("Invalid input: C:\\sensitive\\path\\data.json");
    clientErr.statusCode = 400;
    errorHandler(clientErr, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.ok(!res.body.message.includes("sensitive\\path"));
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

// ─── 5. CORS PREFLIGHT & ORIGIN VALIDATION ────────────────────────────────────

test("CORS allows configured origins and handles OPTIONS preflight cleanly", async () => {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));

  try {
    // OPTIONS preflight from local development origin
    const preflightRes = await request(server, {
      method: "OPTIONS",
      path: "/api/health",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
      },
    });
    assert.equal(preflightRes.statusCode, 204);
    assert.equal(
      preflightRes.headers["access-control-allow-origin"],
      "http://localhost:5173",
    );

    // Disallowed untrusted origin rejected
    const disallowedRes = await request(server, {
      method: "GET",
      path: "/api/health",
      headers: {
        Origin: "http://malicious-site.example.com",
      },
    });
    // CORS middleware throws Error("Origin is not allowed.") -> 500 safe response
    assert.ok(disallowedRes.statusCode >= 400);
  } finally {
    server.close();
  }
});

import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;
import { test } from "node:test";
import { createAuthRouter } from "../src/routes/auth.routes.js";
import {
  AuthServiceError,
  createAuthService,
} from "../src/services/authService.js";

const TEST_SECRET = "test-only-jwt-secret-with-more-than-thirty-two-characters";

const createUserCollection = () => {
  const documents = [];
  return {
    documents,
    findOne: async (filter) =>
      documents.find((document) =>
        filter.email !== undefined
          ? document.email === filter.email
          : String(document._id) === String(filter._id),
      ) || null,
    insertOne: async (document) => {
      if (documents.some((item) => item.email === document.email)) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
      const insertedId = new ObjectId();
      documents.push({ ...document, _id: insertedId });
      return { insertedId };
    },
  };
};

const createService = (collection = createUserCollection(), options = {}) => ({
  collection,
  service: createAuthService({
    getCollection: async () => collection,
    jwtSecret: TEST_SECRET,
    ...options,
  }),
});

test("registration normalizes fields, hashes passwords, creates JWT, and returns a sanitized user", async () => {
  const { collection, service } = createService();
  const result = await service.register({
    name: "  Student Name  ",
    email: "  Student@Example.COM ",
    password: "correct-horse-battery",
  });
  assert.equal(result.user.name, "Student Name");
  assert.equal(result.user.email, "student@example.com");
  assert.deepEqual(Object.keys(result.user).sort(), ["email", "id", "name"]);
  assert.ok(collection.documents[0].passwordHash);
  assert.notEqual(
    collection.documents[0].passwordHash,
    "correct-horse-battery",
  );
  assert.equal(
    await (
      await import("bcryptjs")
    ).default.compare(
      "correct-horse-battery",
      collection.documents[0].passwordHash,
    ),
    true,
  );
  assert.equal(service.verifyToken(result.token).id, result.user.id);
});

test("duplicate email is rejected after normalization", async () => {
  const { service } = createService();
  await service.register({
    name: "A Student",
    email: "student@example.com",
    password: "password-123",
  });
  await assert.rejects(
    service.register({
      name: "Another Student",
      email: " STUDENT@example.com ",
      password: "password-456",
    }),
    (error) => error instanceof AuthServiceError && error.statusCode === 409,
  );
});

test("invalid registration is rejected before touching storage", async () => {
  let collectionCalls = 0;
  const service = createAuthService({
    getCollection: async () => {
      collectionCalls += 1;
      return createUserCollection();
    },
    jwtSecret: TEST_SECRET,
  });
  await assert.rejects(
    service.register({ name: " ", email: "not-an-email", password: "short" }),
    (error) => error instanceof AuthServiceError && error.statusCode === 400,
  );
  assert.equal(collectionCalls, 0);
});

test("passwords exceeding bcrypt's safe UTF-8 input size are rejected", async () => {
  const { service } = createService();
  await assert.rejects(
    service.register({
      name: "Student",
      email: "student@example.com",
      password: "x".repeat(73),
    }),
    (error) => error instanceof AuthServiceError && error.statusCode === 400,
  );
});

test("login succeeds and invalid email/password share a generic response", async () => {
  const { service } = createService();
  await service.register({
    name: "Student",
    email: "student@example.com",
    password: "password-123",
  });
  const login = await service.login({
    email: " STUDENT@example.com ",
    password: "password-123",
  });
  assert.equal(login.user.email, "student@example.com");
  assert.equal(service.verifyToken(login.token).id, login.user.id);

  for (const input of [
    { email: "student@example.com", password: "wrong-password" },
    { email: "unknown@example.com", password: "wrong-password" },
    { email: "invalid-email", password: "wrong-password" },
  ]) {
    await assert.rejects(service.login(input), (error) => {
      assert.equal(error.statusCode, 401);
      assert.equal(error.message, "Invalid email or password.");
      return true;
    });
  }
});

test("expired and malformed JWTs are rejected without revealing token details", () => {
  const { service } = createService();
  const expired = jwt.sign({ sub: new ObjectId().toString() }, TEST_SECRET, {
    expiresIn: -1,
  });
  for (const token of [expired, "not-a-jwt"]) {
    assert.throws(
      () => service.verifyToken(token),
      (error) => {
        assert.equal(error.statusCode, 401);
        assert.equal(error.message, "Invalid or expired token.");
        return true;
      },
    );
  }
});

test("authentication API registers, logs in, serves /me, and protects the profile", async () => {
  const { service } = createService();
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/auth", createAuthRouter({ service }));
  const server = app.listen(0);
  await once(server, "listening");

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
    const post = async (path, body) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    const missing = await fetch(`${baseUrl}/me`);
    assert.equal(missing.status, 401);

    const registered = await post("/register", {
      name: "  Browser Student ",
      email: " BROWSER@example.com ",
      password: "browser-password",
    });
    assert.equal(registered.status, 201);
    assert.equal(registered.body.user.email, "browser@example.com");
    assert.equal("passwordHash" in registered.body.user, false);

    const profile = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${registered.body.token}` },
    });
    assert.equal(profile.status, 200);
    assert.deepEqual((await profile.json()).user, registered.body.user);

    const login = await post("/login", {
      email: "browser@example.com",
      password: "browser-password",
    });
    assert.equal(login.status, 200);
    const badLogin = await post("/login", {
      email: "browser@example.com",
      password: "bad",
    });
    assert.equal(badLogin.status, 401);
    assert.equal(badLogin.body.message, "Invalid email or password.");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("MongoDB unavailability prevents account creation safely", async () => {
  const service = createAuthService({
    getCollection: async () => null,
    jwtSecret: TEST_SECRET,
  });
  await assert.rejects(
    service.register({
      name: "Student",
      email: "student@example.com",
      password: "password-123",
    }),
    (error) =>
      error instanceof AuthServiceError &&
      error.statusCode === 503 &&
      !/mongodb:|password|stack/i.test(error.message),
  );
});

test("missing JWT secret never creates a token", async () => {
  const { service } = createService(undefined, { jwtSecret: "" });
  await assert.rejects(
    service.register({
      name: "Student",
      email: "student@example.com",
      password: "password-123",
    }),
    (error) => error.statusCode === 503 && !/secret/i.test(error.message),
  );
});

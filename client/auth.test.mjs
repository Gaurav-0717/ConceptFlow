import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validateLoginInput,
  validateRegistrationInput,
} from "./src/services/authValidation.js";
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "./src/services/authSessionService.js";

const validRegistration = {
  name: "Ada Student",
  email: "ada@example.com",
  password: "student-password",
  confirmPassword: "student-password",
};

test("registration validation checks required name, email, password length, byte limit, and confirmation", () => {
  assert.equal(validateRegistrationInput(validRegistration), "");
  assert.match(
    validateRegistrationInput({ ...validRegistration, name: " " }),
    /name/i,
  );
  assert.match(
    validateRegistrationInput({ ...validRegistration, email: "bad" }),
    /email/i,
  );
  assert.match(
    validateRegistrationInput({
      ...validRegistration,
      password: "short",
      confirmPassword: "short",
    }),
    /8 characters/i,
  );
  assert.match(
    validateRegistrationInput({
      ...validRegistration,
      password: "x".repeat(73),
      confirmPassword: "x".repeat(73),
    }),
    /72 bytes/i,
  );
  assert.match(
    validateRegistrationInput({
      ...validRegistration,
      confirmPassword: "different-password",
    }),
    /match/i,
  );
});

test("login validation checks email and non-empty password", () => {
  assert.equal(
    validateLoginInput({ email: "ada@example.com", password: "secret" }),
    "",
  );
  assert.match(
    validateLoginInput({ email: "bad", password: "secret" }),
    /email/i,
  );
  assert.match(
    validateLoginInput({ email: "ada@example.com", password: "" }),
    /password/i,
  );
});

test("session token persists for refresh and clears on logout", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  assert.equal(setAuthToken("signed-test-token", storage), true);
  assert.equal(getAuthToken(storage), "signed-test-token");
  assert.equal(clearAuthToken(storage), true);
  assert.equal(getAuthToken(storage), "");
});

test("session storage denial degrades without throwing", () => {
  const storage = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
    removeItem: () => {
      throw new Error("denied");
    },
  };
  assert.equal(getAuthToken(storage), "");
  assert.equal(setAuthToken("token", storage), false);
  assert.equal(clearAuthToken(storage), false);
});

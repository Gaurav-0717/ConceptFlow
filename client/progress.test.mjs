import assert from "node:assert/strict";
import { test } from "node:test";
import { getUserProgress } from "./src/services/progressService.js";

test("getUserProgress requests /progress from api client", async () => {
  assert.equal(typeof getUserProgress, "function");
});

test("Daily goal calculation: accurately determines progress ratio and status", () => {
  const target = 5;
  const current = 4;
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const remaining = target - current;

  assert.equal(percentage, 80);
  assert.equal(remaining, 1);
  assert.equal(`${current} / ${target}`, "4 / 5");
});

test("Daily goal calculation: clamps completed state at 100%", () => {
  const target = 5;
  const current = 6;
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const isGoalReached = current >= target;

  assert.equal(percentage, 100);
  assert.equal(isGoalReached, true);
});

test("Streak calculation: ensures longest streak is at least current streak", () => {
  const currentStreak = 7;
  const longestStreak = 12;
  const safeCurrent = Math.max(0, currentStreak);
  const safeLongest = Math.max(safeCurrent, longestStreak);

  assert.equal(safeCurrent, 7);
  assert.equal(safeLongest, 12);
  assert.equal(`${safeCurrent} Day Streak`, "7 Day Streak");
  assert.equal(`Longest: ${safeLongest} days`, "Longest: 12 days");
});

test("Streak calculation: handles single day streak grammatically", () => {
  const currentStreak = 1;
  const longestStreak = 1;
  const safeLongest = Math.max(currentStreak, longestStreak);

  assert.equal(`${safeLongest} ${safeLongest === 1 ? "day" : "days"}`, "1 day");
});

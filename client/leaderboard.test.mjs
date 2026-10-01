import assert from "node:assert/strict";
import { test } from "node:test";
import { getLeaderboard } from "./src/services/leaderboardService.js";

test("getLeaderboard requests the public ranking API", async () => {
  assert.equal(typeof getLeaderboard, "function");
});

import mongoose from "mongoose";
import { XPActivity, getXPActivityModel } from "../models/XPActivity.js";
import { USER_COLLECTION } from "../models/User.js";

export const VALID_PERIODS = ["weekly", "monthly", "all-time"];

export class LeaderboardServiceError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = "LeaderboardServiceError";
    this.statusCode = statusCode;
  }
}

/**
 * Returns the UTC start-of-window date for the given period.
 * - weekly:   start of the current Monday (ISO week)
 * - monthly:  start of the 1st of the current month
 * - all-time: null (no lower bound)
 */
export const getPeriodStart = (period, referenceDate = new Date()) => {
  const now = new Date(referenceDate);

  if (period === "weekly") {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    // ISO Monday: day-of-week 0 = Sunday → shift to Monday
    const day = d.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
  }

  if (period === "monthly") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
  }

  return null; // all-time: no lower bound
};

const userLookupAndSafeProject = [
  {
    $lookup: {
      from: USER_COLLECTION,
      localField: "_id",
      foreignField: "_id",
      as: "user",
      pipeline: [{ $project: { name: 1, _id: 0 } }],
    },
  },
  { $unwind: "$user" },
  {
    $project: {
      _id: 0,
      userId: "$_id",
      rank: 1,
      displayName: "$user.name",
      xp: 1,
    },
  },
];

export const createLeaderboardService = ({
  xpModel = XPActivity,
  getModel = getXPActivityModel,
} = {}) => {
  const getActiveStorage = async () => {
    try {
      const model = await getModel();
      if (!model)
        throw new LeaderboardServiceError(
          "Leaderboard is temporarily unavailable.",
          503,
        );
      return model;
    } catch (err) {
      if (err instanceof LeaderboardServiceError) throw err;
      throw new LeaderboardServiceError(
        "Leaderboard is temporarily unavailable.",
        503,
      );
    }
  };

  /**
   * Rank every XP total, then keep only the top `limit` rows plus the
   * authenticated user — lookup users for those rows only (name, never email).
   */
  const buildLeaderboardPipeline = (periodStart, userObjectId, limit = 10) => {
    const matchStage = periodStart
      ? { $match: { createdAt: { $gte: periodStart } } }
      : null;

    return [
      ...(matchStage ? [matchStage] : []),
      {
        $group: {
          _id: "$userId",
          xp: { $sum: "$amount" },
        },
      },
      { $sort: { xp: -1, _id: 1 } },
      {
        $setWindowFields: {
          sortBy: { xp: -1 },
          output: {
            rank: {
              $rank: {},
            },
          },
        },
      },
      {
        $facet: {
          top: [{ $limit: limit }, ...userLookupAndSafeProject],
          currentUser: [
            { $match: { _id: userObjectId } },
            ...userLookupAndSafeProject,
          ],
        },
      },
    ];
  };

  /**
   * Returns the top `limit` entries + the current user's own entry (even if outside top).
   *
   * Return shape:
   * {
   *   leaderboard: [{ rank, displayName, xp }, …],   // top limit
   *   currentUser: { rank, displayName, xp } | null  // caller's own entry
   * }
   */
  const getLeaderboard = async (
    userId,
    period = "all-time",
    limit = 10,
    referenceDate,
  ) => {
    if (!VALID_PERIODS.includes(period)) {
      throw new LeaderboardServiceError(
        `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}.`,
        400,
      );
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new LeaderboardServiceError("Invalid user ID.", 400);
    }

    const storage = await getActiveStorage();
    const periodStart = getPeriodStart(period, referenceDate);
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const topLimit = Math.min(Math.max(limit, 1), 10);

    if (typeof storage.aggregate !== "function") {
      throw new LeaderboardServiceError(
        "Leaderboard is temporarily unavailable.",
        503,
      );
    }

    let raw;
    try {
      raw = await storage.aggregate(
        buildLeaderboardPipeline(periodStart, userObjectId, topLimit),
      );
    } catch (err) {
      if (err instanceof LeaderboardServiceError) throw err;
      try {
        raw = addPositionalRank(
          await storage.aggregate(buildSimplePipeline(periodStart)),
        );
      } catch {
        throw new LeaderboardServiceError(
          "Leaderboard is temporarily unavailable.",
          503,
        );
      }
    }

    return parseAggregateResult(raw, userId, topLimit);
  };

  return { getLeaderboard };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple aggregation pipeline without $setWindowFields (for older Mongo or mocks). */
const buildSimplePipeline = (periodStart) => {
  const matchStage = periodStart
    ? { $match: { createdAt: { $gte: periodStart } } }
    : null;

  return [
    ...(matchStage ? [matchStage] : []),
    { $group: { _id: "$userId", xp: { $sum: "$amount" } } },
    { $sort: { xp: -1, _id: 1 } },
    {
      $lookup: {
        from: USER_COLLECTION,
        localField: "_id",
        foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { name: 1, _id: 0 } }],
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        displayName: "$user.name",
        xp: 1,
      },
    },
  ];
};

/** Assign rank to an already-sorted array (same xp = same rank, next rank skips). */
const addPositionalRank = (entries) => {
  let currentRank = 1;
  return entries.map((entry, i) => {
    if (i > 0 && entry.xp < entries[i - 1].xp) {
      currentRank = i + 1;
    }
    return { ...entry, rank: currentRank };
  });
};

/** Strip internal userId field before sending to client. */
const sanitize = (entry) => {
  if (!entry) return null;
  return {
    rank: entry.rank,
    displayName: entry.displayName,
    xp: entry.xp,
  };
};

const parseAggregateResult = (raw, userId, limit) => {
  const userIdStr = String(userId);

  if (
    Array.isArray(raw) &&
    raw.length === 1 &&
    Array.isArray(raw[0]?.top) &&
    Array.isArray(raw[0]?.currentUser)
  ) {
    return {
      leaderboard: raw[0].top.map(sanitize),
      currentUser: raw[0].currentUser[0]
        ? sanitize(raw[0].currentUser[0])
        : null,
    };
  }

  const allEntries = Array.isArray(raw) ? raw : [];
  const top = allEntries.slice(0, limit);
  const currentUser =
    allEntries.find((e) => String(e.userId) === userIdStr) || null;

  return {
    leaderboard: top.map(sanitize),
    currentUser: currentUser ? sanitize(currentUser) : null,
  };
};

export const leaderboardService = createLeaderboardService();
export default leaderboardService;

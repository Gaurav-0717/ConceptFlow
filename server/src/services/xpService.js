import mongoose from "mongoose";
import { XPActivity, getXPActivityModel } from "../models/XPActivity.js";
import { LearningHistory } from "../models/LearningHistory.js";
import { User, USER_COLLECTION } from "../models/User.js";

export const XP_AMOUNTS = {
  concept_completed: 10,
  explanation_completed: 5,
  quiz_completed: 20,
  high_quiz_score: 10,
  daily_goal: 25,
};

export const DAILY_GOAL_THRESHOLD = 30;

export class XPServiceError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = "XPServiceError";
    this.statusCode = statusCode;
  }
}

const getTodayDateKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

export const createXPService = ({
  xpModel = XPActivity,
  historyModel = LearningHistory,
  userModel = User,
  getModel = getXPActivityModel,
  achievementService: initialAchievements = null,
} = {}) => {
  let activeAchievements = initialAchievements;

  const setAchievementService = (service) => {
    activeAchievements = service;
  };

  const getActiveStorage = async () => {
    try {
      const model = await getModel();
      if (!model)
        throw new XPServiceError("XP storage is temporarily unavailable.", 503);
      return model;
    } catch (err) {
      if (err instanceof XPServiceError) throw err;
      throw new XPServiceError("XP storage is temporarily unavailable.", 503);
    }
  };

  const updateStreakState = async (userId, activityDate = new Date()) => {
    if (!userModel || typeof userModel.findById !== "function") return null;
    const user = await userModel.findById(userId);
    if (!user) return null;

    const today = new Date(activityDate);
    today.setUTCHours(0, 0, 0, 0);

    const lastDate = user.lastActivityDate;
    if (!lastDate) {
      user.currentStreak = 1;
      user.longestStreak = 1;
      user.lastActivityDate = today;
    } else {
      const last = new Date(lastDate);
      last.setUTCHours(0, 0, 0, 0);
      const diffTime = today - last;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        user.currentStreak = (user.currentStreak || 0) + 1;
        if (user.currentStreak > (user.longestStreak || 0)) {
          user.longestStreak = user.currentStreak;
        }
        user.lastActivityDate = today;
      } else if (diffDays > 1) {
        user.currentStreak = 1;
        user.lastActivityDate = today;
      }
    }

    await user.save();
    return user;
  };

  const updateStreak = async (userId, activityDate = new Date()) => {
    const user = await updateStreakState(userId, activityDate);
    return user?.currentStreak ?? null;
  };

  /**
   * Awards XP to a user with deduplication based on actionKey.
   * If an activity with the same actionKey already exists for this user, returns duplicate: true.
   */
  const awardXP = async (userId, reason, options = {}) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new XPServiceError("Invalid user ID.", 400);
    }
    const amount = options.amount ?? XP_AMOUNTS[reason];
    if (typeof amount !== "number" || amount <= 0) {
      throw new XPServiceError(
        `Invalid or unrecognized XP reason: ${reason}`,
        400,
      );
    }

    const storage = await getActiveStorage();
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const actionKey = options.actionKey
      ? String(options.actionKey).trim()
      : null;

    if (actionKey) {
      const existing = await storage.findOne({
        userId: userObjectId,
        actionKey,
      });
      if (existing) {
        return {
          awarded: false,
          duplicate: true,
          amount: 0,
          reason,
          record: existing,
        };
      }
    }

    try {
      let record;
      if (
        typeof storage.create === "function" &&
        typeof storage.insertOne !== "function"
      ) {
        record = await storage.create({
          userId: userObjectId,
          amount,
          reason,
          ...(actionKey ? { actionKey } : {}),
          createdAt: options.createdAt || new Date(),
        });
      } else if (typeof storage.insertOne === "function") {
        const doc = {
          userId: userObjectId,
          amount,
          reason,
          ...(actionKey ? { actionKey } : {}),
          createdAt: options.createdAt || new Date(),
        };
        const inserted = await storage.insertOne(doc);
        record = { ...doc, _id: inserted.insertedId };
      } else {
        record = await storage.create({
          userId: userObjectId,
          amount,
          reason,
          ...(actionKey ? { actionKey } : {}),
          createdAt: options.createdAt || new Date(),
        });
      }

      let dailyGoalAwarded = false;
      if (reason !== "daily_goal" && options.checkDailyGoal !== false) {
        dailyGoalAwarded = await checkAndAwardDailyGoal(
          userId,
          options.createdAt,
          { checkAchievements: false, updateStreak: false },
        );
      }

      let updatedUser;
      try {
        if (options.updateStreak !== false) {
          updatedUser = await updateStreakState(userId, options.createdAt);
        }
      } catch (err) {
        console.warn("Failed to update streak:", err.message);
      }

      if (options.checkAchievements !== false && activeAchievements) {
        try {
          const progress = await getProgress(userId, {
            ...(options.updateStreak === false ? {} : { userDoc: updatedUser }),
          });
          await activeAchievements.checkAchievements(userId, progress);
        } catch (err) {
          console.warn(
            "Failed to check achievements on XP award:",
            err.message,
          );
        }
      }

      return {
        awarded: true,
        duplicate: false,
        amount,
        reason,
        record,
        dailyGoalAwarded,
      };
    } catch (error) {
      if (error?.code === 11000) {
        return {
          awarded: false,
          duplicate: true,
          amount: 0,
          reason,
        };
      }
      throw new XPServiceError("Failed to award XP.", 503);
    }
  };

  /**
   * Awards XP for completing a concept (+10).
   * Deduplicated per conceptId.
   */
  const awardConceptCompleted = async (userId, conceptId, options = {}) => {
    if (!conceptId) return { awarded: false };
    return awardXP(userId, "concept_completed", {
      actionKey: `concept_completed:${conceptId}`,
      ...options,
    });
  };

  /**
   * Awards XP for completing an explanation (+5).
   * Deduplicated per conceptId.
   */
  const awardExplanationCompleted = async (userId, conceptId, options = {}) => {
    if (!conceptId) return { awarded: false };
    return awardXP(userId, "explanation_completed", {
      actionKey: `explanation_completed:${conceptId}`,
      ...options,
    });
  };

  /**
   * Awards XP for completing a quiz (+20), plus a bonus (+10) if score is >= 80%.
   * Deduplicated per quiz session ID or concept ID.
   */
  const awardQuizCompleted = async (
    userId,
    { quizId, conceptId, percentage, ...options },
  ) => {
    const keyPrefix =
      quizId || conceptId || new mongoose.Types.ObjectId().toString();
    const baseResult = await awardXP(userId, "quiz_completed", {
      ...options,
      actionKey: `quiz_completed:${keyPrefix}`,
      checkDailyGoal: false, // will check after high score
      checkAchievements: false,
      updateStreak: false,
    });

    let bonusResult = { awarded: false };
    if (typeof percentage === "number" && percentage >= 80) {
      bonusResult = await awardXP(userId, "high_quiz_score", {
        ...options,
        actionKey: `high_quiz_score:${keyPrefix}`,
        checkDailyGoal: false,
        checkAchievements: false,
        updateStreak: false,
      });
    }

    const dailyGoalAwarded = await checkAndAwardDailyGoal(
      userId,
      options.createdAt,
      { checkAchievements: false, updateStreak: false },
    );

    let updatedUser;
    try {
      updatedUser = await updateStreakState(userId, options.createdAt);
    } catch (err) {
      console.warn("Failed to update streak:", err.message);
    }

    if (options.checkAchievements !== false && activeAchievements) {
      try {
        const progress = await getProgress(userId, { userDoc: updatedUser });
        await activeAchievements.checkAchievements(userId, progress);
      } catch (err) {
        console.warn(
          "Failed to check achievements on quiz completed:",
          err.message,
        );
      }
    }

    const totalXP =
      (baseResult.awarded ? baseResult.amount : 0) +
      (bonusResult.awarded ? bonusResult.amount : 0) +
      (dailyGoalAwarded ? XP_AMOUNTS.daily_goal : 0);

    return {
      awarded: baseResult.awarded || bonusResult.awarded,
      quizXPAwarded: baseResult.awarded,
      highScoreXPAwarded: bonusResult.awarded,
      dailyGoalAwarded,
      totalAwarded: totalXP,
    };
  };

  /**
   * Checks if user has earned at least DAILY_GOAL_THRESHOLD (30) XP today
   * and awards the daily_goal (+25) bonus if not yet awarded today.
   */
  const checkAndAwardDailyGoal = async (
    userId,
    referenceDate = new Date(),
    { checkAchievements = false, updateStreak = false } = {},
  ) => {
    const dateKey = getTodayDateKey(referenceDate);
    const actionKey = `daily_goal:${dateKey}`;

    const storage = await getActiveStorage();
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const alreadyAwarded = await storage.findOne({
      userId: userObjectId,
      actionKey,
    });
    if (alreadyAwarded) return false;

    const startOfToday = new Date(referenceDate);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const endOfToday = new Date(referenceDate);
    endOfToday.setUTCHours(23, 59, 59, 999);

    let todayXP = 0;
    if (typeof storage.aggregate === "function") {
      const result = await storage.aggregate([
        {
          $match: {
            userId: userObjectId,
            reason: { $ne: "daily_goal" },
            createdAt: { $gte: startOfToday, $lte: endOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      todayXP = result[0]?.total || 0;
    } else if (typeof storage.find === "function") {
      const docs = await storage.find({ userId: userObjectId });
      todayXP = docs
        .filter(
          (d) =>
            d.reason !== "daily_goal" &&
            new Date(d.createdAt) >= startOfToday &&
            new Date(d.createdAt) <= endOfToday,
        )
        .reduce((sum, d) => sum + (d.amount || 0), 0);
    }

    if (todayXP >= DAILY_GOAL_THRESHOLD) {
      const award = await awardXP(userId, "daily_goal", {
        actionKey,
        checkDailyGoal: false,
        checkAchievements,
        updateStreak,
      });
      return award.awarded;
    }
    return false;
  };

  /**
   * Calculates overall student progress:
   * - totalXP: all-time XP earned
   * - conceptsCompleted: count of distinct completed concepts
   * - quizzesCompleted: count of quizzes completed
   * - quizAccuracy: overall accuracy across completed quizzes (percentage 0-100)
   * - currentStreak: 0 (for now)
   * - todayXP: XP earned today
   */
  const getProgress = async (userId, { userDoc: suppliedUserDoc } = {}) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new XPServiceError("Invalid user ID.", 400);
    }

    const storage = await getActiveStorage();
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [userDoc, xpTotals, historyData] = await Promise.all([
      // 1. User query for streak
      suppliedUserDoc !== undefined
        ? suppliedUserDoc
        : userModel && typeof userModel.findById === "function"
          ? (async () => {
              const query = userModel.findById(userId);
              const user =
                query && typeof query.lean === "function"
                  ? await query.lean()
                  : await query;
              return user;
            })()
          : null,

      // 2. Total and today's XP in one query
      (async () => {
        if (typeof storage.aggregate === "function") {
          const totalResult = await storage.aggregate([
            { $match: { userId: userObjectId } },
            {
              $group: {
                _id: null,
                totalXP: { $sum: "$amount" },
                todayXP: {
                  $sum: {
                    $cond: [
                      { $gte: ["$createdAt", startOfToday] },
                      "$amount",
                      0,
                    ],
                  },
                },
              },
            },
          ]);
          return {
            totalXP: totalResult[0]?.totalXP || 0,
            todayXP: totalResult[0]?.todayXP || 0,
          };
        }
        if (typeof storage.find === "function") {
          const docs = await storage.find({ userId: userObjectId });
          return (docs || []).reduce(
            (totals, document) => {
              totals.totalXP += document.amount || 0;
              if (new Date(document.createdAt) >= startOfToday) {
                totals.todayXP += document.amount || 0;
              }
              return totals;
            },
            { totalXP: 0, todayXP: 0 },
          );
        }
        return { totalXP: 0, todayXP: 0 };
      })(),

      // 4. Learning History
      (async () => {
        if (!historyModel || typeof historyModel.find !== "function") {
          return {
            conceptsCompleted: 0,
            quizzesCompleted: 0,
            quizAccuracy: 0,
          };
        }
        try {
          let query = historyModel.find({
            $or: [{ userId: userObjectId }, { userId: String(userId) }],
          });
          if (query && typeof query.select === "function") {
            query = query.select(
              "conceptId completed quizScore quizTotal isVerified migrationKey",
            );
          }
          const historyDocs =
            query && typeof query.lean === "function"
              ? await query.lean()
              : await query;

          if (!Array.isArray(historyDocs)) {
            return {
              conceptsCompleted: 0,
              quizzesCompleted: 0,
              quizAccuracy: 0,
            };
          }

          const completedConcepts = new Set();
          let quizCount = 0;
          let totalScore = 0;
          let totalQuestions = 0;

          for (const doc of historyDocs) {
            // Migration / untrusted security: only verified records count toward authoritative progress.
            // Exclude records that are unverified (isVerified: false), migrated (migrationKey present or completed: false).
            const isUnverified =
              doc.isVerified === false ||
              doc.completed === false ||
              Boolean(doc.migrationKey);

            if (isUnverified) {
              continue;
            }

            if (doc.completed && doc.conceptId) {
              completedConcepts.add(doc.conceptId);
            }
            if (doc.quizScore !== undefined && doc.quizScore !== null) {
              quizCount += 1;
              totalScore += Number(doc.quizScore) || 0;
              totalQuestions +=
                Number(doc.quizTotal) ||
                (Number(doc.quizScore) ? Number(doc.quizScore) : 0);
            }
          }

          return {
            conceptsCompleted: completedConcepts.size,
            quizzesCompleted: quizCount,
            quizAccuracy:
              totalQuestions > 0
                ? Math.round((totalScore / totalQuestions) * 100)
                : 0,
          };
        } catch {
          return {
            conceptsCompleted: 0,
            quizzesCompleted: 0,
            quizAccuracy: 0,
          };
        }
      })(),
    ]);

    let currentStreak = 0;
    let longestStreak = 0;
    if (userDoc) {
      currentStreak = userDoc.currentStreak || 0;
      longestStreak = userDoc.longestStreak || 0;
      if (longestStreak < currentStreak) longestStreak = currentStreak;
    }

    return {
      totalXP: xpTotals.totalXP,
      conceptsCompleted: historyData.conceptsCompleted,
      quizzesCompleted: historyData.quizzesCompleted,
      quizAccuracy: historyData.quizAccuracy,
      currentStreak,
      longestStreak,
      todayXP: xpTotals.todayXP,
    };
  };

  /**
   * Retrieves the top users by total XP.
   */
  const getLeaderboard = async (limit = 10) => {
    const storage = await getActiveStorage();
    if (typeof storage.aggregate !== "function") return [];

    try {
      return await storage.aggregate([
        {
          $group: {
            _id: "$userId",
            totalXP: { $sum: "$amount" },
          },
        },
        { $sort: { totalXP: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: USER_COLLECTION,
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            userId: "$_id",
            name: "$user.name",
            totalXP: 1,
            _id: 0,
          },
        },
      ]);
    } catch (error) {
      console.error("Leaderboard error:", error);
      return [];
    }
  };

  return {
    awardXP,
    awardConceptCompleted,
    awardExplanationCompleted,
    awardQuizCompleted,
    checkAndAwardDailyGoal,
    getProgress,
    getLeaderboard,
    updateStreak,
    setAchievementService,
  };
};

export const xpService = createXPService();

export default xpService;

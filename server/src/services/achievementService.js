import mongoose from "mongoose";
import { UserAchievement } from "../models/UserAchievement.js";
import { xpService } from "./xpService.js";

export const ACHIEVEMENT_RULES = {
  first_concept: (progress) => progress.conceptsCompleted >= 1,
  first_quiz: (progress) => progress.quizzesCompleted >= 1,
  quiz_master: (progress) => progress.quizzesCompleted >= 5,
  streak_3: (progress) => progress.currentStreak >= 3,
  streak_7: (progress) => progress.currentStreak >= 7,
  xp_100: (progress) => progress.totalXP >= 100,
  xp_500: (progress) => progress.totalXP >= 500,
};

const toPublicAchievement = (doc) => ({
  achievementId: doc.achievementId,
  unlockedAt: doc.unlockedAt || doc.createdAt,
});

export const createAchievementService = ({
  achievementModel = UserAchievement,
  progressService = xpService,
} = {}) => {
  const checkAchievements = async (userId, existingProgress = null) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];

    const progress =
      existingProgress || (await progressService.getProgress(userId));
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const query = achievementModel.find({ userId: userObjectId });
    const unlocked =
      query && typeof query.lean === "function"
        ? await query.lean()
        : await query;
    const unlockedIds = new Set((unlocked || []).map((a) => a.achievementId));

    const newlyUnlocked = [];

    for (const [achievementId, rule] of Object.entries(ACHIEVEMENT_RULES)) {
      if (!unlockedIds.has(achievementId) && rule(progress)) {
        try {
          await achievementModel.create({
            userId: userObjectId,
            achievementId,
          });
          newlyUnlocked.push(achievementId);
        } catch (error) {
          // ignore duplicate key errors (11000)
          if (error?.code !== 11000) {
            console.error(
              `Failed to unlock achievement ${achievementId} for user ${userId}:`,
              error,
            );
            throw error;
          }
        }
      }
    }

    return newlyUnlocked;
  };

  const getUserAchievements = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    try {
      const query = achievementModel.find({
        userId: new mongoose.Types.ObjectId(userId),
      });
      const docs =
        query && typeof query.lean === "function"
          ? await query.lean()
          : await query;
      if (!Array.isArray(docs)) return [];

      return docs
        .map(toPublicAchievement)
        .sort((a, b) => {
          const timeA = new Date(a.unlockedAt || 0).getTime();
          const timeB = new Date(b.unlockedAt || 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return a.achievementId.localeCompare(b.achievementId);
        });
    } catch {
      return [];
    }
  };

  return {
    checkAchievements,
    getUserAchievements,
  };
};

export const achievementService = createAchievementService();
if (xpService?.setAchievementService) {
  xpService.setAchievementService(achievementService);
}
export default achievementService;

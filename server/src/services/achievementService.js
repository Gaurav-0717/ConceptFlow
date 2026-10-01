import mongoose from "mongoose";
import { UserAchievement } from "../models/UserAchievement.js";
import { xpService } from "./xpService.js";

export const ACHIEVEMENT_RULES = {
  first_concept: (progress) => progress.conceptsCompleted >= 1,
  first_quiz: (progress) => progress.quizzesCompleted >= 1,
  streak_3: (progress) => progress.currentStreak >= 3,
  streak_7: (progress) => progress.currentStreak >= 7,
  xp_100: (progress) => progress.totalXP >= 100,
  xp_500: (progress) => progress.totalXP >= 500,
};

export const createAchievementService = ({
  achievementModel = UserAchievement,
  progressService = xpService,
} = {}) => {
  const checkAchievements = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];

    try {
      const progress = await progressService.getProgress(userId);
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const unlocked = await achievementModel.find({ userId: userObjectId }).lean();
      const unlockedIds = new Set(unlocked.map((a) => a.achievementId));

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
            // ignore duplicate key errors
            if (error.code !== 11000) {
              console.error(`Failed to unlock achievement ${achievementId} for user ${userId}:`, error);
            }
          }
        }
      }

      return newlyUnlocked;
    } catch (error) {
      console.error(`Error checking achievements for user ${userId}:`, error);
      return [];
    }
  };

  const getUserAchievements = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    try {
      return await achievementModel.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
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
export default achievementService;

import { xpService } from "../services/xpService.js";
import { achievementService } from "../services/achievementService.js";

export const createProgressControllers = ({ 
  service = xpService, 
  achievements = achievementService 
} = {}) => ({
  getProgress: async (req, res) => {
    try {
      // Step 2 & 6: Fetch existing progress and achievements in parallel.
      // Newly unlocked achievements are triggered immediately on server activity, not during GET.
      const [progress, userAchievements] = await Promise.all([
        service.getProgress(req.user.id),
        achievements.getUserAchievements(req.user.id),
      ]);

      return res.status(200).json({
        success: true,
        totalXP: progress.totalXP,
        conceptsCompleted: progress.conceptsCompleted,
        quizzesCompleted: progress.quizzesCompleted,
        quizAccuracy: progress.quizAccuracy,
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        todayXP: progress.todayXP,
        achievements: userAchievements,
        progress,
      });
    } catch {
      return res.status(503).json({
        success: false,
        message: "Student progress is temporarily unavailable.",
      });
    }
  },
});

const defaultControllers = createProgressControllers();
export const getProgressController = defaultControllers.getProgress;
export default defaultControllers;

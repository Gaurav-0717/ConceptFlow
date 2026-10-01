import { xpService } from "../services/xpService.js";
import { achievementService } from "../services/achievementService.js";

export const createProgressControllers = ({ 
  service = xpService, 
  achievements = achievementService 
} = {}) => ({
  getProgress: async (req, res) => {
    try {
      // Check for any newly unlocked achievements before fetching
      await achievements.checkAchievements(req.user.id);
      
      const progress = await service.getProgress(req.user.id);
      const userAchievements = await achievements.getUserAchievements(req.user.id);

      return res.status(200).json({
        success: true,
        totalXP: progress.totalXP,
        conceptsCompleted: progress.conceptsCompleted,
        quizzesCompleted: progress.quizzesCompleted,
        quizAccuracy: progress.quizAccuracy,
        currentStreak: progress.currentStreak,
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

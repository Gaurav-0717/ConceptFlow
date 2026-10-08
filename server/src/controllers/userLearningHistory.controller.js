import {
  historyMigrationRequestSchema,
  learningActivityRequestSchema,
} from "../validation/learningHistory.schema.js";
import {
  UserHistoryError,
  userLearningHistoryService,
} from "../services/userLearningHistoryService.js";
import { xpService } from "../services/xpService.js";

const respondWithHistoryError = (res, error) => {
  const status = error instanceof UserHistoryError ? error.statusCode : 503;

  const message =
    error instanceof UserHistoryError
      ? error.message
      : "Learning history is temporarily unavailable.";

  console.error("[LearningHistory]", {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    statusCode: error?.statusCode,
    stack: error?.stack,
  });

  return res.status(status).json({ success: false, message });
};

export const createUserLearningHistoryControllers = ({
  service = userLearningHistoryService,
} = {}) => ({
  create: async (req, res) => {
    const parsed = learningActivityRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, message: "Learning activity is invalid." });
    }
    try {
      // Security: Client cannot self-report completion, quiz scores, or arbitrary XP.
      // Visiting/studying a concept creates an exploratory activity (completed: false).
      // Completed concepts and quiz scores must come through verified server actions.
      const {
        quizScore: _ignoredQuizScore,
        quizTotal: _ignoredQuizTotal,
        quizPercentage: _ignoredQuizPercentage,
        completed: _ignoredCompleted,
        xp: _ignoredXP,
        score: _ignoredScore,
        ...activityData
      } = parsed.data;

      const activity = await service.createActivity(req.user.id, {
        ...activityData,
        completed: false,
      });

      return res.status(201).json({ success: true, activity });
    } catch (error) {
      return respondWithHistoryError(res, error);
    }
  },

  list: async (req, res) => {
    try {
      const history = await service.listActivities(req.user.id);
      return res.status(200).json({ success: true, history });
    } catch (error) {
      return respondWithHistoryError(res, error);
    }
  },

  get: async (req, res) => {
    try {
      const activity = await service.getActivity(req.user.id, req.params.id);
      if (!activity)
        return res
          .status(404)
          .json({
            success: false,
            message: "Learning activity was not found.",
          });
      return res.status(200).json({ success: true, activity });
    } catch (error) {
      return respondWithHistoryError(res, error);
    }
  },

  remove: async (req, res) => {
    try {
      const deleted = await service.deleteActivity(req.user.id, req.params.id);
      if (!deleted)
        return res
          .status(404)
          .json({
            success: false,
            message: "Learning activity was not found.",
          });
      return res.status(200).json({ success: true });
    } catch (error) {
      return respondWithHistoryError(res, error);
    }
  },

  migrate: async (req, res) => {
    const parsed = historyMigrationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          success: false,
          message: "History migration request is invalid.",
        });
    }
    try {
      const result = await service.migrateActivities(
        req.user.id,
        parsed.data.items,
      );
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return respondWithHistoryError(res, error);
    }
  },
});

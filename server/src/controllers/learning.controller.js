import { LearningContentError } from "../services/learningContentService.js";
import { QuizSessionError } from "../services/quizService.js";
import { learningContentService } from "../services/learningContentService.js";
import { quizService } from "../services/quizService.js";
import { xpService } from "../services/xpService.js";
import { learningLevelSchema } from "../validation/learningHistory.schema.js";

const respondWithSafeError = (res, error) => {
  const status =
    error instanceof LearningContentError || error instanceof QuizSessionError
      ? error.statusCode
      : 503;
  const message =
    error instanceof LearningContentError || error instanceof QuizSessionError
      ? error.message
      : "Learning tools are temporarily unavailable. Please try again.";
  return res.status(status).json({ success: false, message });
};

export const createLearningControllers = ({
  contentService = learningContentService,
  quizzes = quizService,
} = {}) => ({
  generateExplanation: async (req, res) => {
    try {
      const result = await contentService.generateExplanation(
        req.body?.concept,
      );
      if (req.user?.id && req.body?.concept?.id) {
        await xpService
          .awardExplanationCompleted(req.user.id, req.body.concept.id)
          .catch(() => {});
      }
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return respondWithSafeError(res, error);
    }
  },

  createQuiz: async (req, res) => {
    const explanationLevel = req.body?.explanationLevel;
    if (
      explanationLevel !== undefined &&
      !learningLevelSchema.safeParse(explanationLevel).success
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Explanation level is invalid." });
    }
    try {
      const result = await quizzes.createQuiz(req.body?.concept, {
        userId: req.user?.id,
        explanationLevel,
      });
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return respondWithSafeError(res, error);
    }
  },

  submitQuiz: async (req, res) => {
    try {
      const result = await quizzes.submitQuiz(
        req.params.quizId,
        req.body?.answers,
        { userId: req.user?.id },
      );
      return res.status(200).json({ success: true, result });
    } catch (error) {
      return respondWithSafeError(res, error);
    }
  },
});

const controllers = createLearningControllers();
export const generateExplanationController = controllers.generateExplanation;
export const createQuizController = controllers.createQuiz;
export const submitQuizController = controllers.submitQuiz;

import { randomUUID } from "node:crypto";
import {
  quizAnswersSchema,
  quizSchema,
} from "../validation/learning.schema.js";
import { prepareConcept } from "./conceptService.js";
import { learningContentService } from "./learningContentService.js";
import { userLearningHistoryService } from "./userLearningHistoryService.js";
import { xpService } from "./xpService.js";

const QUIZ_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export class QuizSessionError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "QuizSessionError";
    this.statusCode = statusCode;
  }
}

export const createQuizService = ({
  contentService = learningContentService,
  now = () => Date.now(),
  idFactory = randomUUID,
  onCompleted = async () => false,
} = {}) => {
  const sessions = new Map();

  const pruneExpiredSessions = () => {
    const currentTime = now();
    for (const [id, session] of sessions) {
      if (session.expiresAt <= currentTime) sessions.delete(id);
    }
  };

  const createQuiz = async (rawConcept, { userId, explanationLevel } = {}) => {
    pruneExpiredSessions();
    const conceptResult = prepareConcept(rawConcept);
    if (!conceptResult.valid)
      throw new QuizSessionError("A valid concept is required.", 400);
    const concept = conceptResult.concept;
    const result = await contentService.generateQuiz(concept);
    const parsed = quizSchema.safeParse(result.quiz);
    if (!parsed.success)
      throw new QuizSessionError("A valid quiz could not be created.", 503);

    const quizId = idFactory();
    const expiresAt = now() + QUIZ_SESSION_TTL_MS;
    sessions.set(quizId, {
      quiz: parsed.data,
      expiresAt,
      ...(userId ? { userId } : {}),
      ...(explanationLevel ? { explanationLevel } : {}),
      source: result.source,
      concept,
    });
    return {
      quizId,
      source: result.source,
      quiz: {
        questions: parsed.data.questions.map(({ id, question, options }) => ({
          id,
          question,
          options,
        })),
      },
    };
  };

  const submitQuiz = async (quizId, rawAnswers, { userId } = {}) => {
    pruneExpiredSessions();
    const session = sessions.get(quizId);
    if (!session)
      throw new QuizSessionError(
        "This quiz has expired. Start a new quiz to continue.",
        404,
      );
    if (session.userId && session.userId !== userId) {
      throw new QuizSessionError("This quiz session was not found.", 404);
    }

    const questionIds = new Set(
      session.quiz.questions.map((question) => question.id),
    );
    if (
      !rawAnswers ||
      typeof rawAnswers !== "object" ||
      Array.isArray(rawAnswers)
    ) {
      throw new QuizSessionError("Submit one valid answer for each question.");
    }
    if (
      Object.keys(rawAnswers).some((questionId) => !questionIds.has(questionId))
    ) {
      throw new QuizSessionError("Quiz answers do not match this quiz.");
    }
    const answersResult = quizAnswersSchema.safeParse(rawAnswers);
    if (!answersResult.success)
      throw new QuizSessionError("Submit one valid answer for each question.");

    const details = session.quiz.questions.map((question) => {
      const selectedAnswerIndex = answersResult.data[question.id];
      if (selectedAnswerIndex === undefined)
        throw new QuizSessionError("Answer every question before submitting.");
      return {
        questionId: question.id,
        selectedAnswerIndex,
        correctAnswerIndex: question.correctAnswerIndex,
        correct: selectedAnswerIndex === question.correctAnswerIndex,
        explanation: question.explanation,
      };
    });

    const score = details.filter((answer) => answer.correct).length;
    sessions.delete(quizId);
    const result = {
      score,
      total: details.length,
      percentage: Math.round((score / details.length) * 100),
      answers: details,
    };
    if (session.userId) {
      try {
        result.historySaved = Boolean(
          await onCompleted({
            userId: session.userId,
            concept: session.concept,
            explanationLevel: session.explanationLevel,
            result,
            source: session.source,
            quizId,
          }),
        );
      } catch {
        result.historySaved = false;
      }
    }
    return result;
  };

  return { createQuiz, submitQuiz };
};

export const quizService = createQuizService({
  onCompleted: async ({
    userId,
    concept,
    explanationLevel,
    source,
    result,
    quizId,
  }) => {
    await userLearningHistoryService.saveQuizResult({
      userId,
      concept,
      explanationLevel,
      source,
      score: result.score,
      total: result.total,
      percentage: result.percentage,
    });
    try {
      await xpService.awardQuizCompleted(userId, {
        quizId,
        conceptId: concept?.id,
        percentage: result.percentage,
      });
    } catch {
      // Best effort: XP award failure does not block quiz result
    }
    return true;
  },
});

export default { createQuizService, quizService };

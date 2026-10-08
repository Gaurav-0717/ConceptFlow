import { randomUUID } from "node:crypto";
import {
  quizAnswersSchema,
  quizSchema,
} from "../validation/learning.schema.js";
import { QuizSession, getQuizSessionModel } from "../models/QuizSession.js";
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
  model = QuizSession,
  getModel = getQuizSessionModel,
  getCollection,
  now = () => Date.now(),
  idFactory = randomUUID,
  onCompleted = async () => false,
} = {}) => {
  const getActiveStorage = async () => {
    try {
      const storage = getCollection
        ? await getCollection()
        : await getModel(model);
      if (!storage) {
        throw new QuizSessionError(
          "Quiz session storage is temporarily unavailable.",
          503,
        );
      }
      return storage;
    } catch (error) {
      if (error instanceof QuizSessionError) throw error;
      throw new QuizSessionError(
        "Quiz session storage is temporarily unavailable.",
        503,
      );
    }
  };

  const readQuery = async (query) =>
    query && typeof query.lean === "function" ? query.lean() : query;

  const readOne = async (storage, filter) => readQuery(storage.findOne(filter));

  const consumeOne = async (storage, filter) => {
    const result = await readQuery(storage.findOneAndDelete(filter));
    return result && Object.hasOwn(result, "value") ? result.value : result;
  };

  const persistSession = async (storage, document) => {
    if (typeof storage.create === "function") return storage.create(document);
    if (typeof storage.insertOne === "function")
      return storage.insertOne(document);
    throw new Error("Quiz session storage does not support creation.");
  };

  const toPublicQuiz = (session) => ({
    quizId: session.quizId,
    source: session.source,
    expiresAt: session.expiresAt,
    concept: session.concept,
    quiz: {
      questions: session.quiz.questions.map(({ id, question, options }) => ({
        id,
        question,
        options,
      })),
    },
  });

  const storageError = () =>
    new QuizSessionError(
      "Quiz session storage is temporarily unavailable.",
      503,
    );

  const createQuiz = async (rawConcept, { userId, explanationLevel } = {}) => {
    const conceptResult = prepareConcept(rawConcept);
    if (!conceptResult.valid)
      throw new QuizSessionError("A valid concept is required.", 400);
    const storage = await getActiveStorage();
    const concept = conceptResult.concept;
    const result = await contentService.generateQuiz(concept);
    const parsed = quizSchema.safeParse(result.quiz);
    if (!parsed.success)
      throw new QuizSessionError("A valid quiz could not be created.", 503);

    const quizId = idFactory();
    const session = {
      quizId,
      quiz: parsed.data,
      expiresAt: new Date(now() + QUIZ_SESSION_TTL_MS),
      ...(userId ? { userId } : {}),
      ...(explanationLevel ? { explanationLevel } : {}),
      source: result.source,
      concept,
    };
    try {
      await persistSession(storage, session);
    } catch {
      throw storageError();
    }
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

  const getQuiz = async (quizId, { userId } = {}) => {
    const storage = await getActiveStorage();
    let session;
    try {
      session = await readOne(storage, { quizId });
    } catch {
      throw storageError();
    }
    if (
      !session ||
      new Date(session.expiresAt).getTime() <= now() ||
      (session.userId && String(session.userId) !== String(userId))
    ) {
      throw new QuizSessionError("This quiz session was not found.", 404);
    }
    return toPublicQuiz(session);
  };

  const submitQuiz = async (quizId, rawAnswers, { userId } = {}) => {
    const storage = await getActiveStorage();
    let session;
    try {
      session = await readOne(storage, { quizId });
    } catch {
      throw storageError();
    }
    if (!session)
      throw new QuizSessionError(
        "This quiz has expired. Start a new quiz to continue.",
        404,
      );
    if (new Date(session.expiresAt).getTime() <= now()) {
      throw new QuizSessionError(
        "This quiz has expired. Start a new quiz to continue.",
        404,
      );
    }
    if (session.userId && String(session.userId) !== String(userId)) {
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

    const consumeFilter = {
      quizId,
      expiresAt: { $gt: new Date(now()) },
      ...(session.userId ? { userId: session.userId } : {}),
    };
    let consumedSession;
    try {
      consumedSession = await consumeOne(storage, consumeFilter);
    } catch {
      throw storageError();
    }
    if (!consumedSession)
      throw new QuizSessionError(
        "This quiz has expired. Start a new quiz to continue.",
        404,
      );

    const details = consumedSession.quiz.questions.map((question) => {
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
    const result = {
      score,
      total: details.length,
      percentage: Math.round((score / details.length) * 100),
      answers: details,
    };
    if (consumedSession.userId) {
      try {
        result.historySaved = Boolean(
          await onCompleted({
            userId: String(consumedSession.userId),
            concept: consumedSession.concept,
            explanationLevel: consumedSession.explanationLevel,
            result,
            source: consumedSession.source,
            quizId,
          }),
        );
      } catch {
        result.historySaved = false;
      }
    }
    return result;
  };

  return { createQuiz, getQuiz, submitQuiz };
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
    if (concept?.id) {
      await xpService
        .awardConceptCompleted(userId, concept.id, {
          checkAchievements: false,
          updateStreak: false,
        })
        .catch(() => {});
    }
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

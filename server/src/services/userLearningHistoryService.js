import mongoose from "mongoose";
import { prepareConcept } from "./conceptService.js";
import {
  learningActivityRequestSchema,
  historyMigrationItemSchema,
} from "../validation/learningHistory.schema.js";
import {
  LearningHistory,
  getLearningHistoryModel,
} from "../models/LearningHistory.js";

export class UserHistoryError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = "UserHistoryError";
    this.statusCode = statusCode;
  }
}

const toPublicActivity = (document) => ({
  id: String(document._id || document.id),
  conceptId: document.conceptId,
  title: document.title,
  type: document.type,
  summary: document.summary,
  visualizationType: document.visualizationType,
  concept: document.concept,
  ...(document.explanationLevel
    ? { explanationLevel: document.explanationLevel }
    : {}),
  ...(document.source ? { source: document.source } : {}),
  ...(document.quizScore !== undefined
    ? {
        quizScore: document.quizScore,
        quizTotal: document.quizTotal,
        quizPercentage: document.quizPercentage,
      }
    : {}),
  completed: document.completed,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

export const createUserLearningHistoryService = ({
  model = LearningHistory,
  getModel = getLearningHistoryModel,
  getCollection,
  now = () => new Date(),
  idFactory = () => new mongoose.Types.ObjectId(),
} = {}) => {
  const getActiveStorage = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new UserHistoryError("Authenticated user is invalid.", 401);
    }
    try {
      if (getCollection) {
        const col = await getCollection();
        if (!col) {
          throw new UserHistoryError(
            "Learning history storage is temporarily unavailable.",
            503,
          );
        }
        return col;
      }
      const activeModel = await getModel();
      if (!activeModel) {
        throw new UserHistoryError(
          "Learning history storage is temporarily unavailable.",
          503,
        );
      }
      return activeModel;
    } catch (error) {
      if (error instanceof UserHistoryError) throw error;
      throw new UserHistoryError(
        "Learning history storage is temporarily unavailable.",
        503,
      );
    }
  };

  const makeDocument = (userId, activity, { migrationKey, createdAt } = {}) => {
    const parsed = learningActivityRequestSchema.safeParse(activity);
    if (!parsed.success)
      throw new UserHistoryError("Learning activity is invalid.", 400);
    const conceptResult = prepareConcept(parsed.data.concept);
    if (!conceptResult.valid)
      throw new UserHistoryError("A valid concept is required.", 400);
    const concept = conceptResult.concept;
    const timestamp = now();

    return {
      userId,
      conceptId: concept.id,
      title: concept.title.slice(0, 160),
      type: concept.type,
      summary: concept.summary,
      visualizationType: concept.type,
      concept,
      ...(parsed.data.explanationLevel
        ? { explanationLevel: parsed.data.explanationLevel }
        : {}),
      ...(parsed.data.source ? { source: parsed.data.source } : {}),
      ...(parsed.data.quizScore !== undefined
        ? {
            quizScore: parsed.data.quizScore,
            quizTotal: parsed.data.quizTotal,
            quizPercentage: parsed.data.quizPercentage,
          }
        : {}),
      completed: parsed.data.completed ?? parsed.data.quizScore !== undefined,
      ...(migrationKey ? { migrationKey } : {}),
      createdAt: createdAt || timestamp,
      updatedAt: timestamp,
    };
  };

  const createActivity = async (userId, activity) => {
    const storage = await getActiveStorage(userId);
    const document = makeDocument(userId, activity);

    if (typeof storage.create === "function" && typeof storage.insertOne !== "function") {
      const created = await storage.create(document);
      return toPublicActivity(created);
    }

    if (typeof storage.insertOne === "function") {
      const inserted = await storage.insertOne(document);
      return toPublicActivity({
        ...document,
        _id: inserted.insertedId || idFactory(),
      });
    }

    const created = await storage.create(document);
    return toPublicActivity(created);
  };

  const saveQuizResult = async ({
    userId,
    concept,
    explanationLevel,
    score,
    source,
    total,
    percentage,
  }) =>
    createActivity(userId, {
      concept,
      explanationLevel,
      source,
      completed: true,
      quizScore: score,
      quizTotal: total,
      quizPercentage: percentage,
    });

    const listActivities = async (userId) => {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new UserHistoryError(
          "Authenticated user is invalid.",
          401
        );
      }
    
      const storage = await getActiveStorage(userId);
    
      const userObjectId = new mongoose.Types.ObjectId(userId);
    
      const documents = await storage
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    
      return documents.map(toPublicActivity);
    };

  const getActivity = async (userId, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const storage = await getActiveStorage(userId);
    const activityObjectId = new mongoose.Types.ObjectId(id);

    let document;
    if (typeof storage.findOne === "function") {
      const query = storage.findOne({ _id: activityObjectId, userId });
      document =
        query && typeof query.lean === "function" ? await query.lean() : await query;
    }
    return document ? toPublicActivity(document) : null;
  };

  const deleteActivity = async (userId, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const storage = await getActiveStorage(userId);
    const activityObjectId = new mongoose.Types.ObjectId(id);

    const result = await storage.deleteOne({ _id: activityObjectId, userId });
    return (result?.deletedCount ?? 0) === 1;
  };

  const migrateActivities = async (userId, rawItems) => {
    if (!Array.isArray(rawItems) || rawItems.length > 50) {
      throw new UserHistoryError(
        "History migration can include at most 50 entries.",
        400,
      );
    }
    const storage = await getActiveStorage(userId);
    let migrated = 0;
    let skipped = 0;

    for (const rawItem of rawItems) {
      const parsed = historyMigrationItemSchema.safeParse(rawItem);
      if (!parsed.success) {
        skipped += 1;
        continue;
      }
      const item = parsed.data;
      const quiz = item.latestQuizScore;
      const document = makeDocument(
        userId,
        {
          concept: item.concept,
          explanationLevel: item.explanationLevel,
          source: item.source,
          completed: Boolean(quiz),
          ...(quiz
            ? {
                quizScore: quiz.score,
                quizTotal: quiz.total,
                quizPercentage: quiz.percentage,
              }
            : {}),
        },
        {
          migrationKey: item.migrationKey,
          createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
        },
      );

      const result = await storage.updateOne(
        { userId, migrationKey: item.migrationKey },
        { $setOnInsert: document },
        { upsert: true },
      );
      if (result.upsertedCount === 1) migrated += 1;
    }
    return { migrated, skipped };
  };

  return {
    createActivity,
    saveQuizResult,
    listActivities,
    getActivity,
    deleteActivity,
    migrateActivities,
  };
};

export const userLearningHistoryService = createUserLearningHistoryService();

export default { createUserLearningHistoryService, userLearningHistoryService };

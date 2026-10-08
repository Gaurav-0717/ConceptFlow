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
  completed: Boolean(document.completed),
  isVerified: Boolean(document.isVerified),
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

  const makeDocument = (
    userId,
    activity,
    { migrationKey, createdAt, isVerified = false } = {},
  ) => {
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
      completed: isVerified ? Boolean(parsed.data.completed) : false,
      isVerified: Boolean(isVerified),
      ...(migrationKey ? { migrationKey } : {}),
      createdAt: createdAt || timestamp,
      updatedAt: timestamp,
    };
  };

  const createActivity = async (userId, activity, options = {}) => {
    const storage = await getActiveStorage(userId);
    const document = makeDocument(userId, activity, options);

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
    createActivity(
      userId,
      {
        concept,
        explanationLevel,
        source,
        completed: true,
        quizScore: score,
        quizTotal: total,
        quizPercentage: percentage,
      },
      { isVerified: true },
    );

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

  const MAX_BATCH_MIGRATION_LIMIT = 50;
  const MAX_ACCOUNT_MIGRATION_LIMIT = 100;

  const migrateActivities = async (userId, rawItems) => {
    if (!Array.isArray(rawItems) || rawItems.length > MAX_BATCH_MIGRATION_LIMIT) {
      throw new UserHistoryError(
        `History migration can include at most ${MAX_BATCH_MIGRATION_LIMIT} entries.`,
        400,
      );
    }
    const storage = await getActiveStorage(userId);

    let existingMigratedCount = 0;
    if (typeof storage.countDocuments === "function") {
      existingMigratedCount = await storage.countDocuments({
        userId,
        migrationKey: { $exists: true },
      });
    } else if (typeof storage.find === "function") {
      const cursor = storage.find({ userId });
      const docs =
        cursor && typeof cursor.toArray === "function"
          ? await cursor.toArray()
          : cursor && typeof cursor.lean === "function"
            ? await cursor.lean()
            : await cursor;
      existingMigratedCount = (docs || []).filter((d) => d.migrationKey).length;
    }

    let remainingQuota = Math.max(
      0,
      MAX_ACCOUNT_MIGRATION_LIMIT - existingMigratedCount,
    );
    let migrated = 0;
    let skipped = 0;

    for (const rawItem of rawItems) {
      const parsed = historyMigrationItemSchema.safeParse(rawItem);
      if (!parsed.success) {
        skipped += 1;
        continue;
      }
      const item = parsed.data;

      let alreadyExists = false;
      if (typeof storage.findOne === "function") {
        const query = storage.findOne({ userId, migrationKey: item.migrationKey });
        const existing =
          query && typeof query.lean === "function"
            ? await query.lean()
            : await query;
        alreadyExists = Boolean(existing);
      }

      if (!alreadyExists) {
        if (remainingQuota <= 0) {
          throw new UserHistoryError(
            `Account migration limit reached. At most ${MAX_ACCOUNT_MIGRATION_LIMIT} entries can be migrated per account.`,
            400,
          );
        }
      }

      const quiz = item.latestQuizScore;
      const document = makeDocument(
        userId,
        {
          concept: item.concept,
          explanationLevel: item.explanationLevel,
          source: item.source,
          completed: false, // Untrusted client history cannot establish completion
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
          isVerified: false, // Explicit untrusted flag
        },
      );

      const { updatedAt: _discardUpdatedAt, ...insertDocument } = document;

      const result = await storage.updateOne(
        { userId, migrationKey: item.migrationKey },
        { $setOnInsert: insertDocument },
        { upsert: true },
      );
      if (result.upsertedCount === 1) {
        migrated += 1;
        remainingQuota -= 1;
      }
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

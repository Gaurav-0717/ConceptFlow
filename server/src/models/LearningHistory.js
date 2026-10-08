import mongoose from "mongoose";
import { connectDB } from "../config/database.js";

/**
 * MongoDB collection name for learning history.
 * Preserves the existing "user_learning_history" collection — do NOT rename.
 */
export const USER_LEARNING_HISTORY_COLLECTION = "user_learning_history";

/**
 * Mongoose schema for LearningHistory.
 * Uses ObjectId reference to User, proper validation, timestamps, and compound indexes.
 */
const learningHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required."],
      index: true,
    },
    conceptId: {
      type: String,
      required: [true, "Concept ID is required."],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Title is required."],
      trim: true,
      maxlength: [160, "Title cannot exceed 160 characters."],
    },
    type: {
      type: String,
      required: [true, "Visualization type is required."],
      trim: true,
    },
    summary: {
      type: String,
      required: [true, "Summary is required."],
      trim: true,
    },
    visualizationType: {
      type: String,
      required: [true, "Visualization type is required."],
      trim: true,
    },
    concept: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Concept payload is required."],
    },
    explanationLevel: {
      type: String,
      enum: {
        values: ["Beginner", "Intermediate", "Advanced"],
        message: "Invalid explanation level.",
      },
    },
    source: {
      type: String,
      enum: {
        values: ["sample", "gemini", "cache", "fallback"],
        message: "Invalid source type.",
      },
    },
    quizScore: {
      type: Number,
      min: [0, "Quiz score cannot be negative."],
    },
    quizTotal: {
      type: Number,
      min: [1, "Quiz total must be at least 1."],
      max: [100, "Quiz total cannot exceed 100."],
    },
    quizPercentage: {
      type: Number,
      min: [0, "Quiz percentage must be between 0 and 100."],
      max: [100, "Quiz percentage must be between 0 and 100."],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      index: true,
    },
    migrationKey: {
      type: String,
      trim: true,
      maxlength: [240, "Migration key cannot exceed 240 characters."],
    },
  },
  {
    timestamps: true,
    collection: USER_LEARNING_HISTORY_COLLECTION,
  },
);

learningHistorySchema.index(
  { userId: 1, createdAt: -1 },
  { name: "user_history_recent" },
);

learningHistorySchema.index(
  { userId: 1, migrationKey: 1 },
  {
    unique: true,
    name: "user_history_migration_unique",
    partialFilterExpression: { migrationKey: { $type: "string" } },
  },
);

learningHistorySchema.pre("validate", function (next) {
  if (this.isNew && this.isVerified === undefined) {
    this.isVerified = false;
  }
  next();
});

export const LearningHistory =
  mongoose.models.LearningHistory ||
  mongoose.model("LearningHistory", learningHistorySchema);

/**
 * Helper to get the LearningHistory model once database connection is verified.
 * Returns null if the database connection cannot be established.
 */
export const getLearningHistoryModel = async () => {
  const connection = await connectDB();
  if (!connection || mongoose.connection.readyState !== 1) return null;
  return LearningHistory;
};

export default LearningHistory;

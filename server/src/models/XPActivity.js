import mongoose from "mongoose";
import { connectDB } from "../config/database.js";

export const XP_ACTIVITY_COLLECTION = "xp_activities";

export const XP_REASONS = [
  "concept_completed",
  "explanation_completed",
  "quiz_completed",
  "high_quiz_score",
  "daily_goal",
];

const xpActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required."],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "XP amount is required."],
      min: [1, "XP amount must be at least 1."],
    },
    reason: {
      type: String,
      required: [true, "Reason is required."],
      trim: true,
    },
    actionKey: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: XP_ACTIVITY_COLLECTION,
  },
);

// Index for efficient user/date queries (e.g. todayXP, user XP breakdown)
xpActivitySchema.index(
  { userId: 1, createdAt: -1 },
  { name: "user_xp_recent" },
);

// Unique index for deduplication: ensures an action is only rewarded once per user
xpActivitySchema.index(
  { userId: 1, actionKey: 1 },
  {
    unique: true,
    name: "user_action_key_unique",
    partialFilterExpression: { actionKey: { $type: "string" } },
  },
);

export const XPActivity =
  mongoose.models.XPActivity ||
  mongoose.model("XPActivity", xpActivitySchema);

export const getXPActivityModel = async () => {
  const connection = await connectDB();
  if (!connection || mongoose.connection.readyState !== 1) return null;
  return XPActivity;
};

export default XPActivity;

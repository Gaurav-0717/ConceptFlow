import mongoose from "mongoose";
import { connectDB } from "../config/database.js";

export const QUIZ_SESSION_COLLECTION = "quiz_sessions";

const quizSessionSchema = new mongoose.Schema(
  {
    quizId: {
      type: String,
      required: true,
      trim: true,
    },
    quiz: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    concept: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    explanationLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: QUIZ_SESSION_COLLECTION,
  },
);

quizSessionSchema.index(
  { quizId: 1 },
  { unique: true, name: "quiz_session_id_unique" },
);
quizSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "quiz_session_expires_at_ttl" },
);

export const QuizSession =
  mongoose.models.QuizSession ||
  mongoose.model("QuizSession", quizSessionSchema);

export const getQuizSessionModel = async () => {
  const connection = await connectDB();
  if (!connection || mongoose.connection.readyState !== 1) return null;
  return QuizSession;
};

export default QuizSession;

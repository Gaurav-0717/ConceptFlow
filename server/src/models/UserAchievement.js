import mongoose from "mongoose";
import { connectDB } from "../config/database.js";

export const USER_ACHIEVEMENT_COLLECTION = "user_achievements";

export const ACHIEVEMENT_TYPES = [
  "first_concept",
  "first_quiz",
  "quiz_master",
  "streak_3",
  "streak_7",
  "xp_100",
  "xp_500"
];

const userAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required."],
      index: true,
    },
    achievementId: {
      type: String,
      required: [true, "Achievement ID is required."],
      enum: ACHIEVEMENT_TYPES,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: USER_ACHIEVEMENT_COLLECTION,
  },
);

userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true, name: "user_achievement_unique" });

export const UserAchievement =
  mongoose.models.UserAchievement ||
  mongoose.model("UserAchievement", userAchievementSchema);

export const getUserAchievementModel = async () => {
  const connection = await connectDB();
  if (!connection || mongoose.connection.readyState !== 1) return null;
  return UserAchievement;
};

export default UserAchievement;

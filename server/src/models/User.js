import mongoose from "mongoose";
import { connectDB } from "../config/database.js";

/**
 * MongoDB collection name for users.
 * Preserves the existing "users" collection — do NOT rename.
 */
export const USER_COLLECTION = "users";

/**
 * Mongoose schema for User.
 * Uses proper validation, timestamps, and unique email index.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [1, "Name cannot be empty."],
      maxlength: [80, "Name cannot exceed 80 characters."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      maxlength: [254, "Email cannot exceed 254 characters."],
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required."],
      minlength: [1, "Password hash cannot be empty."],
    },
    lastActivityDate: {
      type: Date,
      default: null,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: USER_COLLECTION,
  },
);

userSchema.index({ email: 1 }, { unique: true, name: "user_email_unique" });

export const User = mongoose.models.User || mongoose.model("User", userSchema);

/**
 * Helper to get the User model once database connection is verified.
 * Returns null if the database connection cannot be established.
 */
export const getUserModel = async () => {
  const connection = await connectDB();
  if (!connection || mongoose.connection.readyState !== 1) return null;
  return User;
};

export default User;

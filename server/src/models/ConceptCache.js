import mongoose from "mongoose";
import { SUPPORTED_VISUALIZATION_TYPES } from "../validation/concept.schema.js";
import { connectDB } from "../config/database.js";

/**
 * MongoDB collection name for cached concepts.
 * Preserves the existing "concept_cache" collection — do NOT rename.
 */
export const CONCEPT_CACHE_COLLECTION = "concept_cache";

/**
 * Mongoose schema for ConceptCache.
 * Uses TTL index on expiresAt for automatic expiration, and unique index on cacheKey.
 */
const conceptCacheSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: [true, "Cache key is required."],
      trim: true,
    },
    normalizedInput: {
      type: String,
      required: [true, "Normalized input is required."],
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    difficulty: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Title is required."],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Visualization type is required."],
      enum: {
        values: SUPPORTED_VISUALIZATION_TYPES,
        message: "Unsupported visualization type.",
      },
    },
    concept: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Concept payload is required."],
    },
    source: {
      type: String,
      required: true,
      default: "gemini",
    },
    schemaVersion: {
      type: String,
      required: true,
      trim: true,
    },
    promptVersion: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: CONCEPT_CACHE_COLLECTION,
  },
);

conceptCacheSchema.index(
  { cacheKey: 1 },
  { unique: true, name: "cache_key_unique" },
);

conceptCacheSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "expires_at_ttl" },
);

export const ConceptCache =
  mongoose.models.ConceptCache ||
  mongoose.model("ConceptCache", conceptCacheSchema);

/**
 * Helper to get the ConceptCache model once database connection is verified.
 * Returns null if the database connection cannot be established.
 */
export const getConceptCacheModel = async () => {
  const connection = await connectDB();
  if (!connection || mongoose.connection.readyState !== 1) return null;
  return ConceptCache;
};

export default ConceptCache;

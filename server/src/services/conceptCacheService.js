import { createHash } from "node:crypto";
import { prepareConcept } from "./conceptService.js";
import {
  ConceptCache,
  getConceptCacheModel,
} from "../models/ConceptCache.js";
import { DEFAULT_GEMINI_MODEL } from "./geminiService.js";

export const CONCEPT_SCHEMA_VERSION = "1";
export const CONCEPT_PROMPT_VERSION = "1";
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class CacheUnavailableError extends Error {
  constructor() {
    super("Concept cache is unavailable.");
    this.name = "CacheUnavailableError";
  }
}

export const normalizeInput = (value = "") =>
  String(value)
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[!?.,;:]+$/g, "")
    .replace(/\s+/g, " ");

const normalizeMetadata = (value = "") => normalizeInput(value);

export const buildCacheKey = ({
  input,
  subject = "",
  difficulty = "",
  schemaVersion = CONCEPT_SCHEMA_VERSION,
  promptVersion = CONCEPT_PROMPT_VERSION,
  model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
}) => {
  const keyMaterial = JSON.stringify({
    input: normalizeInput(input),
    subject: normalizeMetadata(subject),
    difficulty: normalizeMetadata(difficulty),
    schemaVersion,
    promptVersion,
    model: String(model).trim(),
  });
  return createHash("sha256").update(keyMaterial).digest("hex");
};

export const createConceptCacheService = ({
  getModel = getConceptCacheModel,
  getCollection,
  now = () => new Date(),
  model,
} = {}) => {
  const resolveStorage = async () => {
    if (getCollection) {
      const col = await getCollection();
      if (!col) throw new CacheUnavailableError();
      return col;
    }
    const mdl = await getModel();
    if (!mdl) throw new CacheUnavailableError();
    return mdl;
  };

  const getCachedConcept = async ({ input, subject, difficulty }) => {
    const normalizedInput = normalizeInput(input);
    if (!normalizedInput) return null;
    const configuredModel =
      model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

    const cacheKey = buildCacheKey({
      input: normalizedInput,
      subject,
      difficulty,
      model: configuredModel,
    });
    const storage = await resolveStorage();
    const query = storage.findOne({
      cacheKey,
      schemaVersion: CONCEPT_SCHEMA_VERSION,
      promptVersion: CONCEPT_PROMPT_VERSION,
      model: configuredModel,
      expiresAt: { $gt: now() },
    });
    const document =
      query && typeof query.lean === "function" ? await query.lean() : await query;
    if (!document) return null;

    const result = prepareConcept(document.concept);
    if (!result.valid) {
      await storage.deleteOne({ cacheKey });
      return null;
    }
    return result.concept;
  };

  const saveCachedConcept = async ({ input, subject, difficulty, concept }) => {
    const result = prepareConcept(concept);
    if (!result.valid)
      throw new Error("Only validated concepts can be cached.");

    const configuredModel =
      model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const timestamp = now();
    const document = {
      cacheKey: buildCacheKey({
        input,
        subject,
        difficulty,
        model: configuredModel,
      }),
      normalizedInput: normalizeInput(input),
      ...(subject ? { subject: subject.trim() } : {}),
      ...(difficulty ? { difficulty: difficulty.trim() } : {}),
      title: result.concept.title,
      type: result.concept.type,
      concept: result.concept,
      source: "gemini",
      schemaVersion: CONCEPT_SCHEMA_VERSION,
      promptVersion: CONCEPT_PROMPT_VERSION,
      model: configuredModel,
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: new Date(timestamp.getTime() + CACHE_TTL_MS),
    };

    const storage = await resolveStorage();
    const { createdAt, ...fieldsToUpdate } = document;
    await storage.updateOne(
      { cacheKey: document.cacheKey },
      {
        $set: { ...fieldsToUpdate, updatedAt: timestamp },
        $setOnInsert: { createdAt },
      },
      { upsert: true },
    );
  };

  return { getCachedConcept, saveCachedConcept };
};

const defaultCacheService = createConceptCacheService();
export const getCachedConcept = defaultCacheService.getCachedConcept;
export const saveCachedConcept = defaultCacheService.saveCachedConcept;

export default {
  normalizeInput,
  buildCacheKey,
  getCachedConcept,
  saveCachedConcept,
  createConceptCacheService,
};

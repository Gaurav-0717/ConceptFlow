import { prepareConcept } from "./conceptService.js";
import {
  ConceptGenerationError,
  generateAIConcept,
} from "./aiConceptService.js";
import { createConceptCacheService } from "./conceptCacheService.js";
import { generateFallbackConcept } from "./fallbackConceptService.js";

const normalizeRequest = ({ input, subject, difficulty }) => ({
  input: String(input).normalize("NFKC").trim().replace(/\s+/g, " "),
  ...(subject ? { subject: String(subject).trim() } : {}),
  ...(difficulty ? { difficulty: String(difficulty).trim() } : {}),
});

export const createConceptGenerationService = ({
  cacheService = createConceptCacheService(),
  geminiService = generateAIConcept,
  fallbackService = generateFallbackConcept,
} = {}) => {
  return async (request) => {
    const normalizedRequest = normalizeRequest(request);

    try {
      const cachedConcept =
        await cacheService.getCachedConcept(normalizedRequest);
      if (cachedConcept) {
        const cachedResult = prepareConcept(cachedConcept);
        if (cachedResult.valid) {
          return { source: "cache", concept: cachedResult.concept };
        }
      }
    } catch {
      // Cache availability must not gate generation.
    }

    let geminiConcept;
    try {
      geminiConcept = await geminiService(normalizedRequest);
    } catch {
      return createFallbackResult(normalizedRequest, fallbackService);
    }

    const geminiResult = prepareConcept(geminiConcept);
    if (!geminiResult.valid) {
      return createFallbackResult(normalizedRequest, fallbackService);
    }

    try {
      await cacheService.saveCachedConcept({
        ...normalizedRequest,
        concept: geminiResult.concept,
      });
    } catch {
      // A cache write failure does not invalidate a successful Gemini result.
    }

    return { source: "gemini", concept: geminiResult.concept };
  };
};

const createFallbackResult = async (request, fallbackService) => {
  try {
    const fallbackConcept = await fallbackService(request);
    const result = prepareConcept(fallbackConcept);
    if (result.valid) return { source: "fallback", concept: result.concept };
  } catch {
    // The controller will return a generic service error if fallback itself fails.
  }
  throw new ConceptGenerationError(
    "Concept generation is temporarily unavailable. Please try again.",
    503,
  );
};

export const generateConceptWithReliability = createConceptGenerationService();

export default {
  createConceptGenerationService,
  generateConceptWithReliability,
};

import { prepareConcept } from "./conceptService.js";
import { generateConcept } from "./geminiService.js";

export const MAX_ATTEMPTS = 2;
export const MAX_INPUT_LENGTH = 2000;

const SYSTEM_INSTRUCTION = `You are ConceptFlow, an educational visualization platform. Turn a student's concept or question into a clear, accurate, student-friendly visual explanation. Choose exactly one most suitable visualization type: flowchart, cycle, timeline, hierarchy, or sequence. Return only JSON data matching the supplied ConceptFlow JSON schema. Include concise educational node descriptions and meaningful connections. For timelines include date, era, or order values; for hierarchies include parent-child connections; for sequences include at least two participants and message connections. Generate data only: never produce HTML, CSS, SVG, React, JavaScript, executable code, or instructions to execute code.`;

export class ConceptGenerationError extends Error {
  constructor(message, statusCode = 502, errors = []) {
    super(message);
    this.name = "ConceptGenerationError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

const isTransientProviderError = (error) =>
  ["rate_limit", "provider_failure", "timeout", "network_failure"].includes(
    error?.code,
  );

const userMessageForProviderError = (error) => {
  switch (error?.code) {
    case "missing_api_key":
      return "AI generation is not configured on the server.";
    case "invalid_credentials":
      return "AI generation is temporarily unavailable because the server credentials need attention.";
    case "rate_limit":
      return "The AI service is busy. Please try again shortly.";
    case "timeout":
      return "The AI service took too long to respond. Please try again.";
    case "network_failure":
      return "The AI service could not be reached. Please try again.";
    default:
      return "AI generation is temporarily unavailable. Please try again.";
  }
};

const parseResponse = (response) => {
  const text = typeof response === "string" ? response : response?.text;
  if (typeof text !== "string" || !text.trim()) {
    return {
      success: false,
      errors: [
        { path: "response", message: "The model returned no JSON data." },
      ],
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      success: false,
      errors: [
        { path: "response", message: "The model response was not valid JSON." },
      ],
    };
  }

  const result = prepareConcept(parsed);
  return result.valid
    ? { success: true, concept: result.concept }
    : { success: false, errors: result.errors };
};

export const createAIConceptService = ({
  generateConceptFn = generateConcept,
} = {}) => {
  return async ({ input, subject, difficulty }) => {
    let correction = "";
    let lastValidationErrors = [];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const prompt = [
        SYSTEM_INSTRUCTION,
        `Student request: ${input}`,
        subject ? `Subject: ${subject}` : "",
        difficulty ? `Requested difficulty: ${difficulty}` : "",
        correction,
      ]
        .filter(Boolean)
        .join("\n\n");

      let response;
      try {
        response = await generateConceptFn(prompt);
      } catch (error) {
        if (isTransientProviderError(error) && attempt < MAX_ATTEMPTS) continue;
        throw new ConceptGenerationError(
          userMessageForProviderError(error),
          error?.statusCode || 503,
        );
      }

      const parsed = parseResponse(response);
      if (parsed.success) return parsed.concept;

      lastValidationErrors = parsed.errors;
      correction = `Your previous response did not satisfy the ConceptFlow contract. Correct these issues and return the complete concept as JSON only: ${JSON.stringify(lastValidationErrors)}`;
    }

    throw new ConceptGenerationError(
      "Generated concept validation failed",
      502,
      lastValidationErrors,
    );
  };
};

export const generateAIConcept = createAIConceptService();

export default { createAIConceptService, generateAIConcept };

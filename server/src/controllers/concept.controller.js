import { prepareConcept, validateConcept } from "../services/conceptService.js";
import {
  ConceptGenerationError,
  MAX_INPUT_LENGTH,
} from "../services/aiConceptService.js";
import { generateConceptWithReliability } from "../services/conceptGenerationService.js";

/**
 * Controller to validate a concept payload
 * Endpoint: POST /api/concepts/validate
 */
export const validateConceptController = async (req, res, next) => {
  try {
    const rawConcept =
      req.body?.concept !== undefined ? req.body.concept : req.body;

    const result = prepareConcept(rawConcept);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Concept validation failed",
        errors: result.errors,
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      concept: result.concept,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "An internal error occurred during concept validation",
      errors: [{ path: "server", message: err.message || "Unknown error" }],
    });
  }
};

/**
 * Controller to preview a validated concept
 * Endpoint: POST /api/concepts/preview
 */
export const previewConceptController = async (req, res, next) => {
  try {
    const rawConcept =
      req.body?.concept !== undefined ? req.body.concept : req.body;

    const result = prepareConcept(rawConcept);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Concept validation failed",
        errors: result.errors,
      });
    }

    return res.status(200).json({
      success: true,
      source: "sample",
      concept: result.concept,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "An internal error occurred during concept preview",
      errors: [{ path: "server", message: err.message || "Unknown error" }],
    });
  }
};

export const createGenerateConceptController =
  (generateConceptFn = generateConceptWithReliability) =>
  async (req, res) => {
    const input =
      typeof req.body?.input === "string" ? req.body.input.trim() : "";
    if (!input) {
      return res.status(400).json({
        success: false,
        message: "Please enter a concept or question.",
        errors: [
          { path: "input", message: "Input is required and cannot be empty." },
        ],
      });
    }
    if (input.length > MAX_INPUT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Input must be ${MAX_INPUT_LENGTH} characters or fewer.`,
        errors: [
          {
            path: "input",
            message: `Input exceeds the ${MAX_INPUT_LENGTH}-character limit.`,
          },
        ],
      });
    }

    const optionalText = (value, maxLength) =>
      typeof value === "string" && value.trim()
        ? value.trim().slice(0, maxLength)
        : undefined;

    try {
      const result = await generateConceptFn({
        input,
        subject: optionalText(req.body?.subject, 100),
        difficulty: optionalText(req.body?.difficulty, 40),
      });
      const concept = result?.concept || result;
      const source = ["gemini", "cache", "fallback"].includes(result?.source)
        ? result.source
        : "gemini";
      return res.status(200).json({ success: true, source, concept });
    } catch (error) {
      if (error instanceof ConceptGenerationError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          ...(error.errors.length ? { errors: error.errors } : {}),
        });
      }

      return res.status(503).json({
        success: false,
        message: "AI generation is temporarily unavailable. Please try again.",
      });
    }
  };

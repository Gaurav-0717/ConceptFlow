/**
 * ConceptFlow Client — Concept Service
 * Provides typed API calls to the backend concept validation and preview endpoints.
 * The visualization renderer remains decoupled from this service:
 *   <VisualizationRenderer concept={concept} />
 * always receives a plain concept object — never API internals.
 */

import api from "./api";

/**
 * Validate a concept object against the backend schema and semantic rules.
 *
 * @param {Object} concept - Structured concept data conforming to the Visualization Data Contract
 * @returns {Promise<{success: boolean, valid: boolean, concept?: Object, errors?: Array, message?: string}>}
 */
export const validateConcept = async (concept) => {
  try {
    const response = await api.post("/concepts/validate", { concept });
    return response.data;
  } catch (error) {
    // Propagate structured error body from server
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      success: false,
      valid: false,
      message:
        "Failed to reach the ConceptFlow API. Please check the server connection.",
      errors: [{ path: "network", message: error.message || "Network error" }],
    };
  }
};

/**
 * Preview a concept — runs full backend validation and returns the sanitized concept.
 * The 'source' field indicates whether the concept came from sample, Gemini, cache, or fallback.
 *
 * @param {Object} concept - Structured concept data
 * @returns {Promise<{success: boolean, source: string, concept?: Object, errors?: Array}>}
 */
export const previewConcept = async (concept) => {
  try {
    const response = await api.post("/concepts/preview", { concept });
    return response.data;
  } catch (error) {
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      success: false,
      source: null,
      message:
        "Failed to reach the ConceptFlow API. Please check the server connection.",
      errors: [{ path: "network", message: error.message || "Network error" }],
    };
  }
};

/**
 * Generate and validate a concept through the backend Gemini pipeline.
 * The API key remains on the server; the browser only receives the validated concept.
 */
export const generateConcept = async ({ input, subject, difficulty }) => {
  try {
    const response = await api.post(
      "/concepts/generate",
      { input, subject, difficulty },
      { timeout: 50000 },
    );
    return response.data;
  } catch (error) {
    if (error.response?.data) return error.response.data;
    return {
      success: false,
      message:
        "Failed to reach the ConceptFlow API. Please check the server connection.",
    };
  }
};

export const getGenerationSourceMessage = (source) =>
  ({
    gemini: "Generated with AI",
    cache: "Loaded from saved knowledge",
    fallback: "Generated using ConceptFlow's offline learning engine",
  })[source] || "";

export const generateLearningExplanation = async (concept) => {
  try {
    const response = await api.post(
      "/learning/explanations",
      { concept },
      { timeout: 55000 },
    );
    return response.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        message: "The learning service could not be reached.",
      }
    );
  }
};

export const createConceptQuiz = async (concept, explanationLevel) => {
  try {
    const response = await api.post(
      "/learning/quiz",
      { concept, explanationLevel },
      { timeout: 55000 },
    );
    return response.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        message: "The quiz service could not be reached.",
      }
    );
  }
};

export const submitConceptQuiz = async (quizId, answers) => {
  try {
    const response = await api.post(
      `/learning/quiz/${encodeURIComponent(quizId)}/submit`,
      { answers },
    );
    return response.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        message:
          "Your quiz could not be submitted. Your answers are still here; try again.",
      }
    );
  }
};

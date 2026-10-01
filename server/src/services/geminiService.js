import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { conceptSchema } from "../validation/concept.schema.js";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 20000;

export class GeminiServiceError extends Error {
  constructor(code, statusCode = 503) {
    super("The AI service could not complete the request.");
    this.name = "GeminiServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const removeUnsupportedSchemaFields = (value) => {
  if (Array.isArray(value)) return value.map(removeUnsupportedSchemaFields);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "$schema" && key !== "default")
      .map(([key, entry]) => [key, removeUnsupportedSchemaFields(entry)]),
  );
};

const getProviderError = (error) => {
  const status = Number(error?.status ?? error?.statusCode);
  const code = String(error?.code ?? "").toLowerCase();
  const name = String(error?.name ?? "").toLowerCase();

  if (status === 401 || status === 403)
    return new GeminiServiceError("invalid_credentials", 503);
  if (status === 429) return new GeminiServiceError("rate_limit", 503);
  if (status >= 500 && status <= 599)
    return new GeminiServiceError("provider_failure", 503);
  if (
    name.includes("timeout") ||
    name.includes("abort") ||
    code.includes("timeout") ||
    code === "etimedout"
  ) {
    return new GeminiServiceError("timeout", 503);
  }
  if (!status || code.startsWith("econn") || code === "enotfound") {
    return new GeminiServiceError("network_failure", 503);
  }
  return new GeminiServiceError("provider_failure", 502);
};

export const generateStructuredResponse = async (
  prompt,
  {
    schema,
    apiKey = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    timeout = DEFAULT_TIMEOUT_MS,
    clientFactory = (options) => new GoogleGenAI(options),
  } = {},
) => {
  if (!apiKey) throw new GeminiServiceError("missing_api_key", 503);
  if (!schema) throw new TypeError("A structured response schema is required.");

  try {
    const client = clientFactory({ apiKey, httpOptions: { timeout } });
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: removeUnsupportedSchemaFields(
          z.toJSONSchema(schema, { unrepresentable: "any" }),
        ),
      },
    });

    return { text: response.text || "" };
  } catch (error) {
    throw getProviderError(error);
  }
};

export const generateConcept = (prompt, options = {}) =>
  generateStructuredResponse(prompt, { ...options, schema: conceptSchema });

export default { generateConcept, generateStructuredResponse };

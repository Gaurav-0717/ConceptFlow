import { conceptSchema, formatZodErrors } from "../validation/concept.schema.js";
import { validateConceptSemantics } from "../validation/concept.semantic.js";

/**
 * Validates a concept against the structural Zod schema contract.
 * @param {unknown} rawConcept - Raw input data
 * @returns {{ valid: boolean, concept?: Object, errors?: Array<{ path: string, message: string }> }}
 */
export const validateConcept = (rawConcept) => {
  if (!rawConcept || typeof rawConcept !== "object") {
    return {
      valid: false,
      errors: [
        {
          path: "concept",
          message: "Concept payload must be a non-null JSON object."
        }
      ]
    };
  }

  const result = conceptSchema.safeParse(rawConcept);

  if (!result.success) {
    return {
      valid: false,
      errors: formatZodErrors(result.error)
    };
  }

  return {
    valid: true,
    concept: result.data
  };
};

/**
 * Validates a structurally valid concept against type-specific semantic rules.
 * @param {Object} concept - Structurally valid concept
 * @returns {{ valid: boolean, errors: Array<{ path: string, message: string }> }}
 */
export const validateSemantics = (concept) => {
  return validateConceptSemantics(concept);
};

/**
 * Prepares and validates a concept through both schema and semantic pipelines.
 * Sanitizes input and ensures predictable data shape.
 *
 * @param {unknown} rawConcept - Raw concept data
 * @returns {{ valid: boolean, concept?: Object, errors?: Array<{ path: string, message: string }> }}
 */
export const prepareConcept = (rawConcept) => {
  // Step 1: Structural Zod Schema Validation
  const schemaResult = validateConcept(rawConcept);
  if (!schemaResult.valid) {
    return {
      valid: false,
      errors: schemaResult.errors
    };
  }

  const validatedConcept = schemaResult.concept;

  // Step 2: Semantic Validation
  const semanticResult = validateSemantics(validatedConcept);
  if (!semanticResult.valid) {
    return {
      valid: false,
      errors: semanticResult.errors
    };
  }

  // Step 3: Pure data preparation (strip dangerous characters, normalize casing)
  const prepared = {
    id: validatedConcept.id.trim(),
    title: validatedConcept.title.trim(),
    type: validatedConcept.type,
    summary: validatedConcept.summary.trim(),
    nodes: validatedConcept.nodes.map((node) => ({
      id: node.id.trim(),
      label: node.label.trim(),
      ...(node.description ? { description: node.description.trim() } : {}),
      ...(node.category ? { category: node.category.trim() } : {}),
      ...(node.date ? { date: node.date.trim() } : {}),
      ...(node.era ? { era: node.era.trim() } : {}),
      ...(typeof node.level === "number" ? { level: node.level } : {}),
      ...(node.parentId ? { parentId: node.parentId.trim() } : {}),
      ...(typeof node.order === "number" ? { order: node.order } : {}),
      ...(node.status ? { status: node.status.trim() } : {}),
      ...(node.color ? { color: node.color.trim() } : {})
    })),
    connections: (validatedConcept.connections || []).map((conn) => ({
      from: conn.from.trim(),
      to: conn.to.trim(),
      ...(conn.label ? { label: conn.label.trim() } : {}),
      ...(conn.description ? { description: conn.description.trim() } : {}),
      ...(typeof conn.step === "number" ? { step: conn.step } : {}),
      ...(conn.status ? { status: conn.status.trim() } : {})
    })),
    ...(validatedConcept.subject ? { subject: validatedConcept.subject.trim() } : {}),
    ...(validatedConcept.difficulty ? { difficulty: validatedConcept.difficulty.trim() } : {}),
    ...(Array.isArray(validatedConcept.keyTakeaways)
      ? { keyTakeaways: validatedConcept.keyTakeaways.map((k) => k.trim()) }
      : {}),
    ...(Array.isArray(validatedConcept.participants)
      ? {
          participants: validatedConcept.participants.map((p) => ({
            id: p.id.trim(),
            label: p.label.trim(),
            ...(p.role ? { role: p.role.trim() } : {})
          }))
        }
      : {})
  };

  return {
    valid: true,
    concept: prepared
  };
};

export default {
  validateConcept,
  validateSemantics,
  prepareConcept
};

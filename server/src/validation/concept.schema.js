import { z } from "zod";

/**
 * Supported ConceptFlow visualization types
 */
export const SUPPORTED_VISUALIZATION_TYPES = [
  "flowchart",
  "cycle",
  "timeline",
  "hierarchy",
  "sequence"
];

/**
 * Node Schema
 * Represents an individual conceptual entity, step, event, or participant.
 */
export const nodeSchema = z.object({
  id: z
    .string({ required_error: "Node id is required", invalid_type_error: "Node id must be a string" })
    .trim()
    .min(1, "Node id cannot be empty"),
  label: z
    .string({ required_error: "Node label is required", invalid_type_error: "Node label must be a string" })
    .trim()
    .min(1, "Node label cannot be empty"),
  description: z.string({ invalid_type_error: "Node description must be a string" }).optional(),
  category: z.string({ invalid_type_error: "Node category must be a string" }).optional(),
  date: z.string({ invalid_type_error: "Node date must be a string" }).optional(),
  era: z.string({ invalid_type_error: "Node era must be a string" }).optional(),
  level: z.number({ invalid_type_error: "Node level must be a number" }).optional(),
  parentId: z.string({ invalid_type_error: "Node parentId must be a string" }).optional(),
  order: z.number({ invalid_type_error: "Node order must be a number" }).optional(),
  status: z.string({ invalid_type_error: "Node status must be a string" }).optional(),
  color: z.string({ invalid_type_error: "Node color must be a string" }).optional()
});

/**
 * Connection Schema
 * Represents a directional relationship, message, transition, or hierarchy link between two nodes.
 */
export const connectionSchema = z.object({
  from: z
    .string({ required_error: "Connection 'from' is required", invalid_type_error: "Connection 'from' must be a string" })
    .trim()
    .min(1, "Connection 'from' cannot be empty"),
  to: z
    .string({ required_error: "Connection 'to' is required", invalid_type_error: "Connection 'to' must be a string" })
    .trim()
    .min(1, "Connection 'to' cannot be empty"),
  label: z.string({ invalid_type_error: "Connection label must be a string" }).optional(),
  description: z.string({ invalid_type_error: "Connection description must be a string" }).optional(),
  step: z.number({ invalid_type_error: "Connection step must be a number" }).optional(),
  status: z.string({ invalid_type_error: "Connection status must be a string" }).optional()
});

/**
 * Optional Participant Schema (used primarily in sequence diagrams)
 */
export const participantSchema = z.object({
  id: z.string().trim().min(1, "Participant id cannot be empty"),
  label: z.string().trim().min(1, "Participant label cannot be empty"),
  role: z.string().optional()
});

/**
 * Concept Schema
 * Complete backend contract for concept visualization structures.
 */
export const conceptSchema = z
  .object({
    id: z
      .string({ required_error: "Concept id is required", invalid_type_error: "Concept id must be a string" })
      .trim()
      .min(1, "Concept id cannot be empty"),
    title: z
      .string({ required_error: "Concept title is required", invalid_type_error: "Concept title must be a string" })
      .trim()
      .min(1, "Concept title cannot be empty"),
    type: z.enum(SUPPORTED_VISUALIZATION_TYPES, {
      errorMap: () => ({
        message: `Visualization type must be one of: ${SUPPORTED_VISUALIZATION_TYPES.join(", ")}`
      })
    }),
    summary: z
      .string({ required_error: "Concept summary is required", invalid_type_error: "Concept summary must be a string" })
      .trim()
      .min(1, "Concept summary cannot be empty"),
    nodes: z
      .array(nodeSchema, {
        required_error: "Nodes array is required",
        invalid_type_error: "Nodes must be an array"
      })
      .min(1, "Nodes array must contain at least one node"),
    connections: z
      .array(connectionSchema, {
        required_error: "Connections must be an array",
        invalid_type_error: "Connections must be an array"
      })
      .default([]),
    // Optional conceptual metadata
    subject: z.string().optional(),
    difficulty: z.string().optional(),
    keyTakeaways: z.array(z.string()).optional(),
    participants: z.array(participantSchema).optional()
  })
  .superRefine((data, ctx) => {
    // 1. Validate node ID uniqueness
    const nodeIds = new Set();
    data.nodes.forEach((node, index) => {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nodes", index, "id"],
          message: `Duplicate node ID detected: "${node.id}". Node IDs must be unique.`
        });
      } else {
        nodeIds.add(node.id);
      }
    });

    // 2. Validate connections reference existing nodes
    // In sequence diagrams, participants can also serve as endpoints
    const validEndpoints = new Set(nodeIds);
    if (Array.isArray(data.participants)) {
      data.participants.forEach((p) => validEndpoints.add(p.id));
    }

    const seenConnections = new Set();
    data.connections.forEach((conn, index) => {
      // Validate 'from' reference
      if (!validEndpoints.has(conn.from)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["connections", index, "from"],
          message: `Connection references non-existent 'from' node ID: "${conn.from}".`
        });
      }

      // Validate 'to' reference
      if (!validEndpoints.has(conn.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["connections", index, "to"],
          message: `Connection references non-existent 'to' node ID: "${conn.to}".`
        });
      }

      // Validate duplicate connections (same from -> to with same label or step)
      // Disallow exact identical duplicate transitions
      const connKey = `${conn.from}->${conn.to}::${conn.label || ""}::${conn.step || ""}`;
      if (seenConnections.has(connKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["connections", index],
          message: `Duplicate connection detected from "${conn.from}" to "${conn.to}".`
        });
      } else {
        seenConnections.add(connKey);
      }
    });
  });

/**
 * Format Zod validation errors into predictable, client-safe error objects.
 * Handles mixed string|number path segments safely.
 * @param {import("zod").ZodError} error
 * @returns {Array<{path: string, message: string}>}
 */
export const formatZodErrors = (error) => {
  const issues = error?.issues ?? error?.errors ?? [];
  return issues.map((err) => ({
    path: Array.isArray(err.path)
      ? err.path.map((segment) => String(segment)).join(".")
      : String(err.path ?? ""),
    message: err.message ?? "Validation error"
  }));
};

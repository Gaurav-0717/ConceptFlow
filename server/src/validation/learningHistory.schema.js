import { z } from "zod";
import { conceptSchema } from "./concept.schema.js";

export const learningLevelSchema = z.enum([
  "Beginner",
  "Intermediate",
  "Advanced",
]);

const quizScoreFields = {
  quizScore: z.number().int().min(0).optional(),
  quizTotal: z.number().int().min(1).max(100).optional(),
  quizPercentage: z.number().int().min(0).max(100).optional(),
};

const validateScoreFields = (record, context) => {
  const fields = [record.quizScore, record.quizTotal, record.quizPercentage];
  const someProvided = fields.some((value) => value !== undefined);
  const allProvided = fields.every((value) => value !== undefined);
  if (someProvided !== allProvided) {
    context.addIssue({
      code: "custom",
      path: ["quizScore"],
      message: "Quiz score, total, and percentage must be provided together.",
    });
  } else if (allProvided && record.quizScore > record.quizTotal) {
    context.addIssue({
      code: "custom",
      path: ["quizScore"],
      message: "Quiz score cannot exceed the total.",
    });
  }
};

export const learningActivityRequestSchema = z
  .object({
    concept: conceptSchema,
    explanationLevel: learningLevelSchema.optional(),
    source: z.enum(["sample", "gemini", "cache", "fallback"]).optional(),
    completed: z.boolean().optional(),
    ...quizScoreFields,
  })
  .strict()
  .superRefine(validateScoreFields);

const isoDatetimeWithOffset = z
  .string()
  .datetime({ offset: true })
  .optional();

export const historyMigrationItemSchema = z
  .object({
    migrationKey: z.string().trim().min(1).max(240),
    concept: conceptSchema,
    explanationLevel: learningLevelSchema.optional(),
    source: z.enum(["sample", "gemini", "cache", "fallback"]).optional(),
    createdAt: isoDatetimeWithOffset,
    lastAccessedAt: isoDatetimeWithOffset,
    latestQuizScore: z
      .object({
        score: z.number().int().min(0),
        total: z.number().int().min(1).max(100),
        percentage: z.number().int().min(0).max(100),
        completedAt: isoDatetimeWithOffset,
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((item, context) => {
    if (
      item.latestQuizScore &&
      item.latestQuizScore.score > item.latestQuizScore.total
    ) {
      context.addIssue({
        code: "custom",
        path: ["latestQuizScore", "score"],
        message: "Quiz score cannot exceed the total.",
      });
    }
  });

export const historyMigrationRequestSchema = z
  .object({
    items: z.array(z.unknown()).max(50),
  })
  .strict();

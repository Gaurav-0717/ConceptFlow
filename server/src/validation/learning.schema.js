import { z } from "zod";

const explanationText = z.string().trim().min(12).max(1800);

export const explanationSchema = z
  .object({
    beginner: explanationText,
    intermediate: explanationText,
    advanced: explanationText,
    keyTakeaways: z.array(z.string().trim().min(3).max(220)).min(1).max(6),
    terminology: z
      .array(
        z.object({
          term: z.string().trim().min(1).max(80),
          definition: z.string().trim().min(5).max(300),
        }),
      )
      .max(10),
  })
  .strict();

const optionSchema = z.string().trim().min(1).max(240);

export const quizQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(40),
    question: z.string().trim().min(8).max(400),
    options: z.array(optionSchema).length(4),
    correctAnswerIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().min(5).max(400),
  })
  .strict()
  .superRefine((question, context) => {
    if (
      new Set(
        question.options.map((option) => option.toLocaleLowerCase("en-US")),
      ).size !== 4
    ) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Answer options must be unique.",
      });
    }
  });

export const quizSchema = z
  .object({
    questions: z.array(quizQuestionSchema).length(5),
  })
  .strict()
  .superRefine((quiz, context) => {
    if (new Set(quiz.questions.map((question) => question.id)).size !== 5) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Question IDs must be unique.",
      });
    }
  });

export const quizAnswersSchema = z
  .record(z.string(), z.number().int().min(0).max(3))
  .refine(
    (answers) => Object.keys(answers).length === 5,
    "Submit one answer for each of the five questions.",
  );

import { prepareConcept } from "./conceptService.js";
import { generateStructuredResponse } from "./geminiService.js";
import {
  explanationSchema,
  quizSchema,
} from "../validation/learning.schema.js";

export const LEARNING_MAX_ATTEMPTS = 2;

const transientCodes = new Set([
  "rate_limit",
  "provider_failure",
  "timeout",
  "network_failure",
]);

const promptFor = (kind, concept, correction = "") =>
  [
    `You are ConceptFlow, an educational learning platform. Generate ${kind} as structured JSON matching the supplied schema. Use only the provided validated concept as source material. Be accurate, clear, and age-appropriate. Return data only; never return code, HTML, SVG, or markup.`,
    `Validated concept data: ${JSON.stringify(concept)}`,
    correction,
  ]
    .filter(Boolean)
    .join("\n\n");

const parseStructuredResponse = (response, schema) => {
  const rawText = typeof response === "string" ? response : response?.text;
  if (typeof rawText !== "string" || !rawText.trim()) return null;
  try {
    const result = schema.safeParse(JSON.parse(rawText));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

const fallbackExplanation = (concept) => {
  const nodes = concept.nodes || [];
  const fitExplanation = (value) => {
    let text = String(value || "").trim();
    if (text.length < 12)
      text = `${concept.title}: ${concept.summary}. This overview explains the main idea.`;
    return text.slice(0, 1800);
  };
  const keyTakeaways = (
    concept.keyTakeaways?.length
      ? concept.keyTakeaways
      : nodes.slice(0, 6).map((node) => node.description || node.label)
  ).map((point) => {
    const text = String(point || "").trim();
    return (text.length < 3 ? `${text}: key idea` : text).slice(0, 220);
  });
  const terminology = nodes.slice(0, 10).map((node) => ({
    term: node.label.slice(0, 80),
    definition: (
      node.description ||
      `${node.label} is one of the main elements in ${concept.title}.`
    ).slice(0, 300),
  }));
  const outline = nodes
    .slice(0, 8)
    .map(
      (node) =>
        `${node.label}: ${node.description || "a key part of the concept"}`,
    )
    .join(" ");
  const pathway = (concept.connections || [])
    .slice(0, 8)
    .map((connection) => {
      const from =
        nodes.find((node) => node.id === connection.from)?.label ||
        connection.from;
      const to =
        nodes.find((node) => node.id === connection.to)?.label || connection.to;
      return `${from} ${connection.label || "leads to"} ${to}.`;
    })
    .join(" ");

  return {
    beginner: fitExplanation(`${concept.title}: ${concept.summary}`),
    intermediate: fitExplanation(outline || concept.summary),
    advanced: fitExplanation(`${concept.summary} ${pathway}`.trim()),
    keyTakeaways: keyTakeaways.length
      ? keyTakeaways
      : [fitExplanation(concept.summary).slice(0, 220)],
    terminology,
  };
};

const fallbackQuiz = (concept) => {
  const nodes = concept.nodes || [];
  const fillerOptions = [
    "A separate topic not represented in this concept",
    "An unrelated process outside this diagram",
    "A conclusion that does not appear in the concept",
    "An external example not included here",
  ];
  const labels = [...new Set(nodes.map((node) => node.label).filter(Boolean))];

  const questions = Array.from({ length: 5 }, (_, questionIndex) => {
    const node = nodes[questionIndex % Math.max(nodes.length, 1)] || {
      id: "summary",
      label: concept.title,
      description: concept.summary,
    };
    const correct = node.label.slice(0, 240);
    const distractors = [
      ...labels.filter((label) => label !== correct),
      ...fillerOptions,
    ]
      .filter(
        (label, index, all) =>
          label.toLocaleLowerCase("en-US") !==
            correct.toLocaleLowerCase("en-US") &&
          all.findIndex(
            (item) =>
              item.toLocaleLowerCase("en-US") ===
              label.toLocaleLowerCase("en-US"),
          ) === index,
      )
      .slice(0, 3);
    const options = [correct, ...distractors];
    while (options.length < 4)
      options.push(`Unlisted component ${options.length}`);
    const correctAnswerIndex = questionIndex % 4;
    const rotatedOptions = [
      ...options.slice(correctAnswerIndex),
      ...options.slice(0, correctAnswerIndex),
    ];

    return {
      id: `question-${questionIndex + 1}`,
      question: `Which element is included in ${concept.title.slice(0, 80)}?`,
      options: rotatedOptions,
      correctAnswerIndex,
      explanation: (
        node.description || `${correct} is a component of ${concept.title}.`
      ).slice(0, 400),
    };
  });

  return { questions };
};

export class LearningContentError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = "LearningContentError";
    this.statusCode = statusCode;
  }
}

export const createLearningContentService = ({
  generateStructuredResponseFn = generateStructuredResponse,
} = {}) => {
  const validateInputConcept = (rawConcept) => {
    const result = prepareConcept(rawConcept);
    if (!result.valid)
      throw new LearningContentError("A valid concept is required.", 400);
    return result.concept;
  };

  const generateValidated = async (kind, concept, schema) => {
    let correction = "";
    for (let attempt = 1; attempt <= LEARNING_MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await generateStructuredResponseFn(
          promptFor(kind, concept, correction),
          { schema },
        );
        const parsed = parseStructuredResponse(response, schema);
        if (parsed) return parsed;
        correction =
          "The previous response was malformed or failed schema validation. Return a corrected complete JSON response.";
      } catch (error) {
        if (
          !transientCodes.has(error?.code) ||
          attempt === LEARNING_MAX_ATTEMPTS
        )
          return null;
      }
    }
    return null;
  };

  const generateExplanation = async (rawConcept) => {
    const concept = validateInputConcept(rawConcept);
    const generated = await generateValidated(
      "three-level explanation, key takeaways, and terminology",
      concept,
      explanationSchema,
    );
    const fallback = explanationSchema.safeParse(fallbackExplanation(concept));
    if (!generated && !fallback.success) {
      throw new LearningContentError(
        "A concept-based explanation could not be prepared.",
        503,
      );
    }
    return {
      source: generated ? "gemini" : "fallback",
      explanation: generated || fallback.data,
    };
  };

  const generateQuiz = async (rawConcept) => {
    const concept = validateInputConcept(rawConcept);
    const generated = await generateValidated(
      "a five-question multiple-choice quiz with four distinct options and exactly one correct answer per question",
      concept,
      quizSchema,
    );
    const fallback = quizSchema.safeParse(fallbackQuiz(concept));
    if (!generated && !fallback.success) {
      throw new LearningContentError(
        "A practice quiz could not be prepared.",
        503,
      );
    }
    return {
      source: generated ? "gemini" : "fallback",
      quiz: generated || fallback.data,
    };
  };

  return { generateExplanation, generateQuiz };
};

export const learningContentService = createLearningContentService();

export default { createLearningContentService, learningContentService };

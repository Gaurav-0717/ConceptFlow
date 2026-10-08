const STORAGE_KEY = "conceptflow.active-quiz.v1";

const getDefaultStorage = () => {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
};

export const getQuizResumeKey = (userId, scopeId = "default") =>
  `${STORAGE_KEY}:${userId ? `user:${encodeURIComponent(userId)}` : "guest"}:${encodeURIComponent(scopeId)}`;

export const clearQuizResume = (
  userId,
  scopeId = "default",
  storage = getDefaultStorage(),
) => {
  if (!storage) return;
  try {
    storage.removeItem(getQuizResumeKey(userId, scopeId));
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
};

export const saveQuizResume = (
  { quizId, selectedAnswers, activeQuestionIndex },
  userId,
  scopeId = "default",
  storage = getDefaultStorage(),
) => {
  if (!storage || typeof quizId !== "string" || !quizId.trim()) return false;
  const answers = {};
  if (
    selectedAnswers &&
    typeof selectedAnswers === "object" &&
    !Array.isArray(selectedAnswers)
  ) {
    for (const [questionId, answerIndex] of Object.entries(selectedAnswers)) {
      if (Number.isInteger(answerIndex) && answerIndex >= 0) {
        answers[questionId] = answerIndex;
      }
    }
  }

  try {
    storage.setItem(
      getQuizResumeKey(userId, scopeId),
      JSON.stringify({
        quizId,
        selectedAnswers: answers,
        activeQuestionIndex:
          Number.isInteger(activeQuestionIndex) && activeQuestionIndex >= 0
            ? activeQuestionIndex
            : 0,
      }),
    );
    return true;
  } catch {
    return false;
  }
};

const readQuizResume = (userId, scopeId, storage) => {
  if (!storage) return null;
  const key = getQuizResumeKey(userId, scopeId);
  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) return null;
    const record = JSON.parse(rawValue);
    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      typeof record.quizId !== "string" ||
      !record.quizId.trim() ||
      !record.selectedAnswers ||
      typeof record.selectedAnswers !== "object" ||
      Array.isArray(record.selectedAnswers) ||
      !Number.isInteger(record.activeQuestionIndex)
    ) {
      storage.removeItem(key);
      return null;
    }
    return record;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Cleanup is best-effort when browser storage is blocked.
    }
    return null;
  }
};

const isPublicQuiz = (quiz) =>
  Array.isArray(quiz?.questions) &&
  quiz.questions.length === 5 &&
  quiz.questions.every(
    (question) =>
      typeof question?.id === "string" &&
      typeof question.question === "string" &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      question.options.every((option) => typeof option === "string"),
  );

/**
 * Decides whether a quiz submit response ends the active quiz session.
 * Successful submissions and definitive 404s clear the resume record;
 * 503s, other failures, and network errors keep it so the user can retry.
 */
export const shouldClearResumeAfterSubmit = (response) =>
  Boolean(
    (response?.success && response.result) || response?.status === 404,
  );

export const restoreQuizResume = async ({
  userId,
  scopeId = "default",
  expectedConceptId,
  storage = getDefaultStorage(),
  getQuiz,
}) => {
  const record = readQuizResume(userId, scopeId, storage);
  if (!record) return { status: "none" };

  let response;
  try {
    response = await getQuiz(record.quizId);
  } catch {
    return { status: "unavailable", quizId: record.quizId };
  }

  if (response?.status === 404) {
    clearQuizResume(userId, scopeId, storage);
    return { status: "missing" };
  }
  if (
    expectedConceptId &&
    response?.concept?.id &&
    response.concept.id !== expectedConceptId
  ) {
    clearQuizResume(userId, scopeId, storage);
    return { status: "missing" };
  }
  if (
    !response?.success ||
    response.quizId !== record.quizId ||
    !isPublicQuiz(response.quiz) ||
    !response.concept ||
    typeof response.concept !== "object" ||
    typeof response.concept.id !== "string"
  ) {
    return { status: "unavailable", quizId: record.quizId };
  }

  const questionById = new Map(
    response.quiz.questions.map((question) => [question.id, question]),
  );
  const selectedAnswers = {};
  for (const [questionId, answerIndex] of Object.entries(
    record.selectedAnswers,
  )) {
    const question = questionById.get(questionId);
    if (
      question &&
      Number.isInteger(answerIndex) &&
      answerIndex >= 0 &&
      answerIndex < question.options.length
    ) {
      selectedAnswers[questionId] = answerIndex;
    }
  }

  return {
    status: "restored",
    quizId: record.quizId,
    quiz: {
      questions: response.quiz.questions.map(({ id, question, options }) => ({
        id,
        question,
        options,
      })),
    },
    concept: response.concept,
    source: response.source,
    selectedAnswers,
    activeQuestionIndex:
      record.activeQuestionIndex >= 0 &&
      record.activeQuestionIndex < response.quiz.questions.length
        ? record.activeQuestionIndex
        : 0,
  };
};

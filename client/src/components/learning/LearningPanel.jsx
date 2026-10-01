import React, { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  createConceptQuiz,
  generateLearningExplanation,
  submitConceptQuiz,
} from "../../services/conceptService";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const SOURCE_LABELS = {
  gemini: "Generated with AI",
  fallback: "Generated using ConceptFlow's offline learning engine",
};

const makeLocalExplanation = (concept) => {
  const nodes = concept.nodes || [];
  const keyTakeaways = concept.keyTakeaways?.length
    ? concept.keyTakeaways.slice(0, 6)
    : nodes.slice(0, 6).map((node) => node.description || node.label);
  return {
    beginner: `${concept.title}: ${concept.summary}`,
    intermediate:
      nodes
        .map(
          (node) =>
            `${node.label}: ${node.description || "a key part of the concept"}`,
        )
        .join(" ") || concept.summary,
    advanced: `${concept.summary} ${(concept.connections || [])
      .slice(0, 6)
      .map((connection) => connection.label)
      .filter(Boolean)
      .join("; ")}`.trim(),
    keyTakeaways: keyTakeaways.length ? keyTakeaways : [concept.summary],
    terminology: nodes.slice(0, 8).map((node) => ({
      term: node.label,
      definition:
        node.description ||
        `${node.label} is an important part of ${concept.title}.`,
    })),
  };
};

const isExplanation = (value) =>
  value &&
  LEVELS.every(
    (level) =>
      typeof value[level.toLowerCase()] === "string" &&
      value[level.toLowerCase()].trim(),
  ) &&
  Array.isArray(value.keyTakeaways) &&
  Array.isArray(value.terminology);

const makeLocalQuiz = (concept) => {
  const nodes = concept.nodes?.length
    ? concept.nodes
    : [{ id: "summary", label: concept.title, description: concept.summary }];
  const distractors = [
    "A topic not included in this concept",
    "An unrelated process outside this diagram",
    "A detail that does not appear here",
  ];
  const questions = Array.from({ length: 5 }, (_, index) => {
    const node = nodes[index % nodes.length];
    const correctAnswerIndex = index % 4;
    const baseOptions = [node.label, ...distractors];
    return {
      id: `offline-${index + 1}`,
      question: `Which item is shown as part of ${concept.title}?`,
      options: [
        ...baseOptions.slice(correctAnswerIndex),
        ...baseOptions.slice(0, correctAnswerIndex),
      ],
      correctAnswerIndex,
      explanation:
        node.description || `${node.label} is included in this concept.`,
    };
  });
  return { questions };
};

const isPublicQuiz = (quiz) =>
  Array.isArray(quiz?.questions) &&
  quiz.questions.length === 5 &&
  quiz.questions.every(
    (question) =>
      typeof question.id === "string" &&
      typeof question.question === "string" &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      question.options.every(
        (option) => typeof option === "string" && option.length > 0,
      ),
  );

const LearningPanel = ({
  concept,
  learningLevel,
  onLearningLevelChange,
  onQuizResult,
}) => {
  const [explanation, setExplanation] = useState(null);
  const [explanationSource, setExplanationSource] = useState(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationNotice, setExplanationNotice] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [quizSource, setQuizSource] = useState(null);
  const [quizId, setQuizId] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [quizResult, setQuizResult] = useState(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizNotice, setQuizNotice] = useState("");

  useEffect(() => {
    setExplanation(null);
    setExplanationSource(null);
    setExplanationNotice("");
    resetQuiz();
  }, [concept.id]);

  const resetQuiz = () => {
    setQuiz(null);
    setQuizSource(null);
    setQuizId(null);
    setSelectedAnswers({});
    setActiveQuestion(0);
    setQuizResult(null);
    setQuizNotice("");
  };

  const loadExplanation = async () => {
    setIsLoadingExplanation(true);
    setExplanationNotice("");
    try {
      const result = await generateLearningExplanation(concept);
      if (result.success && isExplanation(result.explanation)) {
        setExplanation(result.explanation);
        setExplanationSource(
          result.source === "gemini" ? "gemini" : "fallback",
        );
        if (result.source !== "gemini") {
          setExplanationNotice(
            "Gemini is unavailable, so this explanation uses the concept's validated learning data.",
          );
        }
      } else {
        setExplanation(makeLocalExplanation(concept));
        setExplanationSource("fallback");
        setExplanationNotice(
          "The learning service could not respond, so this explanation uses the concept details available here.",
        );
      }
    } catch {
      setExplanation(makeLocalExplanation(concept));
      setExplanationSource("fallback");
      setExplanationNotice(
        "The learning service could not respond, so this explanation uses the concept details available here.",
      );
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const startQuiz = async () => {
    setIsLoadingQuiz(true);
    resetQuiz();
    try {
      const result = await createConceptQuiz(concept);
      if (result.success && isPublicQuiz(result.quiz)) {
        setQuiz(result.quiz);
        setQuizId(result.quizId);
        setQuizSource(result.source === "gemini" ? "gemini" : "fallback");
        if (result.source !== "gemini") {
          setQuizNotice(
            "This practice quiz was prepared by ConceptFlow's offline learning engine.",
          );
        }
      } else {
        setQuiz(makeLocalQuiz(concept));
        setQuizSource("fallback");
        setQuizNotice(
          "The quiz service could not respond, so this practice quiz uses the visible concept details.",
        );
      }
    } catch {
      setQuiz(makeLocalQuiz(concept));
      setQuizSource("fallback");
      setQuizNotice(
        "The quiz service could not respond, so this practice quiz uses the visible concept details.",
      );
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const submitQuiz = async () => {
    if (!quiz || Object.keys(selectedAnswers).length !== quiz.questions.length)
      return;
    setIsSubmittingQuiz(true);
    setQuizNotice("");
    try {
      let result;
      if (quizId) {
        const response = await submitConceptQuiz(quizId, selectedAnswers);
        if (!response.success || !response.result) {
          setQuizNotice(
            response.message || "Your quiz could not be submitted. Try again.",
          );
          return;
        }
        result = response.result;
      } else {
        const answers = quiz.questions.map((question) => ({
          questionId: question.id,
          selectedAnswerIndex: selectedAnswers[question.id],
          correctAnswerIndex: question.correctAnswerIndex,
          correct: selectedAnswers[question.id] === question.correctAnswerIndex,
          explanation: question.explanation,
        }));
        const score = answers.filter((answer) => answer.correct).length;
        result = {
          score,
          total: answers.length,
          percentage: Math.round((score / answers.length) * 100),
          answers,
        };
      }
      setQuizResult(result);
      onQuizResult?.(result);
    } catch {
      setQuizNotice(
        "Your quiz could not be submitted. Your answers are still here; try again.",
      );
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const takeaways = explanation?.keyTakeaways?.length
    ? explanation.keyTakeaways
    : concept.keyTakeaways?.length
      ? concept.keyTakeaways
      : (concept.nodes || []).slice(0, 6).map((node) => node.label);
  const activeQuizQuestion = quiz?.questions?.[activeQuestion];
  const submittedAnswer = quizResult?.answers?.find(
    (answer) => answer.questionId === activeQuizQuestion?.id,
  );

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">Key Takeaways</h2>
        </div>
        {takeaways.length ? (
          <div className="flex flex-wrap gap-2">
            {takeaways.map((point, index) => (
              <span
                key={`${index}-${point}`}
                className="max-w-full break-words rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {point}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No takeaways available yet.</p>
        )}
      </section>

      <section
        className="space-y-3"
        aria-labelledby="learning-explanation-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="learning-explanation-heading"
            className="text-lg font-bold text-slate-900"
          >
            Understand this concept
          </h2>
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
            role="group"
            aria-label="Choose a learning level"
          >
            {LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={learningLevel === level}
                onClick={() => onLearningLevelChange(level)}
                className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${learningLevel === level ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {learningLevel === "Beginner"
            ? "Start with the main idea and essential terms."
            : learningLevel === "Advanced"
              ? "Explore precise relationships and deeper terminology."
              : "Connect the main stages and how they relate."}
        </p>
        {!explanation ? (
          <button
            type="button"
            onClick={loadExplanation}
            disabled={isLoadingExplanation}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isLoadingExplanation ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isLoadingExplanation
              ? "Preparing explanation..."
              : "Generate explanation"}
          </button>
        ) : (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">
                {learningLevel} explanation
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {SOURCE_LABELS[explanationSource]}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-700">
              {explanation[learningLevel.toLowerCase()]}
            </p>
            {explanationNotice && (
              <p role="status" className="text-xs text-amber-700">
                {explanationNotice}
              </p>
            )}
            {explanation.terminology.length > 0 && (
              <details className="border-t border-slate-100 pt-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  Important terminology
                </summary>
                <dl className="mt-3 space-y-3">
                  {explanation.terminology.map(({ term, definition }) => (
                    <div
                      key={term}
                      className="sm:grid sm:grid-cols-[minmax(8rem,0.35fr)_1fr] sm:gap-3"
                    >
                      <dt className="text-sm font-semibold text-slate-800">
                        {term}
                      </dt>
                      <dd className="text-sm leading-5 text-slate-600">
                        {definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
            <button
              type="button"
              onClick={loadExplanation}
              disabled={isLoadingExplanation}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-60"
            >
              {isLoadingExplanation ? "Refreshing..." : "Refresh explanation"}
            </button>
          </div>
        )}
        {!explanation && explanationNotice && (
          <p role="status" className="text-sm text-amber-700">
            {explanationNotice}
          </p>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="quiz-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="quiz-heading" className="text-lg font-bold text-slate-900">
              Knowledge check
            </h2>
            <p className="text-sm text-slate-500">
              Five questions based on this concept.
            </p>
          </div>
          {!quiz && (
            <button
              type="button"
              onClick={startQuiz}
              disabled={isLoadingQuiz}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isLoadingQuiz ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CircleHelp className="h-4 w-4" />
              )}
              {isLoadingQuiz ? "Preparing quiz..." : "Start quiz"}
            </button>
          )}
        </div>
        {quizNotice && (
          <p
            role="status"
            className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            {quizNotice}
          </p>
        )}
        {quiz && activeQuizQuestion && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Question {activeQuestion + 1} of {quiz.questions.length}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {SOURCE_LABELS[quizSource]}
              </span>
            </div>
            {!quizResult ? (
              <fieldset className="space-y-3">
                <legend className="mb-3 text-base font-semibold text-slate-900">
                  {activeQuizQuestion.question}
                </legend>
                {activeQuizQuestion.options.map((option, optionIndex) => (
                  <label
                    key={`${activeQuizQuestion.id}-${optionIndex}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${selectedAnswers[activeQuizQuestion.id] === optionIndex ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <input
                      type="radio"
                      name={activeQuizQuestion.id}
                      value={optionIndex}
                      checked={
                        selectedAnswers[activeQuizQuestion.id] === optionIndex
                      }
                      onChange={() =>
                        setSelectedAnswers((answers) => ({
                          ...answers,
                          [activeQuizQuestion.id]: optionIndex,
                        }))
                      }
                      className="mt-0.5 accent-indigo-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  {quizResult.score} / {quizResult.total} correct (
                  {quizResult.percentage}%)
                </div>
                {quizResult.answers.map((answer, index) => {
                  const question = quiz.questions.find(
                    (item) => item.id === answer.questionId,
                  );
                  return (
                    <div
                      key={answer.questionId}
                      className="rounded-md border border-slate-200 p-3"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {index + 1}. {question?.question}
                      </p>
                      <p
                        className={`mt-1 text-sm ${answer.correct ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        {answer.correct
                          ? "Correct"
                          : `Correct answer: ${question?.options[answer.correctAnswerIndex]}`}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {answer.explanation}
                      </p>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={startQuiz}
                  disabled={isLoadingQuiz}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restart quiz
                </button>
              </div>
            )}

            {!quizResult && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setActiveQuestion((index) => Math.max(0, index - 1))
                  }
                  disabled={activeQuestion === 0}
                  className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <div className="flex gap-2">
                  {activeQuestion < quiz.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveQuestion((index) =>
                          Math.min(quiz.questions.length - 1, index + 1),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={submitQuiz}
                      disabled={
                        Object.keys(selectedAnswers).length !==
                          quiz.questions.length || isSubmittingQuiz
                      }
                      className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmittingQuiz && (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      )}
                      Submit quiz
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default LearningPanel;

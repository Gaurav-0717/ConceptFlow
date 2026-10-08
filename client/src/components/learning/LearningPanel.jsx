import React, { useEffect, useRef, useState } from "react";
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
  getConceptQuiz,
  generateLearningExplanation,
  submitConceptQuiz,
} from "../../services/conceptService";
import { useAuth } from "../../context/AuthContext";
import {
  clearQuizResume,
  restoreQuizResume,
  saveQuizResume,
  shouldClearResumeAfterSubmit,
} from "../../services/quizSessionStorage";

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
  onQuizConceptRestore,
  resumeScopeId = concept.id,
}) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const resumeUserId = isAuthenticated ? user?.id : null;
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
  const [isRestoringQuiz, setIsRestoringQuiz] = useState(false);
  const [resumeQuizId, setResumeQuizId] = useState(null);
  const [resumeAttempt, setResumeAttempt] = useState(0);
  const activeQuizOwnerRef = useRef(undefined);
  const previousConceptIdRef = useRef(concept.id);
  const previousResumeUserIdRef = useRef(resumeUserId);
  const previousResumeScopeRef = useRef(resumeScopeId);
  const restoredConceptIdRef = useRef(null);
  const onQuizConceptRestoreRef = useRef(onQuizConceptRestore);
  onQuizConceptRestoreRef.current = onQuizConceptRestore;

  useEffect(() => {
    if (previousConceptIdRef.current === concept.id) return;
    previousConceptIdRef.current = concept.id;
    if (restoredConceptIdRef.current === concept.id) {
      restoredConceptIdRef.current = null;
      return;
    }
    setExplanation(null);
    setExplanationSource(null);
    setExplanationNotice("");
    resetQuiz();
  }, [concept.id]);

  useEffect(() => {
    if (previousResumeScopeRef.current === resumeScopeId) return;
    clearQuizResume(
      activeQuizOwnerRef.current ?? previousResumeUserIdRef.current,
      previousResumeScopeRef.current,
    );
    previousResumeScopeRef.current = resumeScopeId;
    resetQuiz();
    setResumeQuizId(null);
  }, [resumeScopeId, resumeUserId]);

  useEffect(() => {
    if (previousResumeUserIdRef.current !== resumeUserId) {
      previousResumeUserIdRef.current = resumeUserId;
      resetQuiz();
      setResumeQuizId(null);
    }
  }, [resumeUserId]);

  useEffect(() => {
    if (authLoading || (isAuthenticated && !resumeUserId)) return undefined;
    let active = true;
    setIsRestoringQuiz(true);
    restoreQuizResume({
      userId: resumeUserId,
      scopeId: resumeScopeId,
      expectedConceptId: resumeScopeId,
      getQuiz: getConceptQuiz,
    })
      .then((restored) => {
        if (!active) return;
        if (restored.status === "restored") {
          if (restored.concept.id !== concept.id) {
            restoredConceptIdRef.current = restored.concept.id;
            onQuizConceptRestoreRef.current?.(restored.concept);
          }
          activeQuizOwnerRef.current = resumeUserId;
          setQuiz(restored.quiz);
          setQuizId(restored.quizId);
          setQuizSource(restored.source === "gemini" ? "gemini" : "fallback");
          setSelectedAnswers(restored.selectedAnswers);
          setActiveQuestion(restored.activeQuestionIndex);
          setResumeQuizId(null);
          setQuizNotice(
            restored.source === "gemini"
              ? ""
              : "This practice quiz was prepared by ConceptFlow's offline learning engine.",
          );
          return;
        }
        if (restored.status === "missing") {
          setResumeQuizId(null);
          setQuizNotice("This quiz is no longer active. Start a new quiz.");
          return;
        }
        if (restored.status === "unavailable") {
          setResumeQuizId(restored.quizId);
          setQuizNotice(
            "Your active quiz could not be reached. Retry the connection or start a new quiz.",
          );
        }
      })
      .finally(() => {
        if (active) setIsRestoringQuiz(false);
      });
    return () => {
      active = false;
    };
  }, [
    authLoading,
    isAuthenticated,
    resumeUserId,
    resumeAttempt,
    resumeScopeId,
  ]);

  useEffect(() => {
    if (
      authLoading ||
      !quizId ||
      quizResult ||
      activeQuizOwnerRef.current !== resumeUserId
    ) {
      return;
    }
    saveQuizResume(
      { quizId, selectedAnswers, activeQuestionIndex: activeQuestion },
      resumeUserId,
      resumeScopeId,
    );
  }, [
    authLoading,
    resumeUserId,
    resumeScopeId,
    quizId,
    selectedAnswers,
    activeQuestion,
    quizResult,
  ]);

  const resetQuiz = () => {
    activeQuizOwnerRef.current = undefined;
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
    clearQuizResume(resumeUserId, resumeScopeId);
    setResumeQuizId(null);
    resetQuiz();
    try {
      const result = await createConceptQuiz(concept);
      if (result.success && isPublicQuiz(result.quiz)) {
        activeQuizOwnerRef.current = resumeUserId;
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
        if (shouldClearResumeAfterSubmit(response)) {
          clearQuizResume(resumeUserId, resumeScopeId);
        }
        if (!response.success || !response.result) {
          if (response.status === 404) {
            activeQuizOwnerRef.current = undefined;
            setQuiz(null);
            setQuizId(null);
            setSelectedAnswers({});
            setActiveQuestion(0);
            setResumeQuizId(null);
            setQuizNotice("This quiz is no longer active. Start a new quiz.");
            return;
          }
          setQuizNotice(
            response.message || "Your quiz could not be submitted. Try again.",
          );
          return;
        }
        setResumeQuizId(null);
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
            <div className="flex flex-wrap gap-2">
              {resumeQuizId && (
                <button
                  type="button"
                  onClick={() => setResumeAttempt((attempt) => attempt + 1)}
                  disabled={isRestoringQuiz || isLoadingQuiz}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {isRestoringQuiz && (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  )}
                  {isRestoringQuiz ? "Reconnecting..." : "Retry restore"}
                </button>
              )}
              <button
                type="button"
                onClick={startQuiz}
                disabled={isLoadingQuiz || isRestoringQuiz || authLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {isLoadingQuiz ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CircleHelp className="h-4 w-4" />
                )}
                {isLoadingQuiz
                  ? "Preparing quiz..."
                  : resumeQuizId
                    ? "Start a new quiz"
                    : "Start quiz"}
              </button>
            </div>
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
          <div className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-card-soft">
            {/* Header: Question Progress & Bar */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-display">
                  Question {activeQuestion + 1} of {quiz.questions.length}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                  {SOURCE_LABELS[quizSource] || "Interactive Assessment"}
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 ease-out"
                  style={{
                    width: `${((activeQuestion + 1) / quiz.questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {!quizResult ? (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug font-display">
                  {activeQuizQuestion.question}
                </h3>

                {/* Large Selectable Option Cards */}
                <div className="grid grid-cols-1 gap-2.5">
                  {activeQuizQuestion.options.map((option, optionIndex) => {
                    const isSelected = selectedAnswers[activeQuizQuestion.id] === optionIndex;
                    const optionLetter = String.fromCharCode(65 + optionIndex);

                    return (
                      <button
                        key={`${activeQuizQuestion.id}-${optionIndex}`}
                        type="button"
                        onClick={() =>
                          setSelectedAnswers((answers) => ({
                            ...answers,
                            [activeQuizQuestion.id]: optionIndex,
                          }))
                        }
                        className={`w-full flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 group ${
                          isSelected
                            ? "border-indigo-600 bg-gradient-to-r from-indigo-50/90 to-purple-50/50 shadow-sm ring-2 ring-indigo-500/20 font-semibold"
                            : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/70"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                          }`}
                        >
                          {optionLetter}
                        </span>
                        <span className="text-sm text-slate-800 leading-normal flex-1">
                          {option}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Quiz Results & Celebration Screen */
              <div className="space-y-6">
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white p-6 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 font-display">
                      {quizResult.percentage >= 80 ? "Great work! 🎉" : "Quiz Complete! 👏"}
                    </h3>
                    <p className="text-sm text-slate-600 mt-0.5">
                      You scored {quizResult.score} out of {quizResult.total} ({quizResult.percentage}%)
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-sm border border-emerald-200 text-xs font-bold text-emerald-800">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>+{quizResult.percentage >= 80 ? "30" : "20"} XP Earned</span>
                  </div>
                </div>

                {/* Question Review Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Detailed Review
                  </h4>
                  {quizResult.answers.map((answer, index) => {
                    const question = quiz.questions.find(
                      (item) => item.id === answer.questionId,
                    );
                    return (
                      <div
                        key={answer.questionId}
                        className={`rounded-xl border p-4 space-y-1.5 ${
                          answer.correct
                            ? "border-emerald-200/80 bg-emerald-50/30"
                            : "border-rose-200/80 bg-rose-50/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900">
                            {index + 1}. {question?.question}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              answer.correct
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {answer.correct ? "Correct" : "Incorrect"}
                          </span>
                        </div>
                        {!answer.correct && (
                          <p className="text-xs font-semibold text-rose-700">
                            Correct: {question?.options[answer.correctAnswerIndex]}
                          </p>
                        )}
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {answer.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* CTAs */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={startQuiz}
                    disabled={isLoadingQuiz}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retake Quiz</span>
                  </button>
                  <a
                    href="#learning-explanation-heading"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 px-3 py-2"
                  >
                    Review Explanation
                  </a>
                </div>
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
                  className="inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
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
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
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
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-display"
                    >
                      {isSubmittingQuiz && (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      )}
                      <span>Submit Quiz</span>
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

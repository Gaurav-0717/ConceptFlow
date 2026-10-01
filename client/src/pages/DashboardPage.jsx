import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  PlusCircle,
  RotateCw,
  Zap,
  Target,
  GraduationCap,
  Award,
  AlertCircle,
} from "lucide-react";
import useUserLearningHistory from "../hooks/useUserLearningHistory";
import useUserProgress from "../hooks/useUserProgress";
import StreakCard from "../components/dashboard/StreakCard";
import DailyGoalBar from "../components/dashboard/DailyGoalBar";
import StatCard from "../components/dashboard/StatCard";

const formatAccessTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const DashboardPage = () => {
  const {
    history,
    loading: historyLoading,
    error: historyError,
    refresh: refreshHistory,
  } = useUserLearningHistory();

  const {
    progress,
    loading: progressLoading,
    error: progressError,
    refresh: refreshProgress,
  } = useUserProgress();

  // Safely extract progress metrics
  const totalXP = progress?.totalXP ?? 0;
  const todayXP = progress?.todayXP ?? 0;
  const currentStreak = progress?.currentStreak ?? 0;
  const longestStreak =
    progress?.longestStreak ??
    progress?.progress?.longestStreak ??
    currentStreak;
  const conceptsCompleted = progress?.conceptsCompleted ?? 0;
  const quizzesCompleted = progress?.quizzesCompleted ?? 0;
  const quizAccuracy = progress?.quizAccuracy ?? 0;

  // Calculate daily goal progress (target: 5 activities per day)
  const DAILY_GOAL_TARGET = progress?.dailyGoalTarget || 5;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const activitiesToday = history.filter((item) => {
    const timestamp = Date.parse(
      item.updatedAt || item.createdAt || item.lastAccessedAt,
    );
    return !Number.isNaN(timestamp) && timestamp >= todayStart.getTime();
  }).length;

  const dailyGoalCurrent =
    progress?.dailyGoal?.current ??
    progress?.dailyGoalCurrent ??
    Math.min(DAILY_GOAL_TARGET, Math.max(activitiesToday, Math.floor(todayXP / 10)));

  const quizAttempts = history.filter((item) => item.quizTotal > 0);
  const latestQuizResults = quizAttempts.slice(0, 5);

  const handleRefreshAll = () => {
    refreshProgress();
    refreshHistory();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Learning Dashboard
            </h1>
            <button
              type="button"
              onClick={handleRefreshAll}
              title="Refresh dashboard"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Refresh dashboard"
            >
              <RotateCw
                className={`h-4 w-4 ${progressLoading || historyLoading ? "animate-spin text-indigo-600" : ""}`}
              />
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Track your XP, streaks, daily goals, and concept mastery.
          </p>
        </div>
        <Link
          to="/create-concept"
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" /> Create a concept
        </Link>
      </header>

      {/* Progress Error Banner */}
      {progressError && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm"
          role="alert"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p className="font-medium truncate">{progressError}</p>
          </div>
          <button
            type="button"
            onClick={refreshProgress}
            className="shrink-0 rounded-md bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Student Progress Overview */}
      <section aria-label="Student progress" className="space-y-4">
        {progressLoading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="mt-4 h-7 w-16 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : (
          /* Loaded Progress Cards */
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Compact Streak Card */}
              <StreakCard
                currentStreak={currentStreak}
                longestStreak={longestStreak}
              />

              {/* 2. Total XP Card */}
              <StatCard
                icon={Zap}
                label="Total XP"
                value={`${totalXP.toLocaleString()} XP`}
                badgeText={todayXP > 0 ? `+${todayXP} today` : null}
                badgeColor="emerald"
                iconBgColor="bg-amber-50"
                iconColor="text-amber-600"
                subtext={todayXP > 0 ? "Points earned today" : "Complete activities to earn XP"}
              />

              {/* 3. Today's Goal Progress Bar */}
              <DailyGoalBar
                current={dailyGoalCurrent}
                target={DAILY_GOAL_TARGET}
              />

              {/* 4. Quiz Accuracy Card */}
              <StatCard
                icon={Target}
                label="Quiz Accuracy"
                value={`${quizAccuracy}%`}
                iconBgColor="bg-emerald-50"
                iconColor="text-emerald-600"
                subtext={
                  quizzesCompleted > 0
                    ? `${quizzesCompleted} ${quizzesCompleted === 1 ? "quiz" : "quizzes"} completed`
                    : "No quizzes taken yet"
                }
              />
            </div>

            {/* Secondary Milestone Metrics */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Concepts Completed
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {conceptsCompleted}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Award className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Quizzes Completed
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {quizzesCompleted}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Learning History Section */}
      <section aria-labelledby="history-heading" className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <h2 id="history-heading" className="text-lg font-bold text-slate-900">
              Recently Explored
            </h2>
          </div>
          {historyLoading && (
            <span className="text-xs text-slate-500">Loading history…</span>
          )}
        </div>

        {historyError ? (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            role="alert"
          >
            <p>{historyError}</p>
            <button
              type="button"
              onClick={refreshHistory}
              className="mt-2 font-semibold underline hover:text-rose-950"
            >
              Retry
            </button>
          </div>
        ) : historyLoading && !history.length ? (
          <div
            className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
            role="status"
          >
            Loading your learning history…
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              Your account history starts here
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
              Create a concept or open a sample, then your activity and quiz
              results will appear here.
            </p>
            <Link
              to="/create-concept"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              Create your first concept <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {history.slice(0, 8).map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/75 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatAccessTime(item.updatedAt || item.createdAt)}
                    {item.explanationLevel
                      ? ` · ${item.explanationLevel} level`
                      : ""}
                  </p>
                  {item.quizTotal > 0 && (
                    <p className="text-xs font-medium text-emerald-700">
                      Quiz: {item.quizScore}/{item.quizTotal} (
                      {item.quizPercentage}%)
                    </p>
                  )}
                </div>
                <Link
                  to={`/visualize/${encodeURIComponent(item.conceptId)}`}
                  state={{ concept: item.concept }}
                  className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:self-auto"
                >
                  Open concept <ArrowUpRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Latest Quiz Results */}
      {!historyLoading && !historyError && latestQuizResults.length > 0 && (
        <section aria-labelledby="quiz-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h2 id="quiz-heading" className="text-lg font-bold text-slate-900">
              Latest Quiz Results
            </h2>
          </div>
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {latestQuizResults.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/75 transition-colors"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatAccessTime(item.updatedAt || item.createdAt)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-emerald-700">
                  {item.quizScore}/{item.quizTotal} ({item.quizPercentage}%)
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default DashboardPage;

import React from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Flame,
  Award,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Target,
  ArrowRight,
  Sparkles,
  BarChart3,
  Calendar,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import ProgressRing from "../components/dashboard/ProgressRing";
import useUserProgress from "../hooks/useUserProgress";
import useUserLearningHistory from "../hooks/useUserLearningHistory";

const ProgressPage = () => {
  const { progress, loading, error, refresh } = useUserProgress();
  const { history } = useUserLearningHistory();

  const totalXP = progress?.totalXP ?? 0;
  const currentStreak = progress?.currentStreak ?? 0;
  const longestStreak = progress?.longestStreak ?? 0;
  const conceptsCompleted = progress?.conceptsCompleted ?? 0;
  const quizzesCompleted = progress?.quizzesCompleted ?? 0;
  const quizAccuracy = progress?.quizAccuracy ?? 0;
  const todayXP = progress?.todayXP ?? 0;

  // Weekly Goal calculation (e.g. 5 concepts goal)
  const weeklyGoalTarget = 5;
  const weeklyConceptsCompleted = Math.min(conceptsCompleted, weeklyGoalTarget);
  const weeklyGoalRatio = weeklyGoalTarget > 0 ? (weeklyConceptsCompleted / weeklyGoalTarget) * 100 : 0;

  // Milestone levels
  const milestones = [
    {
      level: "Level 1: Explorer",
      targetXP: 100,
      achieved: totalXP >= 100,
      description: "Earn 100 XP from concepts and quizzes",
      progress: Math.min(100, Math.round((totalXP / 100) * 100)),
    },
    {
      level: "Level 2: Scholar",
      targetXP: 300,
      achieved: totalXP >= 300,
      description: "Reach 300 XP and build a consistent routine",
      progress: Math.min(100, Math.round((totalXP / 300) * 100)),
    },
    {
      level: "Level 3: Master",
      targetXP: 500,
      achieved: totalXP >= 500,
      description: "Cross 500 XP to join the elite tier of learners",
      progress: Math.min(100, Math.round((totalXP / 500) * 100)),
    },
    {
      level: "Level 4: Grandmaster",
      targetXP: 1000,
      achieved: totalXP >= 1000,
      description: "Accumulate 1,000+ XP across multiple subjects",
      progress: Math.min(100, Math.round((totalXP / 1000) * 100)),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100/80 px-3 py-1 text-xs font-semibold text-indigo-700">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Real-Time Learning Analytics</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Learning Progress & Mastery
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600">
            Track your cognitive growth, quiz accuracy, and momentum across all subjects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
            <span>Refresh Data</span>
          </button>
          <Link
            to="/create-concept"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-purple-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Learn New Concept</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Core Top Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total XP"
          value={totalXP.toLocaleString()}
          subtext={
            todayXP > 0
              ? `+${todayXP} XP earned today`
              : "Keep completing quizzes"
          }
          icon={Zap}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
          borderColor="border-slate-200"
          badgeText={todayXP > 0 ? `+${todayXP} today` : null}
          badgeColor="indigo"
        />
        <StatCard
          label="Current Streak"
          value={`${currentStreak} ${currentStreak === 1 ? "day" : "days"}`}
          subtext={`Longest streak: ${longestStreak} ${longestStreak === 1 ? "day" : "days"}`}
          icon={Flame}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          borderColor="border-slate-200"
          badgeText={currentStreak > 0 ? "Active habit" : "Start today"}
          badgeColor={currentStreak > 0 ? "amber" : "slate"}
        />
        <StatCard
          label="Concepts Learned"
          value={conceptsCompleted}
          subtext={`${history?.length || 0} topics in history`}
          icon={BookOpen}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          borderColor="border-slate-200"
          badgeText={conceptsCompleted > 0 ? "Verified" : null}
          badgeColor="blue"
        />
        <StatCard
          label="Quiz Accuracy"
          value={`${quizAccuracy}%`}
          subtext={`${quizzesCompleted} ${quizzesCompleted === 1 ? "quiz" : "quizzes"} evaluated`}
          icon={Award}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          borderColor="border-slate-200"
          badgeText={
            quizAccuracy >= 80
              ? "Excellence"
              : quizAccuracy > 0
                ? "Passing"
                : null
          }
          badgeColor={quizAccuracy >= 80 ? "emerald" : "indigo"}
        />
      </div>

      {/* Middle Section: Weekly Goal & Performance Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Circular Progress & Weekly Target */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Weekly Target
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Target: 5 concepts per week
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Target className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-6">
            <ProgressRing
              current={weeklyConceptsCompleted}
              target={weeklyGoalTarget}
              unit="Concepts"
              minimal={true}
            />
            <p className="mt-4 text-center text-xs font-medium text-slate-600">
              {weeklyConceptsCompleted >= weeklyGoalTarget ? (
                <span className="font-semibold text-emerald-600">
                  🎉 Weekly target achieved! Incredible momentum.
                </span>
              ) : (
                <span>
                  You're{" "}
                  <strong className="text-indigo-600">
                    {weeklyGoalTarget - weeklyConceptsCompleted}
                  </strong>{" "}
                  concept
                  {weeklyGoalTarget - weeklyConceptsCompleted === 1
                    ? ""
                    : "s"}{" "}
                  away from your target.
                </span>
              )}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-200">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Pace</span>
              <span>
                {weeklyGoalRatio >= 100
                  ? "On Track"
                  : `${Math.round(weeklyGoalRatio)}% Complete`}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 border border-slate-200/50">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${Math.min(100, weeklyGoalRatio)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Performance Summary Cards */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cognitive Retention & Metrics
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Server-validated assessment metrics
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              Verified Data
            </span>
          </div>

          {/* Retention progress bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Quiz Accuracy Rate
                </span>
                <span className="text-slate-900 font-bold">{quizAccuracy}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${quizAccuracy}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  Consistency Ratio (Streak vs 7-day target)
                </span>
                <span className="text-slate-900 font-bold">
                  {Math.min(100, Math.round((currentStreak / 7) * 100))}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (currentStreak / 7) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-indigo-600" />
                  XP Mastery Level Progress
                </span>
                <span className="text-slate-900 font-bold">
                  {Math.min(100, Math.round((totalXP / 500) * 100))}% (500 XP goal)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                  style={{ width: `${Math.min(100, (totalXP / 500) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Summary Pill Row */}
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xs font-semibold text-slate-600">
                Quizzes Solved
              </p>
              <p className="text-lg font-extrabold text-slate-900">
                {quizzesCompleted}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xs font-semibold text-slate-600">
                Longest Streak
              </p>
              <p className="text-lg font-extrabold text-slate-900">
                {longestStreak}d
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center sm:col-span-1">
              <p className="text-xs font-semibold text-slate-600">XP Today</p>
              <p className="text-lg font-extrabold text-emerald-700">
                +{todayXP}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Milestone Progression */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Tier & Milestone Tiers
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Unlock recognized developer/scholar ranks as you study
            </p>
          </div>
          <Link
            to="/achievements"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View Badge Gallery <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {milestones.map((m) => (
            <div
              key={m.level}
              className={`relative rounded-xl border p-4 transition-all ${
                m.achieved
                  ? "border-emerald-300 bg-emerald-50/50 shadow-xs"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    m.achieved
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {m.achieved ? "Unlocked ✓" : `${m.targetXP} XP Target`}
                </span>
                {m.achieved && (
                  <span className="text-xs font-bold text-emerald-700">
                    100%
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-900">
                {m.level}
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-600 leading-relaxed">
                {m.description}
              </p>

              <div className="mt-4">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>Progress</span>
                  <span className="font-bold text-slate-900">{m.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      m.achieved ? "bg-emerald-500" : "bg-indigo-600"
                    }`}
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;

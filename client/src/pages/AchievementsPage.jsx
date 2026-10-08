import React from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Sparkles,
  Lock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RotateCw,
  ArrowRight,
} from "lucide-react";
import useUserProgress from "../hooks/useUserProgress";
import { ALL_ACHIEVEMENTS } from "../components/dashboard/AchievementBadge";

const calculateProgress = (achievementId, progress) => {
  if (!progress) return { current: 0, target: 1, percent: 0 };
  const totalXP = progress.totalXP ?? 0;
  const currentStreak = progress.currentStreak ?? 0;
  const conceptsCompleted = progress.conceptsCompleted ?? 0;
  const quizzesCompleted = progress.quizzesCompleted ?? 0;

  switch (achievementId) {
    case "first_concept":
      return {
        current: Math.min(1, conceptsCompleted),
        target: 1,
        percent: conceptsCompleted >= 1 ? 100 : Math.round((conceptsCompleted / 1) * 100),
      };
    case "first_quiz":
      return {
        current: Math.min(1, quizzesCompleted),
        target: 1,
        percent: quizzesCompleted >= 1 ? 100 : Math.round((quizzesCompleted / 1) * 100),
      };
    case "quiz_master":
      return {
        current: Math.min(5, quizzesCompleted),
        target: 5,
        percent: Math.min(100, Math.round((quizzesCompleted / 5) * 100)),
      };
    case "streak_3":
      return {
        current: Math.min(3, currentStreak),
        target: 3,
        percent: Math.min(100, Math.round((currentStreak / 3) * 100)),
      };
    case "streak_7":
      return {
        current: Math.min(7, currentStreak),
        target: 7,
        percent: Math.min(100, Math.round((currentStreak / 7) * 100)),
      };
    case "xp_100":
      return {
        current: Math.min(100, totalXP),
        target: 100,
        percent: Math.min(100, Math.round((totalXP / 100) * 100)),
      };
    case "xp_500":
      return {
        current: Math.min(500, totalXP),
        target: 500,
        percent: Math.min(100, Math.round((totalXP / 500) * 100)),
      };
    default:
      return { current: 0, target: 1, percent: 0 };
  }
};

const AchievementsPage = () => {
  const { progress, loading, error, refresh } = useUserProgress();

  const userAchievements = progress?.achievements || [];
  const unlockedMap = new Map();
  userAchievements.forEach((item) => {
    unlockedMap.set(item.achievementId, item);
  });

  const unlockedList = ALL_ACHIEVEMENTS.filter((a) => unlockedMap.has(a.id));
  const lockedList = ALL_ACHIEVEMENTS.filter((a) => !unlockedMap.has(a.id));

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 border border-purple-100/80 px-3 py-1 text-xs font-semibold text-purple-700">
              <Award className="h-3.5 w-3.5" />
              <span>Badge Gallery & Mastery Credentials</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Achievements
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
              Complete milestones, maintain streaks, and prove comprehension to unlock verified badges.
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
              <span>Refresh Badges</span>
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-purple-700"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
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

        {/* Status Counter Bar */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unlocked Badges</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 font-display">
              {unlockedList.length} <span className="text-base font-normal text-slate-400">/ {ALL_ACHIEVEMENTS.length}</span>
            </p>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              {Math.round((unlockedList.length / ALL_ACHIEVEMENTS.length) * 100)}% gallery completed
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Remaining to Unlock</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 font-display">
              {lockedList.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Continue completing quizzes & streaks
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Total XP</p>
            <p className="mt-2 text-3xl font-extrabold text-indigo-600 font-display">
              {(progress?.totalXP ?? 0).toLocaleString()} XP
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Strengthens your mastery tier
            </p>
          </div>
        </div>

        {/* SECTION 1: Unlocked Achievements */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              ✓
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Unlocked ({unlockedList.length})
            </h2>
            <span className="text-xs text-slate-500">Earned through verified server activity</span>
          </div>

          {unlockedList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <Award className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-700">No achievements unlocked yet</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Explore your first concept or take a comprehension quiz to claim your first badge!
              </p>
              <Link
                to="/create-concept"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Explore a Concept</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {unlockedList.map((badge) => {
                const unlockedData = unlockedMap.get(badge.id);
                const unlockedDate = unlockedData?.unlockedAt
                  ? new Date(unlockedData.unlockedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Completed";

                return (
                  <div
                    key={badge.id}
                    className="relative rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-card-soft transition-all hover:-translate-y-1 hover:shadow-card-hover"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr ${badge.color} text-2xl shadow-lg ${badge.glow}`}
                      >
                        {badge.emoji}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-bold text-slate-900 truncate">
                            {badge.title}
                          </h3>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Unlocked
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {badge.description}
                        </p>
                        <p className="pt-2 text-[11px] font-medium text-slate-400">
                          Unlocked on {unlockedDate}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: Locked / In Progress */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
              🔒
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              In Progress & Locked ({lockedList.length})
            </h2>
            <span className="text-xs text-slate-500">Track progress towards unlocking these badges</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lockedList.map((badge) => {
              const { current, target, percent } = calculateProgress(badge.id, progress);

              return (
                <div
                  key={badge.id}
                  className="relative rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 shadow-xs transition-all hover:bg-white hover:border-slate-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-2xl grayscale opacity-60">
                      {badge.emoji}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-slate-700 truncate">
                          {badge.title}
                        </h3>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">
                          <Lock className="h-2.5 w-2.5" />
                          Locked
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {badge.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="pt-3">
                        <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                          <span>
                            Progress: {current} / {target}
                          </span>
                          <span>{percent}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
  );
};

export default AchievementsPage;

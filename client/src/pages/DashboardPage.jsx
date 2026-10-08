import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  PlusCircle,
  RotateCw,
  Zap,
  Flame,
  Target,
  GraduationCap,
  Award,
  AlertCircle,
  Sparkles,
  Compass,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import ProgressRing from "../components/dashboard/ProgressRing";
import ConceptMapPreview from "../components/dashboard/ConceptMapPreview";
import LearningJourney from "../components/dashboard/LearningJourney";
import FeaturedConceptCard from "../components/dashboard/FeaturedConceptCard";
import LeaderboardPreviewCard from "../components/dashboard/LeaderboardPreviewCard";
import AchievementBadge, { ALL_ACHIEVEMENTS } from "../components/dashboard/AchievementBadge";
import useUserLearningHistory from "../hooks/useUserLearningHistory";
import useUserProgress from "../hooks/useUserProgress";
import { useAuth } from "../context/AuthContext";
import { sampleConcepts } from "../data/sampleConcepts";

const getGreeting = (name) => {
  const hour = new Date().getHours();
  let timeStr = "Good day";
  if (hour < 12) timeStr = "Good morning";
  else if (hour < 17) timeStr = "Good afternoon";
  else timeStr = "Good evening";

  return name ? `${timeStr}, ${name} 👋` : `${timeStr} 👋`;
};

const formatAccessTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 2) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const DashboardPage = () => {
  const { user } = useAuth();
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

  // Safely extract real metrics
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

  // Real daily goal calculation (target: 5)
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
    Math.min(
      DAILY_GOAL_TARGET,
      Math.max(activitiesToday, Math.floor(todayXP / 10)),
    );

  const rawAchievements = Array.isArray(progress?.achievements)
    ? progress.achievements
    : [];
  const achievementsCount = rawAchievements.length;

  // Featured concept: most recent from history, or first curated sample
  const mostRecentItem = history.length > 0 ? history[0] : null;

  const handleRefreshAll = () => {
    refreshProgress();
    refreshHistory();
  };

  const userName = user?.name ? user.name.split(" ")[0] : "";

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* ========================================================= */}
        {/* 1. HERO HEADER                                           */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden rounded-3xl border border-indigo-100/80 bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 p-6 sm:p-9 text-white shadow-xl">
          {/* Ambient glow lights */}
          <div className="absolute top-0 right-0 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-md border border-white/15">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  🔥 {currentStreak} day learning streak
                </span>
                <span className="text-white/40">·</span>
                <span className="text-indigo-200">
                  {todayXP > 0 ? `+${todayXP} XP today` : "Ready to learn"}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
                {getGreeting(userName)}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                Turn what you learn into concepts you can actually understand.
              </p>
            </div>

            {/* Hero Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={mostRecentItem ? `/visualize/${encodeURIComponent(mostRecentItem.conceptId)}` : "/visualize"}
                state={mostRecentItem?.concept ? { concept: mostRecentItem.concept } : undefined}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all"
              >
                <span>Continue Learning</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/create-concept"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all"
              >
                <Compass className="h-4 w-4 text-indigo-300" />
                <span>Explore Concepts</span>
              </Link>
              <button
                type="button"
                onClick={handleRefreshAll}
                title="Refresh live data"
                className="rounded-xl p-3 text-slate-300 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                aria-label="Refresh data"
              >
                <RotateCw
                  className={`h-4 w-4 ${progressLoading || historyLoading ? "animate-spin text-indigo-400" : ""}`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Error Notice */}
        {progressError && (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm"
            role="alert"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <p className="font-medium truncate">{progressError}</p>
            </div>
            <button
              type="button"
              onClick={refreshProgress}
              className="shrink-0 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. TOP 4 METRICS CARDS                                    */}
        {/* ========================================================= */}
        <section aria-label="Key learning statistics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Total XP */}
            <StatCard
              icon={Zap}
              label="Experience Points"
              value={`${totalXP.toLocaleString()} XP`}
              badgeText={todayXP > 0 ? `+${todayXP} today` : "Live stats"}
              badgeColor="indigo"
              iconBgColor="bg-indigo-500/10"
              iconColor="text-indigo-600"
              subtext={todayXP > 0 ? "XP awarded for completed learning" : "Earn points by exploring & quizzes"}
              gradient="from-indigo-50/40 via-white to-white"
              borderColor="border-indigo-100"
            />

            {/* Card 2: Current Streak */}
            <StatCard
              icon={Flame}
              label="Learning Streak"
              value={`${currentStreak} ${currentStreak === 1 ? "Day" : "Days"}`}
              badgeText={longestStreak > currentStreak ? `Best: ${longestStreak}d` : "Active"}
              badgeColor="orange"
              iconBgColor="bg-orange-500/10"
              iconColor="text-orange-600"
              subtext={currentStreak > 0 ? "Keep your momentum alive today" : "Study a concept to begin a streak"}
              gradient="from-orange-50/30 via-white to-white"
              borderColor="border-orange-100"
            />

            {/* Card 3: Concepts Learned */}
            <StatCard
              icon={GraduationCap}
              label="Concepts Learned"
              value={conceptsCompleted.toString()}
              badgeText={`${history.length} explored`}
              badgeColor="emerald"
              iconBgColor="bg-emerald-500/10"
              iconColor="text-emerald-600"
              subtext={conceptsCompleted > 0 ? "Structured cognitive maps mastered" : "Start your first interactive concept"}
              gradient="from-emerald-50/30 via-white to-white"
              borderColor="border-emerald-100"
            />

            {/* Card 4: Achievements */}
            <StatCard
              icon={Award}
              label="Achievements"
              value={`${achievementsCount} / ${ALL_ACHIEVEMENTS.length}`}
              badgeText={achievementsCount > 0 ? "Unlocked" : "Ready"}
              badgeColor="purple"
              iconBgColor="bg-purple-500/10"
              iconColor="text-purple-600"
              subtext={
                achievementsCount > 0
                  ? `${achievementsCount} badges proudly displayed`
                  : "Complete milestones to earn badges"
              }
              gradient="from-purple-50/30 via-white to-white"
              borderColor="border-purple-100"
            />
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. FEATURED CONTINUE LEARNING CARD                        */}
        {/* ========================================================= */}
        <section aria-label="Featured concept">
          <FeaturedConceptCard
            item={mostRecentItem}
            fallbackConcept={sampleConcepts[0]}
          />
        </section>

        {/* ========================================================= */}
        {/* 4. CONCEPT VISUALIZATION PREVIEW                          */}
        {/* ========================================================= */}
        <section aria-label="AI Concept Map Preview">
          <ConceptMapPreview
            concept={mostRecentItem || sampleConcepts[0]}
          />
        </section>

        {/* ========================================================= */}
        {/* 5. LEARNING JOURNEY ROADMAP                               */}
        {/* ========================================================= */}
        <section aria-label="Learning Journey Roadmap">
          <LearningJourney progress={progress} />
        </section>

        {/* ========================================================= */}
        {/* 6. GOAL & LEADERBOARD GRID                                */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Goal Circular Indicator */}
          <ProgressRing
            current={dailyGoalCurrent}
            target={DAILY_GOAL_TARGET}
            label="Daily Learning Target"
            unit="Activities"
          />

          {/* Top Learners Leaderboard Preview */}
          <LeaderboardPreviewCard />
        </div>

        {/* ========================================================= */}
        {/* 7. RECENT ACTIVITY TIMELINE & QUIZ RESULTS                */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left (2 cols): Recently Explored Concepts */}
          <section className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card-soft space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 shadow-sm">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Recent Learning Activity
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Your personal exploration history
                  </p>
                </div>
              </div>

              <Link
                to="/history"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <span>Full History</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {historyLoading && !history.length ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Loading recent activity…
              </div>
            ) : history.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No activity recorded yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Explore concepts from the Learn tab or sample library to populate your interactive timeline.
                </p>
                <Link
                  to="/create-concept"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Start learning now
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.slice(0, 5).map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {item.title}
                        </h4>
                        <span className="rounded-md bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 uppercase">
                          {item.type}
                        </span>
                        {item.quizTotal > 0 && (
                          <span className="rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Quiz: {item.quizScore}/{item.quizTotal}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {item.summary}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatAccessTime(item.updatedAt || item.createdAt)}
                      </span>
                      <Link
                        to={`/visualize/${encodeURIComponent(item.conceptId)}`}
                        state={{ concept: item.concept }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Right (1 col): Recent Quiz Performance Card */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card-soft space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3.5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Quiz Insights
                </h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                {quizAccuracy}% Avg
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 p-2 rounded-xl bg-slate-50">
                <span>Quizzes Completed</span>
                <span className="font-bold text-slate-900">{quizzesCompleted}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 p-2 rounded-xl bg-slate-50">
                <span>Total XP Earned</span>
                <span className="font-bold text-indigo-600">+{totalXP} XP</span>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Recent Scores
              </h4>
              {history.filter((i) => i.quizTotal > 0).slice(0, 3).length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Take a quiz on any concept to test your knowledge!
                </p>
              ) : (
                <div className="space-y-2">
                  {history
                    .filter((i) => i.quizTotal > 0)
                    .slice(0, 3)
                    .map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between text-xs border border-slate-100 rounded-xl p-2.5 hover:bg-slate-50 transition-colors"
                      >
                        <span className="truncate font-medium text-slate-800 max-w-[140px]">
                          {q.title}
                        </span>
                        <span className="font-bold text-emerald-700">
                          {q.quizScore}/{q.quizTotal} ({q.quizPercentage}%)
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ========================================================= */}
        {/* 8. ACHIEVEMENTS SECTION                                   */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Achievement Showcase
              </h2>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                {achievementsCount} of {ALL_ACHIEVEMENTS.length} Unlocked
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ALL_ACHIEVEMENTS.map((ach) => {
              const userUnlocked = rawAchievements.find(
                (ua) => ua.achievementId === ach.id,
              );
              return (
                <AchievementBadge
                  key={ach.id}
                  achievement={ach}
                  isUnlocked={Boolean(userUnlocked)}
                  unlockedAt={userUnlocked?.unlockedAt}
                />
              );
            })}
          </div>
        </section>
      </div>
  );
};

export default DashboardPage;

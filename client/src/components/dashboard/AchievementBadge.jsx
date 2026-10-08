import React from "react";
import { Lock, CheckCircle2, Sparkles } from "lucide-react";

export const ALL_ACHIEVEMENTS = [
  {
    id: "first_concept",
    emoji: "🎯",
    title: "First Concept",
    description: "Explored your first interactive concept.",
    color: "from-indigo-500 to-blue-600",
    glow: "shadow-indigo-500/20",
  },
  {
    id: "first_quiz",
    emoji: "🧠",
    title: "First Quiz",
    description: "Completed your first comprehension quiz.",
    color: "from-purple-500 to-indigo-600",
    glow: "shadow-purple-500/20",
  },
  {
    id: "quiz_master",
    emoji: "🏆",
    title: "Quiz Master",
    description: "Completed 5 concept quizzes with mastery.",
    color: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/20",
  },
  {
    id: "streak_3",
    emoji: "🔥",
    title: "3-Day Streak",
    description: "Kept a learning streak for 3 consecutive days.",
    color: "from-orange-500 to-red-600",
    glow: "shadow-orange-500/20",
  },
  {
    id: "streak_7",
    emoji: "⚡",
    title: "7-Day Streak",
    description: "Maintained a 7-day active learning habit.",
    color: "from-rose-500 to-pink-600",
    glow: "shadow-rose-500/20",
  },
  {
    id: "xp_100",
    emoji: "⭐",
    title: "Rising Star",
    description: "Crossed 100 total XP earned from learning.",
    color: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/20",
  },
  {
    id: "xp_500",
    emoji: "💎",
    title: "XP Champion",
    description: "Accumulated 500+ XP on your profile.",
    color: "from-cyan-500 to-blue-600",
    glow: "shadow-cyan-500/20",
  },
];

export const AchievementBadge = ({ achievement, isUnlocked, unlockedAt }) => {
  const formattedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString(undefined, {
        dateStyle: "medium",
      })
    : null;

  return (
    <div
      className={`relative flex items-start gap-3.5 rounded-2xl border p-4 transition-all duration-300 ${
        isUnlocked
          ? "border-slate-200/90 bg-white shadow-card-soft hover:shadow-card-hover hover:-translate-y-1"
          : "border-slate-200/50 bg-slate-50/60 opacity-60 grayscale-[40%]"
      }`}
    >
      {/* Badge Icon */}
      <div
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-md ${
          isUnlocked
            ? `bg-gradient-to-tr ${achievement.color} text-white shadow-lg ${achievement.glow}`
            : "bg-slate-200 text-slate-400"
        }`}
      >
        <span>{achievement.emoji}</span>
        {isUnlocked ? (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
            <CheckCircle2 className="h-3 w-3" />
          </span>
        ) : (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-white ring-2 ring-white">
            <Lock className="h-2.5 w-2.5" />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-1">
          <h4 className="text-sm font-bold text-slate-900 font-display truncate">
            {achievement.title}
          </h4>
          {isUnlocked && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700 border border-emerald-200">
              Unlocked
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 line-clamp-2">
          {achievement.description}
        </p>
        {formattedDate && (
          <p className="text-[10px] font-medium text-slate-400 pt-0.5">
            Earned on {formattedDate}
          </p>
        )}
      </div>
    </div>
  );
};

export default AchievementBadge;

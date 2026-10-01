import React from "react";

/**
 * Compact streak card component.
 * Displays current streak with flame emoji and longest streak record.
 * 
 * Example:
 * 🔥 7 Day Streak
 * Longest: 12 days
 */
export const StreakCard = ({ currentStreak = 0, longestStreak = 0 }) => {
  const safeCurrent = Math.max(0, Number(currentStreak) || 0);
  const safeLongest = Math.max(safeCurrent, Number(longestStreak) || 0);

  return (
    <div
      className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="streak-card"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-2xl shadow-inner select-none">
        🔥
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-slate-900 leading-tight">
          {safeCurrent} Day Streak
        </p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">
          Longest: {safeLongest} {safeLongest === 1 ? "day" : "days"}
        </p>
      </div>
    </div>
  );
};

export default StreakCard;

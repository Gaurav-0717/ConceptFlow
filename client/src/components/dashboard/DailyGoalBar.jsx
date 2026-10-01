import React from "react";
import { Target, CheckCircle2 } from "lucide-react";

/**
 * Clean "Today's Goal" progress bar component.
 * Displays daily progress count and visual progress bar.
 * 
 * Example:
 * Today's Goal
 * ████████░░ 4 / 5
 */
export const DailyGoalBar = ({ current = 0, target = 5 }) => {
  const safeTarget = Math.max(1, Number(target) || 5);
  const safeCurrent = Math.max(0, Number(current) || 0);
  const percentage = Math.min(100, Math.round((safeCurrent / safeTarget) * 100));
  const isGoalReached = safeCurrent >= safeTarget;

  return (
    <div
      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="daily-goal-bar"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            {isGoalReached ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Target className="h-4 w-4 text-indigo-600" />
            )}
          </div>
          <span className="text-sm font-semibold text-slate-900">
            Today's Goal
          </span>
        </div>
        <span className="text-sm font-bold text-slate-800 tabular-nums">
          {safeCurrent} / {safeTarget}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        <div
          role="progressbar"
          aria-valuenow={safeCurrent}
          aria-valuemin={0}
          aria-valuemax={safeTarget}
          aria-label="Daily goal progress"
          className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isGoalReached
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                : "bg-gradient-to-r from-indigo-500 to-indigo-600"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>{percentage}% completed</span>
          {isGoalReached ? (
            <span className="font-medium text-emerald-600">Goal reached! 🎉</span>
          ) : (
            <span>
              {safeTarget - safeCurrent} more to complete
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyGoalBar;

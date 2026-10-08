import React from "react";
import { Target, CheckCircle2 } from "lucide-react";

export const ProgressRing = ({
  current = 0,
  target = 5,
  label = "Daily Goal",
  unit = "Concepts",
  percentage: customPercentage,
  minimal = false,
}) => {
  const percentage =
    typeof customPercentage === "number"
      ? Math.min(100, Math.max(0, Math.round(customPercentage)))
      : Math.min(100, Math.round((current / Math.max(1, target)) * 100));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const isComplete = current >= target;

  const ringElement = (
    <div className="relative flex shrink-0 items-center justify-center">
      <svg className="h-28 w-28 -rotate-90 transform" viewBox="0 0 96 96">
        {/* Background Track */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          className="stroke-slate-100"
          strokeWidth="8"
          fill="transparent"
        />
        {/* Animated Progress Path */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          className={`transition-all duration-1000 ease-out ${
            isComplete ? "stroke-emerald-500" : "stroke-indigo-600"
          }`}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>

      {/* Center Label */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold text-slate-900 font-display">
          {current}/{target}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {unit}
        </span>
      </div>
    </div>
  );

  if (minimal) {
    return ringElement;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      {ringElement}

      {/* Info & Text */}
      <div className="flex-1 text-center sm:text-left space-y-1">
        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 font-display">
          <Target className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <h4 className="text-base font-bold text-slate-900">
          {isComplete
            ? "Goal Completed for Today! 🎉"
            : `${percentage}% of your daily target achieved`}
        </h4>
        <p className="text-xs text-slate-500">
          {isComplete
            ? "Awesome work! You've hit your learning target. Keep exploring concepts for extra XP."
            : target - current === 1
              ? "You're just 1 activity away from reaching your goal!"
              : `${target - current} more activities needed to complete today's goal.`}
        </p>
      </div>
    </div>
  );
};

export default ProgressRing;

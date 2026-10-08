import React from "react";

export const StatCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  badgeText,
  badgeColor = "emerald",
  trend,
  trendType = "neutral",
  iconBgColor = "bg-indigo-50",
  iconColor = "text-indigo-600",
  borderColor = "border-slate-200/80",
}) => {
  // Support both badgeText and trend prop
  const effectiveBadgeText = badgeText || trend;
  const effectiveBadgeColor =
    badgeColor || (trendType === "up" ? "emerald" : "indigo");

  const getBadgeClasses = (color) => {
    switch (color) {
      case "emerald":
      case "green":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "orange":
      case "amber":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "blue":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "purple":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "slate":
      case "gray":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border ${borderColor} bg-white p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 font-display">
          {label}
        </span>
        {Icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgColor} ${iconColor} border shadow-2xs group-hover:scale-105 transition-transform`}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
          {value}
        </span>
        {effectiveBadgeText && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getBadgeClasses(
              effectiveBadgeColor,
            )}`}
          >
            {effectiveBadgeText}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs font-medium text-slate-600 leading-relaxed">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default StatCard;

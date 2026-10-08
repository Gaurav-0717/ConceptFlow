import React from "react";
import {
  Sparkles,
  HelpCircle,
  TrendingUp,
  Award,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export const LearningJourney = ({ progress }) => {
  const conceptsCount = progress?.conceptsCompleted ?? 0;
  const quizzesCount = progress?.quizzesCompleted ?? 0;
  const xpCount = progress?.totalXP ?? 0;
  const achievementsCount = Array.isArray(progress?.achievements)
    ? progress.achievements.length
    : 0;

  // Determine stage status dynamically from real progress
  // Step 1: Learn Concept
  const step1Done = conceptsCount > 0;
  // Step 2: Take Quiz
  const step2Done = quizzesCount > 0;
  // Step 3: Track Progress
  const step3Done = xpCount >= 50;
  // Step 4: Earn Achievement
  const step4Done = achievementsCount > 0;

  const STEPS = [
    {
      num: 1,
      title: "Learn Concept",
      subtitle: conceptsCount > 0 ? `${conceptsCount} studied` : "Generate visual map",
      icon: Sparkles,
      status: step1Done ? "completed" : "current",
      color: "indigo",
    },
    {
      num: 2,
      title: "Take Quiz",
      subtitle: quizzesCount > 0 ? `${quizzesCount} completed` : "Test comprehension",
      icon: HelpCircle,
      status: step2Done ? "completed" : step1Done ? "current" : "upcoming",
      color: "purple",
    },
    {
      num: 3,
      title: "Track Progress",
      subtitle: xpCount > 0 ? `${xpCount.toLocaleString()} XP earned` : "Server-verified stats",
      icon: TrendingUp,
      status: step3Done ? "completed" : step2Done ? "current" : "upcoming",
      color: "cyan",
    },
    {
      num: 4,
      title: "Earn Achievement",
      subtitle: achievementsCount > 0 ? `${achievementsCount} unlocked` : "Milestone rewards",
      icon: Award,
      status: step4Done ? "completed" : step3Done ? "current" : "upcoming",
      color: "amber",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card-soft">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-display">
            Learning Journey Roadmap
          </h3>
          <p className="text-xs text-slate-500">
            How ConceptFlow reinforces deep understanding from exploration to mastery.
          </p>
        </div>
        <span className="self-start sm:self-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Pedagogical Cycle
        </span>
      </div>

      {/* Horizontal Steps */}
      <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";

          return (
            <div key={step.num} className="relative flex flex-col items-center text-center group">
              {/* Connector line to next item (desktop) */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`hidden lg:block absolute top-6 left-1/2 w-full h-0.5 transition-colors ${
                    isCompleted ? "bg-indigo-500" : "bg-slate-200"
                  }`}
                  style={{ zIndex: 0 }}
                />
              )}

              {/* Circle Icon Badge */}
              <div
                className={`relative z-10 flex h-13 w-13 items-center justify-center rounded-2xl border-2 transition-all duration-300 p-3 ${
                  isCompleted
                    ? "bg-gradient-to-tr from-indigo-600 to-purple-600 border-indigo-500 text-white shadow-md shadow-indigo-500/25 scale-105"
                    : isCurrent
                      ? "bg-white border-indigo-600 text-indigo-600 shadow-glow-sm scale-110 ring-4 ring-indigo-50"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-white" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </div>

              {/* Step info */}
              <div className="mt-3.5 space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Step {step.num}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold uppercase text-indigo-700">
                      In Progress
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900 font-display">
                  {step.title}
                </h4>
                <p className="text-xs text-slate-500">
                  {step.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LearningJourney;

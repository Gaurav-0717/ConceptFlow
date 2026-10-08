import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  Clock3,
  Award,
} from "lucide-react";

export const FeaturedConceptCard = ({ item, fallbackConcept }) => {
  const activeItem = item || fallbackConcept;
  if (!activeItem) return null;

  const concept = activeItem.concept || activeItem;
  const title = activeItem.title || concept.title || "Photosynthesis";
  const category = activeItem.type || concept.type || "Flowchart";
  const summary = activeItem.summary || concept.summary || "Explore how systems and processes work interactively.";
  const conceptId = activeItem.conceptId || concept.id || "photosynthesis";
  const level = activeItem.explanationLevel || concept.difficulty || "Intermediate";

  // Calculate realistic mastery progress from real quiz / completion data
  let progressPct = 25;
  if (activeItem.completed) {
    progressPct = 100;
  } else if (activeItem.quizTotal > 0) {
    progressPct = Math.max(50, activeItem.quizPercentage || 75);
  } else if (activeItem.explanationLevel) {
    progressPct = 40;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-900 via-navy-900 to-slate-900 p-6 sm:p-7 text-white shadow-card-hover group">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-gradient-to-tr from-cyan-500/15 via-blue-500/15 to-transparent blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Content & Details */}
        <div className="space-y-3.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-300">
              <Sparkles className="h-3 w-3" />
              {category}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300">
              {level} Level
            </span>
            {activeItem.quizTotal > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" />
                Score: {activeItem.quizScore}/{activeItem.quizTotal}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              {title}
            </h3>
            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
              {summary}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span>Concept Mastery</span>
              <span className="font-bold text-indigo-300">{progressPct}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800/80 p-0.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: CTA Button */}
        <div className="shrink-0 flex sm:flex-col items-start md:items-end justify-between md:justify-center gap-3">
          <Link
            to={`/visualize/${encodeURIComponent(conceptId)}`}
            state={activeItem.concept ? { concept: activeItem.concept } : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all group-hover:from-indigo-400 group-hover:to-blue-400"
          >
            <span>Continue Learning</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-[11px] text-slate-400">
            Interactive Visual Walkthrough
          </span>
        </div>
      </div>
    </div>
  );
};

export default FeaturedConceptCard;

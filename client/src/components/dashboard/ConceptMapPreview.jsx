import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Sun,
  Wind,
  Droplets,
  Zap,
  ArrowRight,
  Eye,
  GitFork,
  CheckCircle2,
} from "lucide-react";

export const ConceptMapPreview = ({
  concept = null,
  title = "AI Concept Map Architecture",
}) => {
  // If a real concept is provided, we can dynamically highlight its nodes, or show the standard high-impact cognitive preview
  const conceptTitle = concept?.title || "Photosynthesis";
  const conceptCategory = concept?.type || "Flowchart";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/60 to-indigo-50/30 p-6 shadow-card-soft">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/70 pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-500/30">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-base font-bold text-slate-900 font-display">
              {title}
            </h3>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/80">
              Interactive Preview
            </span>
          </div>
          <p className="text-xs text-slate-500">
            ConceptFlow automatically structures text into cognitive node graphs.
          </p>
        </div>

        <Link
          to={concept?.conceptId ? `/visualize/${encodeURIComponent(concept.conceptId)}` : "/visualize"}
          state={concept?.concept ? { concept: concept.concept } : undefined}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 shadow-sm hover:bg-indigo-50/80 hover:text-indigo-700 transition-all"
        >
          <span>Open Full Interactive Engine</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Visual Learning Diagram */}
      <div className="relative my-6 flex flex-col items-center">
        {/* Top Root Node */}
        <div className="group relative z-10 flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 px-5 py-2.5 text-white shadow-md shadow-indigo-600/25 hover:scale-105 transition-all">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight font-display">
            {conceptTitle}
          </span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white/90">
            Core Process
          </span>
        </div>

        {/* Stem Line down from Root */}
        <div className="h-6 w-0.5 bg-gradient-to-b from-indigo-500 to-indigo-300" />

        {/* Horizontal Distributor Line */}
        <div className="relative h-0.5 w-3/4 max-w-md bg-indigo-300">
          {/* Connector tick marks */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-400" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-purple-500" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-400" />
        </div>

        {/* Middle Inputs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mt-3">
          {/* Node 1 */}
          <div className="flex flex-col items-center">
            <div className="h-3 w-0.5 bg-indigo-300" />
            <div className="w-full flex items-center gap-2.5 rounded-xl border border-amber-200 bg-white p-3 shadow-sm hover:border-amber-300 hover:shadow-md transition-all">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Sun className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Sunlight (Photons)</p>
                <p className="text-[10px] text-slate-500 truncate">Light-dependent input</p>
              </div>
            </div>
            <div className="h-3 w-0.5 bg-slate-300" />
          </div>

          {/* Node 2 */}
          <div className="flex flex-col items-center">
            <div className="h-3 w-0.5 bg-purple-300" />
            <div className="w-full flex items-center gap-2.5 rounded-xl border border-sky-200 bg-white p-3 shadow-sm hover:border-sky-300 hover:shadow-md transition-all">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <Wind className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Carbon Dioxide (CO₂)</p>
                <p className="text-[10px] text-slate-500 truncate">Calvin cycle carbon</p>
              </div>
            </div>
            <div className="h-3 w-0.5 bg-slate-300" />
          </div>

          {/* Node 3 */}
          <div className="flex flex-col items-center">
            <div className="h-3 w-0.5 bg-indigo-300" />
            <div className="w-full flex items-center gap-2.5 rounded-xl border border-blue-200 bg-white p-3 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Droplets className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Water (H₂O)</p>
                <p className="text-[10px] text-slate-500 truncate">Electron donor</p>
              </div>
            </div>
            <div className="h-3 w-0.5 bg-slate-300" />
          </div>
        </div>

        {/* Convergence Line */}
        <div className="relative h-0.5 w-3/4 max-w-md bg-slate-300 mt-0">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </div>
        <div className="h-4 w-0.5 bg-emerald-400" />

        {/* Bottom Output Node */}
        <div className="relative z-10 flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-white shadow-md shadow-emerald-600/20 hover:scale-105 transition-all">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight font-display">
            Glucose (C₆H₁₂O₆) + Oxygen (O₂)
          </span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white/90">
            Outputs
          </span>
        </div>
      </div>

      {/* Footer Pill metadata */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500">
        <span className="flex items-center gap-1 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Adaptive Cognitive Graph
        </span>
        <span>Supports Flowcharts, Cycles, Timelines, Hierarchies & Sequences</span>
      </div>
    </div>
  );
};

export default ConceptMapPreview;

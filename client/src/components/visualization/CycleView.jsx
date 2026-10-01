import React, { useState, useEffect } from "react";
import { RotateCw, ArrowRight, Play, Pause, ChevronRight, RefreshCw, CheckCircle2 } from "lucide-react";

/**
 * CycleView
 * Renders a circular learning visualization demonstrating recurring, closed-loop processes.
 * Features an orbital ring, curved directional arrows, continuous repeating loop indicator,
 * and step-by-step cycle walkthrough.
 */
const CycleView = ({ concept }) => {
  const nodes = concept?.nodes || [];
  const connections = concept?.connections || [];

  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play cycle progression
  useEffect(() => {
    let timer;
    if (isPlaying && nodes.length > 0) {
      timer = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % nodes.length);
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, nodes.length]);

  if (nodes.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        No cyclical nodes to display.
      </div>
    );
  }

  const activeNode = nodes[activeStep] || nodes[0];
  const nextStepIndex = (activeStep + 1) % nodes.length;
  const nextNode = nodes[nextStepIndex];

  // Colors for cyclical nodes
  const cyclePalette = [
    { bg: "bg-sky-500", light: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
    { bg: "bg-indigo-500", light: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    { bg: "bg-blue-600", light: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-cyan-500", light: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
    { bg: "bg-teal-500", light: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    { bg: "bg-violet-500", light: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" }
  ];

  return (
    <div className="space-y-6">
      {/* Cycle Controls & Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
            <RotateCw className={`w-3.5 h-3.5 ${isPlaying ? "animate-spin" : ""}`} />
            <span>Perpetual Closed Loop</span>
          </div>
          <span className="text-xs text-slate-500">
            Stage {activeStep + 1} of {nodes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isPlaying
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Pause Rotation" : "Auto-Play Cycle"}</span>
          </button>

          <button
            onClick={() => setActiveStep((prev) => (prev + 1) % nodes.length)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>Next Stage</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Cycle Canvas */}
      <div className="relative p-6 sm:p-10 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {/* Visual background circular waves */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <div className="w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] rounded-full border-4 border-indigo-600 border-dashed animate-[spin_60s_linear_infinite]" />
        </div>

        {/* Desktop / Tablet Orbital Wheel Layout */}
        <div className="hidden md:flex flex-col items-center justify-center py-6">
          <div className="relative w-[480px] h-[480px] flex items-center justify-center">
            {/* SVG Connecting Circular Ring with Arrows */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 480 480">
              <defs>
                <linearGradient id="cycleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <marker
                  id="cycleArrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#6366f1" />
                </marker>
              </defs>

              {/* Main Circular Track */}
              <circle
                cx="240"
                cy="240"
                r="170"
                fill="none"
                stroke="url(#cycleGrad)"
                strokeWidth="3"
                strokeDasharray="6 6"
                className="opacity-40"
              />

              {/* Directional Arcs between each adjacent node */}
              {nodes.map((_, i) => {
                const total = nodes.length;
                const angle1 = (i / total) * 2 * Math.PI - Math.PI / 2 + 0.25;
                const angle2 = ((i + 1) / total) * 2 * Math.PI - Math.PI / 2 - 0.25;
                const r = 170;
                const x1 = 240 + r * Math.cos(angle1);
                const y1 = 240 + r * Math.sin(angle1);
                const x2 = 240 + r * Math.cos(angle2);
                const y2 = 240 + r * Math.sin(angle2);

                const isActiveArc = i === activeStep;

                return (
                  <path
                    key={i}
                    d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                    fill="none"
                    stroke={isActiveArc ? "#4f46e5" : "#cbd5e1"}
                    strokeWidth={isActiveArc ? "4" : "2"}
                    markerEnd="url(#cycleArrow)"
                    className={isActiveArc ? "transition-all" : ""}
                  />
                );
              })}
            </svg>

            {/* Central Info Hub */}
            <div className="z-10 w-52 h-52 rounded-full bg-slate-900 text-white p-5 flex flex-col items-center justify-center text-center shadow-xl border-4 border-white transition-all">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-1">
                <RefreshCw className="w-4 h-4 animate-spin [animation-duration:8s]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Continuous Loop
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5 line-clamp-1">
                {activeNode.label}
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 px-1">
                {activeNode.description || "Process transitions continuously."}
              </p>
              <div className="mt-2 text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                <span>Next: {nextNode.label}</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </div>
            </div>

            {/* Orbiting Stage Nodes */}
            {nodes.map((node, index) => {
              const total = nodes.length;
              const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
              const radius = 170;
              const x = 240 + radius * Math.cos(angle);
              const y = 240 + radius * Math.sin(angle);

              const isActive = index === activeStep;
              const palette = cyclePalette[index % cyclePalette.length];

              return (
                <button
                  key={node.id}
                  onClick={() => setActiveStep(index)}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: "translate(-50%, -50%)"
                  }}
                  className={`absolute z-20 group p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center w-36 ${
                    isActive
                      ? "bg-white border-indigo-600 shadow-lg scale-105 ring-4 ring-indigo-500/20"
                      : "bg-white border-slate-200 hover:border-indigo-300 shadow-xs hover:scale-102"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl ${palette.bg} text-white flex items-center justify-center text-xs font-bold mb-1 shadow-xs`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 line-clamp-1">
                    {node.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Stage {index + 1}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile / Responsive Linear Cycle Progression Cards */}
        <div className="space-y-4 md:hidden">
          <div className="p-4 rounded-xl bg-slate-900 text-white text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              Active Stage ({activeStep + 1}/{nodes.length})
            </span>
            <h4 className="text-base font-bold">{activeNode.label}</h4>
            <p className="text-xs text-slate-300">{activeNode.description}</p>
          </div>

          <div className="space-y-3">
            {nodes.map((node, index) => {
              const isActive = index === activeStep;
              const palette = cyclePalette[index % cyclePalette.length];
              const isLast = index === nodes.length - 1;

              return (
                <div key={node.id} className="space-y-2">
                  <div
                    onClick={() => setActiveStep(index)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isActive
                        ? "bg-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg ${palette.bg} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 truncate">{node.label}</h5>
                        {node.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {node.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex justify-center text-indigo-500">
                    {isLast ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-semibold text-indigo-700">
                        <RotateCw className="w-3 h-3" />
                        <span>Loops back to Stage 1 ({nodes[0]?.label})</span>
                      </div>
                    ) : (
                      <ArrowRight className="w-4 h-4 rotate-90" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Repeating Loop Guarantee Banner */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-800">Closed-Loop Regeneration:</span>
            <span>
              Final stage (<strong>{nodes[nodes.length - 1]?.label}</strong>) continuously cycles into initial stage (<strong>{nodes[0]?.label}</strong>).
            </span>
          </div>

          <div className="flex items-center gap-2">
            {nodes.map((node, i) => (
              <button
                key={node.id}
                onClick={() => setActiveStep(i)}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === activeStep ? "bg-indigo-600 scale-125" : "bg-slate-300 hover:bg-slate-400"
                }`}
                title={`Jump to ${node.label}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stage Details Inspection Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Stage {activeStep + 1} Deep Dive: {activeNode.label}
            </h4>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
            Stage {activeStep + 1} of {nodes.length}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {activeNode.description || "Continuous stage in the hydrologic/closed cycle."}
        </p>

        {connections[activeStep] && (
          <div className="pt-2 text-xs text-slate-500 border-t border-slate-100 flex items-center gap-2">
            <span className="font-semibold text-slate-700">Transition Pathway:</span>
            <span>{connections[activeStep].label || `${activeNode.label} leads into ${nextNode.label}`}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CycleView;

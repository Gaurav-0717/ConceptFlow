import React, { useState } from "react";
import { Calendar, ChevronRight, CheckCircle } from "lucide-react";

/**
 * TimelineView
 * Renders a chronological timeline visualization with milestone badges,
 * progress spine, date tags, and descriptive event cards.
 */
const TimelineView = ({ concept }) => {
  const nodes = concept?.nodes || [];
  const connections = concept?.connections || [];
  const [selectedEventId, setSelectedEventId] = useState(nodes[0]?.id || null);

  if (nodes.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        No timeline events to display.
      </div>
    );
  }

  const selectedEvent = nodes.find((n) => n.id === selectedEventId) || nodes[0];

  return (
    <div className="space-y-6">
      {/* Timeline Controls & Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Chronological Sequence
          </span>
          <span className="text-xs text-slate-400">({nodes.length} Milestones)</span>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>Timespan:</span>
          <span className="font-semibold text-slate-800">
            {nodes[0]?.date || "Start"} — {nodes[nodes.length - 1]?.date || "End"}
          </span>
        </div>
      </div>

      {/* Main Timeline Stream */}
      <div className="relative p-6 sm:p-10 rounded-2xl bg-white border border-slate-200 shadow-xs">
        {/* Horizontal Milestone Bar (Desktop) */}
        <div className="hidden lg:block mb-10 pb-8 border-b border-slate-100">
          <div className="relative flex items-center justify-between px-6">
            {/* Connecting Horizontal Line */}
            <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-600 rounded-full" />

            {nodes.map((node, index) => {
              const isSelected = node.id === selectedEvent?.id;

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedEventId(node.id)}
                  className="relative z-10 flex flex-col items-center group focus:outline-none"
                >
                  {/* Date Badge */}
                  <span
                    className={`mb-2 text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md scale-110"
                        : "bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                    }`}
                  >
                    {node.date || `Phase ${index + 1}`}
                  </span>

                  {/* Marker Node */}
                  <div
                    className={`w-6 h-6 rounded-full border-4 transition-all flex items-center justify-center ${
                      isSelected
                        ? "bg-white border-indigo-600 shadow-md ring-4 ring-indigo-500/20 scale-125"
                        : "bg-white border-slate-300 group-hover:border-indigo-400"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? "bg-indigo-600" : "bg-transparent group-hover:bg-indigo-400"
                      }`}
                    />
                  </div>

                  {/* Event Title Below Marker */}
                  <span
                    className={`mt-2 text-xs font-semibold max-w-[120px] text-center line-clamp-1 transition-colors ${
                      isSelected ? "text-indigo-700" : "text-slate-500 group-hover:text-slate-800"
                    }`}
                  >
                    {node.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vertical Timeline Card Stream */}
        <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-indigo-600 before:via-indigo-400 before:to-indigo-200">
          {nodes.map((node, index) => {
            const isSelected = node.id === selectedEvent?.id;
            const isLast = index === nodes.length - 1;

            return (
              <div key={node.id} className="relative group">
                {/* Node Milestone Icon on Spine */}
                <div
                  className={`absolute -left-6 sm:-left-10 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-indigo-600 border-white text-white shadow-md ring-4 ring-indigo-500/20"
                      : "bg-white border-indigo-400 text-indigo-600 group-hover:bg-indigo-50"
                  }`}
                >
                  <span className="text-[10px] font-bold">{index + 1}</span>
                </div>

                {/* Event Card */}
                <div
                  onClick={() => setSelectedEventId(node.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/50 border-indigo-600 shadow-md ring-4 ring-indigo-500/10"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold tracking-wide">
                        {node.date || `Year ${index + 1}`}
                      </span>
                      {node.era && (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {node.era}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">Step {index + 1} of {nodes.length}</span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {node.label}
                  </h4>

                  {node.description && (
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {node.description}
                    </p>
                  )}

                  {/* Transition note to next milestone */}
                  {!isLast && connections[index] && (
                    <div className="mt-3 pt-3 border-t border-slate-100/80 flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                      <span>Progression:</span>
                      <span className="text-slate-600">{connections[index].label}</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Concluding Terminal Node */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Chronological arc complete ({nodes.length} historical stages verified).</span>
          </div>
          <span className="font-semibold text-indigo-600">Era Progression</span>
        </div>
      </div>

      {/* Selected Milestone Detail Banner */}
      {selectedEvent && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Active Milestone Focus
            </span>
            <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              {selectedEvent.date}
            </span>
          </div>
          <h4 className="text-base font-bold text-slate-900">{selectedEvent.label}</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {selectedEvent.description || "Historical milestone in the chronological sequence."}
          </p>
        </div>
      )}
    </div>
  );
};

export default TimelineView;

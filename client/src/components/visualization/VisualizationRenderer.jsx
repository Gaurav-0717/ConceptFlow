import React, { Component } from "react";
import FlowchartView from "./FlowchartView";
import CycleView from "./CycleView";
import TimelineView from "./TimelineView";
import HierarchyView from "./HierarchyView";
import SequenceView from "./SequenceView";
import { AlertTriangle, HelpCircle, FileQuestion } from "lucide-react";

/**
 * ErrorBoundary for graceful fallback handling
 * Guarantees that any unexpected runtime error inside visualization components
 * will never crash the React application.
 */
class VisualizationErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("VisualizationRenderer ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold">Unable to Render Visualization</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                The visualization data could not be processed due to a formatting error.
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/80 border border-amber-200 text-xs font-mono text-amber-800">
            {this.state.error?.message || "Unknown rendering exception"}
          </div>
          <p className="text-xs text-amber-700">
            ConceptFlow protected the session from crashing. Check the concept structure or switch to another concept.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * VisualizationRenderer
 * Selects and renders the appropriate visualization engine based on concept.type.
 * Gracefully handles unknown types, missing nodes, missing connections, and malformed data.
 * Pure presentation component decoupled from data sources (Gemini, DB, Cache, etc.).
 *
 * @param {Object} props.concept - Structured concept data contract
 */
const VisualizationRenderer = ({ concept }) => {
  // 1. Missing or undefined concept
  if (!concept || typeof concept !== "object") {
    return (
      <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Concept Data Provided</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please provide a valid concept object conforming to the Visualization Data Contract.
        </p>
      </div>
    );
  }

  // 2. Normalize and validate nodes
  const nodes = concept.nodes;
  const isSequence = concept.type === "sequence";

  // For sequence, participants or connections can define the nodes
  if (!isSequence && (!nodes || !Array.isArray(nodes) || nodes.length === 0)) {
    return (
      <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <h3 className="text-sm font-bold">Missing or Empty Nodes</h3>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          The concept <strong>"{concept.title || concept.id || "Untitled"}"</strong> does not have any node definitions.
          At least one node is required to construct a visual representation.
        </p>
        <div className="text-[11px] text-amber-800 bg-white/70 p-2.5 rounded-lg border border-amber-200 font-mono">
          Expected: concept.nodes = [&#123; id: "node-1", label: "..." &#125;, ...]
        </div>
      </div>
    );
  }

  // 3. Graceful handling of unknown or missing visualization type
  const rawType = (concept.type || "").trim().toLowerCase();

  const supportedTypes = ["flowchart", "cycle", "timeline", "hierarchy", "sequence"];

  if (!supportedTypes.includes(rawType)) {
    return (
      <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Visualization type is not supported yet
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The requested type <strong>"{concept.type || "undefined"}"</strong> does not map to an active visualizer engine.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Currently Supported Visualization Engines:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {supportedTypes.map((t) => (
              <div
                key={t}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold text-center capitalize"
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 4. Safe render with ErrorBoundary
  return (
    <VisualizationErrorBoundary>
      {rawType === "flowchart" && <FlowchartView concept={concept} />}
      {rawType === "cycle" && <CycleView concept={concept} />}
      {rawType === "timeline" && <TimelineView concept={concept} />}
      {rawType === "hierarchy" && <HierarchyView concept={concept} />}
      {rawType === "sequence" && <SequenceView concept={concept} />}
    </VisualizationErrorBoundary>
  );
};

export default VisualizationRenderer;

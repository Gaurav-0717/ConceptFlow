import React, { useState, useMemo } from "react";
import { ArrowRight, Info, ChevronRight, Activity } from "lucide-react";

/**
 * FlowchartView
 * Renders an automatic layered/topological flowchart.
 * Nodes are displayed as interactive cards grouped by dependency level.
 * Visual connectors indicate direction with badges, arrowheads, and flow animation.
 */
const FlowchartView = ({ concept }) => {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [flowOrientation, setFlowOrientation] = useState("horizontal"); // "horizontal" or "vertical"

  const nodes = concept?.nodes || [];
  const connections = concept?.connections || [];

  // Compute graph levels automatically (topological DAG rank assignment)
  const { levels, nodeLookup, edgeLookup } = useMemo(() => {
    const lookup = new Map();
    const inDegree = new Map();
    const adj = new Map();
    const revAdj = new Map();

    nodes.forEach((n) => {
      lookup.set(n.id, n);
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
      revAdj.set(n.id, []);
    });

    connections.forEach((conn) => {
      if (lookup.has(conn.from) && lookup.has(conn.to)) {
        adj.get(conn.from).push(conn);
        revAdj.get(conn.to).push(conn);
        inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
      }
    });

    // Topological sort / level assignment
    const ranks = new Map();
    const queue = [];

    nodes.forEach((n) => {
      if (inDegree.get(n.id) === 0) {
        ranks.set(n.id, 0);
        queue.push(n.id);
      }
    });

    // If all nodes have inDegree > 0 (cycle or no sources), initialize first node as rank 0
    if (queue.length === 0 && nodes.length > 0) {
      ranks.set(nodes[0].id, 0);
      queue.push(nodes[0].id);
    }

    let visitedCount = 0;
    while (queue.length > 0 && visitedCount < nodes.length * 2) {
      const u = queue.shift();
      visitedCount++;
      const currentRank = ranks.get(u) || 0;

      (adj.get(u) || []).forEach((edge) => {
        const nextRank = currentRank + 1;
        if (!ranks.has(edge.to) || ranks.get(edge.to) < nextRank) {
          ranks.set(edge.to, nextRank);
          queue.push(edge.to);
        }
      });
    }

    // Assign any unranked nodes to rank 0 or maxRank
    nodes.forEach((n) => {
      if (!ranks.has(n.id)) {
        ranks.set(n.id, 0);
      }
    });

    // Group into level buckets
    const maxRank = Math.max(0, ...Array.from(ranks.values()));
    const grouped = [];
    for (let r = 0; r <= maxRank; r++) {
      grouped.push([]);
    }

    nodes.forEach((n) => {
      const r = ranks.get(n.id) || 0;
      grouped[r].push(n);
    });

    // Filter empty levels if any
    const finalLevels = grouped.filter((lvl) => lvl.length > 0);

    return {
      levels: finalLevels,
      nodeLookup: lookup,
      edgeLookup: { adj, revAdj },
    };
  }, [nodes, connections]);

  // Determine active highlights based on hover
  const activeConnections = useMemo(() => {
    if (!hoveredNodeId) return new Set();
    const active = new Set();
    (edgeLookup.adj.get(hoveredNodeId) || []).forEach((e) =>
      active.add(`${e.from}->${e.to}`),
    );
    (edgeLookup.revAdj.get(hoveredNodeId) || []).forEach((e) =>
      active.add(`${e.from}->${e.to}`),
    );
    return active;
  }, [hoveredNodeId, edgeLookup]);

  const selectedNode = selectedNodeId ? nodeLookup.get(selectedNodeId) : null;

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case "input":
        return "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20";
      case "process":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20";
      case "output":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Flow Controls & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Flow Direction:
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setFlowOrientation("horizontal")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                flowOrientation === "horizontal"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Left to Right →
            </button>
            <button
              onClick={() => setFlowOrientation("vertical")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                flowOrientation === "vertical"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Top to Bottom ↓
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Input</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Process</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Output</span>
          </span>
          <span className="text-slate-400">|</span>
          <span className="font-mono text-slate-500">
            {nodes.length} Nodes • {connections.length} Transitions
          </span>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="relative p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-x-auto min-h-[420px]">
        {/* Visual background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#4f46e5 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div
          className={`relative z-10 flex ${
            flowOrientation === "horizontal"
              ? "flex-col md:flex-row items-stretch md:items-center justify-between gap-8 md:gap-10"
              : "flex-col items-center gap-8"
          }`}
        >
          {levels.map((levelNodes, levelIndex) => (
            <React.Fragment key={levelIndex}>
              {/* Level Column / Row */}
              <div className="flex flex-col gap-4 flex-1 min-w-[240px] max-w-[320px]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Stage {levelIndex + 1}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {levelNodes.length}{" "}
                    {levelNodes.length === 1 ? "component" : "components"}
                  </span>
                </div>

                <div className="flex flex-col gap-3.5">
                  {levelNodes.map((node) => {
                    const isHovered = hoveredNodeId === node.id;
                    const isSelected = selectedNodeId === node.id;
                    const outgoing = edgeLookup.adj.get(node.id) || [];
                    const incoming = edgeLookup.revAdj.get(node.id) || [];

                    return (
                      <div
                        key={node.id}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onClick={() =>
                          setSelectedNodeId(
                            node.id === selectedNodeId ? null : node.id,
                          )
                        }
                        className={`group relative p-4 rounded-xl border-2 transition-all cursor-pointer bg-white text-left ${
                          isSelected
                            ? "border-indigo-600 shadow-md ring-4 ring-indigo-500/10"
                            : isHovered
                              ? "border-indigo-400 shadow-sm -translate-y-0.5"
                              : "border-slate-200 hover:border-slate-300 shadow-xs"
                        }`}
                      >
                        {/* Status/Category Tag */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryColor(
                              node.category,
                            )}`}
                          >
                            {node.category || "Entity"}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            #{node.id}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {node.label}
                        </h4>

                        {/* Description snippet */}
                        {node.description && (
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {node.description}
                          </p>
                        )}

                        {/* Incoming/Outgoing badge summary */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>In: {incoming.length}</span>
                          <span className="flex items-center gap-1 text-indigo-600 font-medium">
                            Details <ChevronRight className="w-3 h-3" />
                          </span>
                          <span>Out: {outgoing.length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Directional Connector between Levels */}
              {levelIndex < levels.length - 1 && (
                <div
                  className={`flex items-center justify-center shrink-0 ${
                    flowOrientation === "horizontal"
                      ? "flex-col md:flex-row py-2 md:py-0"
                      : "py-2"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-indigo-600">
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50">
                      <ArrowRight
                        className={`w-4 h-4 text-indigo-600 transition-transform ${
                          flowOrientation === "vertical" ? "rotate-90" : ""
                        }`}
                      />
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Flow
                    </span>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Detailed connections stay available without extending the default canvas flow. */}
        {connections.length > 0 && (
          <details className="mt-6 border-t border-slate-100 pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-slate-600 marker:hidden">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-indigo-500" />
                Connection details
              </span>
              <span className="text-slate-400">
                {connections.length} transitions
              </span>
            </summary>
            <p className="mb-3 mt-2 text-xs text-slate-400">
              Hover any node above to highlight its transitions.
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {connections.map((conn, idx) => {
                const isEdgeActive = activeConnections.has(
                  `${conn.from}->${conn.to}`,
                );
                const fromNode = nodeLookup.get(conn.from);
                const toNode = nodeLookup.get(conn.to);

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs transition-all ${
                      isEdgeActive
                        ? "bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-500/20"
                        : "bg-slate-50/60 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span
                      className="max-w-[80px] truncate font-semibold"
                      title={fromNode?.label || conn.from}
                    >
                      {fromNode?.label || conn.from}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    <span
                      className="max-w-[80px] truncate font-semibold"
                      title={toNode?.label || conn.to}
                    >
                      {toNode?.label || conn.to}
                    </span>
                    {conn.label && (
                      <span
                        className="ml-auto max-w-[90px] truncate rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500"
                        title={conn.label}
                      >
                        {conn.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <Info className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                Node Inspector: {selectedNode.label}
              </h4>
            </div>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {selectedNode.description || "No description provided."}
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 pt-2 border-t border-indigo-100">
            <span className="font-semibold">Node ID:</span>{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
              {selectedNode.id}
            </code>
            <span className="ml-3 font-semibold">Category:</span>{" "}
            <span className="capitalize">
              {selectedNode.category || "Default"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowchartView;

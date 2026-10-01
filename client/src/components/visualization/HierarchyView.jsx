import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, FolderTree, GitBranch, Info } from "lucide-react";

/**
 * HierarchyView
 * Renders a hierarchical tree visualization clearly depicting parent-child relationships.
 * Supports tree branching, expandable nodes, depth indicators, and structured nested cards.
 */
const HierarchyView = ({ concept }) => {
  const nodes = concept?.nodes || [];
  const connections = concept?.connections || [];
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id || null);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [viewMode, setViewMode] = useState("tree"); // "tree" or "nested"

  // Build tree data structure from nodes and connections / parentId
  const { rootNodes, nodeLookup, childrenMap, parentMap } = useMemo(() => {
    const lookup = new Map();
    const children = new Map();
    const parents = new Map();

    nodes.forEach((n) => {
      lookup.set(n.id, n);
      children.set(n.id, []);
    });

    // Populate from connections
    connections.forEach((conn) => {
      if (lookup.has(conn.from) && lookup.has(conn.to)) {
        children.get(conn.from).push(conn.to);
        parents.set(conn.to, conn.from);
      }
    });

    // Also populate from parentId property if present
    nodes.forEach((n) => {
      if (n.parentId && lookup.has(n.parentId)) {
        if (!children.get(n.parentId).includes(n.id)) {
          children.get(n.parentId).push(n.id);
        }
        if (!parents.has(n.id)) {
          parents.set(n.id, n.parentId);
        }
      }
    });

    // Identify root nodes (nodes with no parent)
    const roots = nodes.filter((n) => !parents.has(n.id));

    // If no root detected (e.g. disconnected or flat), treat first node as root
    const finalRoots = roots.length > 0 ? roots : nodes.slice(0, 1);

    return {
      rootNodes: finalRoots,
      nodeLookup: lookup,
      childrenMap: children,
      parentMap: parents
    };
  }, [nodes, connections]);

  const toggleCollapse = (id) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedNode = selectedNodeId ? nodeLookup.get(selectedNodeId) : null;

  // Breadcrumb ancestry for selected node
  const breadcrumbs = useMemo(() => {
    if (!selectedNodeId) return [];
    const crumbs = [];
    let curr = selectedNodeId;
    while (curr && nodeLookup.has(curr)) {
      crumbs.unshift(nodeLookup.get(curr));
      curr = parentMap.get(curr);
    }
    return crumbs;
  }, [selectedNodeId, nodeLookup, parentMap]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (nodeId, depth = 0) => {
    const node = nodeLookup.get(nodeId);
    if (!node) return null;

    const childIds = childrenMap.get(nodeId) || [];
    const hasChildren = childIds.length > 0;
    const isCollapsed = collapsedNodes.has(nodeId);
    const isSelected = selectedNodeId === nodeId;

    // Tier badge & accent styling
    const tierColors = [
      { bg: "bg-indigo-600 text-white", border: "border-indigo-600", pill: "bg-indigo-100 text-indigo-800" },
      { bg: "bg-blue-600 text-white", border: "border-blue-500", pill: "bg-blue-100 text-blue-800" },
      { bg: "bg-emerald-600 text-white", border: "border-emerald-500", pill: "bg-emerald-100 text-emerald-800" },
      { bg: "bg-amber-600 text-white", border: "border-amber-500", pill: "bg-amber-100 text-amber-800" }
    ];
    const tier = tierColors[depth % tierColors.length];

    return (
      <div key={nodeId} className="flex flex-col items-center">
        {/* Node Box */}
        <div
          onClick={() => setSelectedNodeId(nodeId)}
          className={`relative z-10 w-64 p-4 rounded-xl border-2 transition-all cursor-pointer bg-white text-left ${
            isSelected
              ? "border-indigo-600 shadow-md ring-4 ring-indigo-500/10 scale-102"
              : "border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${tier.pill}`}>
              {depth === 0 ? "Root Level" : `Tier ${depth}`}
            </span>

            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(nodeId);
                }}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                title={isCollapsed ? "Expand Children" : "Collapse Children"}
              >
                {isCollapsed ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                    +{childIds.length} <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{node.label}</h4>
          {node.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {node.description}
            </p>
          )}

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>{hasChildren ? `${childIds.length} sub-branches` : "Leaf entity"}</span>
            <span className="font-mono text-[10px]">#{node.id}</span>
          </div>
        </div>

        {/* Connecting Lines and Children Branches */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center w-full">
            {/* Vertical stem from parent */}
            <div className="w-0.5 h-6 bg-slate-300" />

            {/* Horizontal distribution bar & children */}
            <div className="relative flex justify-center gap-6 pt-0">
              {/* Horizontal connecting bar across siblings */}
              {childIds.length > 1 && (
                <div
                  className="absolute top-0 h-0.5 bg-slate-300"
                  style={{
                    left: `${100 / (childIds.length * 2)}%`,
                    right: `${100 / (childIds.length * 2)}%`
                  }}
                />
              )}

              {childIds.map((cId) => (
                <div key={cId} className="flex flex-col items-center">
                  {/* Stem down to child */}
                  <div className="w-0.5 h-6 bg-slate-300" />
                  {renderTreeNode(cId, depth + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Indented Nested List view fallback / mobile friendly view
  const renderNestedList = (nodeId, depth = 0) => {
    const node = nodeLookup.get(nodeId);
    if (!node) return null;
    const childIds = childrenMap.get(nodeId) || [];
    const isSelected = selectedNodeId === nodeId;

    return (
      <div key={nodeId} className="space-y-2">
        <div
          onClick={() => setSelectedNodeId(nodeId)}
          style={{ marginLeft: `${depth * 24}px` }}
          className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
            isSelected
              ? "bg-indigo-50 border-indigo-600 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <GitBranch className={`w-4 h-4 ${depth === 0 ? "text-indigo-600" : "text-slate-400"}`} />
            <div>
              <h5 className="text-xs font-bold text-slate-900">{node.label}</h5>
              {node.description && (
                <p className="text-[11px] text-slate-500 line-clamp-1">{node.description}</p>
              )}
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            Depth {depth}
          </span>
        </div>

        {childIds.map((cId) => renderNestedList(cId, depth + 1))}
      </div>
    );
  };

  if (nodes.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        No hierarchy nodes to display.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hierarchy Controls & Breadcrumb Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <FolderTree className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-semibold text-slate-500">Ancestry Path:</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              {idx > 0 && <span className="text-slate-400">/</span>}
              <button
                onClick={() => setSelectedNodeId(crumb.id)}
                className={`font-semibold hover:underline ${
                  crumb.id === selectedNodeId ? "text-indigo-600" : "text-slate-700"
                }`}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "tree" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tree Layout
            </button>
            <button
              onClick={() => setViewMode("nested")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "nested" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Nested List
            </button>
          </div>
        </div>
      </div>

      {/* Main Hierarchy Tree Canvas */}
      <div className="p-6 sm:p-10 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-x-auto min-h-[420px]">
        {viewMode === "tree" ? (
          <div className="inline-block min-w-full pb-4">
            <div className="flex justify-center gap-12">
              {rootNodes.map((root) => renderTreeNode(root.id, 0))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-xl mx-auto py-4">
            {rootNodes.map((root) => renderNestedList(root.id, 0))}
          </div>
        )}
      </div>

      {/* Selected Node Details Card */}
      {selectedNode && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Info className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                Component Details: {selectedNode.label}
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">ID: {selectedNode.id}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {selectedNode.description || "Subsystem or component in the architectural hierarchy."}
          </p>
          <div className="pt-2 text-xs text-slate-500 border-t border-slate-100 flex items-center justify-between">
            <span>Parent: {parentMap.get(selectedNode.id) ? nodeLookup.get(parentMap.get(selectedNode.id))?.label : "Top-Level Root"}</span>
            <span>Direct Children: {childrenMap.get(selectedNode.id)?.length || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HierarchyView;

import React from "react";
import ReactDOMServer from "react-dom/server";
import VisualizationRenderer from "./src/components/visualization/VisualizationRenderer.jsx";
import FlowchartView from "./src/components/visualization/FlowchartView.jsx";
import CycleView from "./src/components/visualization/CycleView.jsx";
import TimelineView from "./src/components/visualization/TimelineView.jsx";
import HierarchyView from "./src/components/visualization/HierarchyView.jsx";
import SequenceView from "./src/components/visualization/SequenceView.jsx";
import { sampleConcepts } from "./src/data/sampleConcepts.js";

console.log("==================================================");
console.log("CONCEPTFLOW PHASE 2 — ENGINE VERIFICATION SUITE");
console.log("==================================================");

let passedCount = 0;
let failedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failedCount++;
  }
}

// 1. Data Contract Validation for all sample concepts
runTest("Verify all 5 sample concepts exist and conform to schema", () => {
  if (sampleConcepts.length < 5) throw new Error("Expected at least 5 sample concepts");
  const types = new Set(sampleConcepts.map(s => s.type));
  ["flowchart", "cycle", "timeline", "hierarchy", "sequence"].forEach(t => {
    if (!types.has(t)) throw new Error(`Missing sample concept for type: ${t}`);
  });
});

// 2. Test each visualization type through VisualizationRenderer
sampleConcepts.forEach((concept) => {
  runTest(`Render VisualizationRenderer with sample "${concept.title}" (${concept.type})`, () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(VisualizationRenderer, { concept })
    );
    if (!html || html.length < 50) {
      throw new Error(`Render output suspiciously short: ${html?.length} chars`);
    }
  });
});

// 3. Test direct rendering of each specialized view component
runTest("Direct render FlowchartView", () => {
  const c = sampleConcepts.find(s => s.type === "flowchart");
  const html = ReactDOMServer.renderToString(React.createElement(FlowchartView, { concept: c }));
  if (!html.includes("sunlight") && !html.includes("glucose")) throw new Error("Flowchart missing expected nodes");
});

runTest("Direct render CycleView", () => {
  const c = sampleConcepts.find(s => s.type === "cycle");
  const html = ReactDOMServer.renderToString(React.createElement(CycleView, { concept: c }));
  if (!html.includes("Evaporation") && !html.includes("Perpetual Closed Loop")) throw new Error("CycleView missing loop content");
});

runTest("Direct render TimelineView", () => {
  const c = sampleConcepts.find(s => s.type === "timeline");
  const html = ReactDOMServer.renderToString(React.createElement(TimelineView, { concept: c }));
  if (!html.includes("1789") || !html.includes("1799")) throw new Error("TimelineView missing milestone dates");
});

runTest("Direct render HierarchyView", () => {
  const c = sampleConcepts.find(s => s.type === "hierarchy");
  const html = ReactDOMServer.renderToString(React.createElement(HierarchyView, { concept: c }));
  if (!html.includes("Computer System") && !html.includes("Hardware")) throw new Error("HierarchyView missing tree nodes");
});

runTest("Direct render SequenceView", () => {
  const c = sampleConcepts.find(s => s.type === "sequence");
  const html = ReactDOMServer.renderToString(React.createElement(SequenceView, { concept: c }));
  if (!html.includes("SYN") || !html.includes("ACK")) throw new Error("SequenceView missing handshake labels");
});

// 4. Test Error Handling Requirements
runTest("Gracefully handles unsupported visualization type", () => {
  const unsupportedConcept = {
    id: "unknown-test",
    title: "Quantum Entanglement",
    type: "quantum-non-standard-3d",
    nodes: [{ id: "q1", label: "State |0>" }]
  };
  const html = ReactDOMServer.renderToString(
    React.createElement(VisualizationRenderer, { concept: unsupportedConcept })
  );
  if (!html.includes("Visualization type is not supported yet")) {
    throw new Error("Expected fallback message 'Visualization type is not supported yet'");
  }
});

runTest("Gracefully handles missing / empty nodes", () => {
  const emptyConcept = {
    id: "empty-test",
    title: "Empty Topic",
    type: "flowchart",
    nodes: []
  };
  const html = ReactDOMServer.renderToString(
    React.createElement(VisualizationRenderer, { concept: emptyConcept })
  );
  if (!html.includes("Missing or Empty Nodes")) {
    throw new Error("Expected fallback warning 'Missing or Empty Nodes'");
  }
});

runTest("Gracefully handles missing connections", () => {
  const noConnConcept = {
    id: "no-conn-test",
    title: "Isolated Nodes Flowchart",
    type: "flowchart",
    nodes: [
      { id: "a", label: "Isolated A" },
      { id: "b", label: "Isolated B" }
    ],
    connections: null // null connections
  };
  const html = ReactDOMServer.renderToString(
    React.createElement(VisualizationRenderer, { concept: noConnConcept })
  );
  if (!html.includes("Isolated A") || !html.includes("Isolated B")) {
    throw new Error("Expected isolated nodes to render cleanly without crashing");
  }
});

runTest("Gracefully handles null concept", () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(VisualizationRenderer, { concept: null })
  );
  if (!html.includes("No Concept Data Provided")) {
    throw new Error("Expected fallback for null concept");
  }
});

runTest("Gracefully handles non-object malformed concept", () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(VisualizationRenderer, { concept: "malformed-string" })
  );
  if (!html.includes("No Concept Data Provided")) {
    throw new Error("Expected fallback for non-object concept");
  }
});

console.log("==================================================");
console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("ALL VISUALIZATION ENGINE TESTS PASSED PERFECTLY!");
  process.exit(0);
}

/**
 * ConceptFlow Phase 3 — Backend Test Suite
 * Tests: schema validation, semantic validation, and HTTP API endpoints.
 *
 * Run with: node tests/concept.test.js
 * No external test runner required — uses Node.js built-in assert module.
 */

import assert from "assert";
import { validateConcept, validateSemantics, prepareConcept } from "../src/services/conceptService.js";
import {
  FIXTURE_FLOWCHART,
  FIXTURE_CYCLE,
  FIXTURE_TIMELINE,
  FIXTURE_HIERARCHY,
  FIXTURE_SEQUENCE
} from "../src/fixtures/concept.fixtures.js";

// ─── Minimal HTTP helper (no external library needed) ───────────────────────

import http from "http";

function postJSON(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: "localhost",
      port: 5000,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    };
    const req = http.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ─── Test Runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     → ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     → ${err.message}`);
    failed++;
  }
}

// ─── Section 1: Schema Validation Tests ──────────────────────────────────────

console.log("\n══════════════════════════════════════════════════════");
console.log("  CONCEPTFLOW PHASE 3 — BACKEND TEST SUITE");
console.log("══════════════════════════════════════════════════════");
console.log("\n§1  Schema Validation (validateConcept)");

test("Valid flowchart passes schema validation", () => {
  const r = validateConcept(FIXTURE_FLOWCHART);
  assert.strictEqual(r.valid, true, `Expected valid=true, got: ${JSON.stringify(r.errors)}`);
  assert.ok(r.concept, "Expected concept in result");
});

test("Valid cycle passes schema validation", () => {
  const r = validateConcept(FIXTURE_CYCLE);
  assert.strictEqual(r.valid, true, `Expected valid=true, got: ${JSON.stringify(r.errors)}`);
});

test("Valid timeline passes schema validation", () => {
  const r = validateConcept(FIXTURE_TIMELINE);
  assert.strictEqual(r.valid, true, `Expected valid=true, got: ${JSON.stringify(r.errors)}`);
});

test("Valid hierarchy passes schema validation", () => {
  const r = validateConcept(FIXTURE_HIERARCHY);
  assert.strictEqual(r.valid, true, `Expected valid=true, got: ${JSON.stringify(r.errors)}`);
});

test("Valid sequence passes schema validation", () => {
  const r = validateConcept(FIXTURE_SEQUENCE);
  assert.strictEqual(r.valid, true, `Expected valid=true, got: ${JSON.stringify(r.errors)}`);
});

test("Empty title is rejected", () => {
  const r = validateConcept({ ...FIXTURE_FLOWCHART, title: "   " });
  assert.strictEqual(r.valid, false, "Expected valid=false for empty title");
  assert.ok(r.errors.some(e => e.path.includes("title")), "Expected error path to mention 'title'");
});

test("Empty id is rejected", () => {
  const r = validateConcept({ ...FIXTURE_FLOWCHART, id: "" });
  assert.strictEqual(r.valid, false, "Expected valid=false for empty id");
  assert.ok(r.errors.some(e => e.path.includes("id")), "Expected error on 'id'");
});

test("Unsupported visualization type is rejected", () => {
  const r = validateConcept({ ...FIXTURE_FLOWCHART, type: "quantum-lattice" });
  assert.strictEqual(r.valid, false, "Expected valid=false for unsupported type");
  assert.ok(r.errors.some(e => e.path.includes("type")), "Expected error on 'type'");
});

test("Duplicate node IDs are rejected", () => {
  const r = validateConcept({
    ...FIXTURE_FLOWCHART,
    nodes: [
      { id: "dup", label: "Node A" },
      { id: "dup", label: "Node B" }
    ],
    connections: []
  });
  assert.strictEqual(r.valid, false, "Expected valid=false for duplicate node IDs");
  assert.ok(
    r.errors.some(e => e.message.toLowerCase().includes("duplicate")),
    "Expected 'duplicate' in error message"
  );
});

test("Connection referencing non-existent 'from' node is rejected", () => {
  const r = validateConcept({
    ...FIXTURE_FLOWCHART,
    connections: [{ from: "GHOST_NODE", to: "sunlight" }]
  });
  assert.strictEqual(r.valid, false, "Expected valid=false for bad 'from' reference");
  assert.ok(r.errors.some(e => e.message.includes("GHOST_NODE")), "Expected error mentioning GHOST_NODE");
});

test("Connection referencing non-existent 'to' node is rejected", () => {
  const r = validateConcept({
    ...FIXTURE_FLOWCHART,
    connections: [{ from: "sunlight", to: "NOWHERE" }]
  });
  assert.strictEqual(r.valid, false, "Expected valid=false for bad 'to' reference");
  assert.ok(r.errors.some(e => e.message.includes("NOWHERE")), "Expected error mentioning NOWHERE");
});

test("Empty nodes array is rejected", () => {
  const r = validateConcept({ ...FIXTURE_FLOWCHART, nodes: [] });
  assert.strictEqual(r.valid, false, "Expected valid=false for empty nodes");
  assert.ok(r.errors.some(e => e.path.includes("nodes")), "Expected error on 'nodes'");
});

test("Malformed concept (string instead of object) is rejected", () => {
  const r = validateConcept("not-an-object");
  assert.strictEqual(r.valid, false, "Expected valid=false for non-object concept");
});

test("Malformed concept (null) is rejected", () => {
  const r = validateConcept(null);
  assert.strictEqual(r.valid, false, "Expected valid=false for null concept");
});

test("Node with empty label is rejected", () => {
  const r = validateConcept({
    ...FIXTURE_FLOWCHART,
    nodes: [
      { id: "n1", label: "" },
      { id: "n2", label: "Valid" }
    ],
    connections: []
  });
  assert.strictEqual(r.valid, false, "Expected valid=false for empty node label");
  assert.ok(r.errors.some(e => e.path.includes("label")), "Expected error on 'label'");
});

test("Nodes with non-array value are rejected", () => {
  const r = validateConcept({ ...FIXTURE_FLOWCHART, nodes: "not-an-array" });
  assert.strictEqual(r.valid, false, "Expected valid=false for nodes as string");
});

test("Duplicate connections are rejected", () => {
  const r = validateConcept({
    ...FIXTURE_FLOWCHART,
    connections: [
      { from: "sunlight", to: "glucose", label: "same" },
      { from: "sunlight", to: "glucose", label: "same" }
    ]
  });
  assert.strictEqual(r.valid, false, "Expected valid=false for duplicate connections");
  assert.ok(r.errors.some(e => e.message.toLowerCase().includes("duplicate")), "Expected 'duplicate' in error");
});

// ─── Section 2: Semantic Validation Tests ────────────────────────────────────

console.log("\n§2  Semantic Validation (validateSemantics)");

test("Flowchart with < 2 nodes fails semantic validation", () => {
  // First validate schema (just 1 node with no connections)
  const concept = {
    ...FIXTURE_FLOWCHART,
    nodes: [{ id: "only", label: "Lonely Node" }],
    connections: []
  };
  const s = validateSemantics(concept);
  assert.strictEqual(s.valid, false, "Expected semantic invalid for 1-node flowchart");
  assert.ok(s.errors.some(e => e.path === "nodes"), "Expected semantic error on 'nodes'");
});

test("Cycle with < 3 nodes fails semantic validation", () => {
  const concept = {
    ...FIXTURE_CYCLE,
    nodes: [
      { id: "a", label: "A" },
      { id: "b", label: "B" }
    ],
    connections: [{ from: "a", to: "b" }]
  };
  const s = validateSemantics(concept);
  assert.strictEqual(s.valid, false, "Expected semantic invalid for 2-node cycle");
});

test("Timeline without date/era markers fails semantic validation", () => {
  const concept = {
    ...FIXTURE_TIMELINE,
    nodes: [
      { id: "ev1", label: "Event One" },
      { id: "ev2", label: "Event Two" }
    ]
  };
  const s = validateSemantics(concept);
  assert.strictEqual(s.valid, false, "Expected semantic invalid for timeline without date markers");
});

test("Hierarchy with single node fails semantic validation", () => {
  const s = validateSemantics({
    ...FIXTURE_HIERARCHY,
    nodes: [{ id: "root", label: "Root Only" }],
    connections: []
  });
  assert.strictEqual(s.valid, false, "Expected semantic invalid for 1-node hierarchy");
});

test("Sequence with < 2 participants fails semantic validation", () => {
  const s = validateSemantics({
    ...FIXTURE_SEQUENCE,
    participants: [{ id: "solo", label: "Lone Actor", role: "sender" }],
    nodes: [{ id: "solo", label: "Lone Actor" }],
    connections: [{ from: "solo", to: "solo", label: "Self-loop" }]
  });
  assert.strictEqual(s.valid, false, "Expected semantic invalid for 1-participant sequence");
});

test("Valid flowchart passes semantic validation", () => {
  const s = validateSemantics(FIXTURE_FLOWCHART);
  assert.strictEqual(s.valid, true, `Expected semantic valid for flowchart, got: ${JSON.stringify(s.errors)}`);
});

test("Valid cycle passes semantic validation", () => {
  const s = validateSemantics(FIXTURE_CYCLE);
  assert.strictEqual(s.valid, true, `Expected semantic valid for cycle, got: ${JSON.stringify(s.errors)}`);
});

test("Valid timeline passes semantic validation", () => {
  const s = validateSemantics(FIXTURE_TIMELINE);
  assert.strictEqual(s.valid, true, `Expected semantic valid for timeline, got: ${JSON.stringify(s.errors)}`);
});

test("Valid hierarchy passes semantic validation", () => {
  const s = validateSemantics(FIXTURE_HIERARCHY);
  assert.strictEqual(s.valid, true, `Expected semantic valid for hierarchy, got: ${JSON.stringify(s.errors)}`);
});

test("Valid sequence passes semantic validation", () => {
  const s = validateSemantics(FIXTURE_SEQUENCE);
  assert.strictEqual(s.valid, true, `Expected semantic valid for sequence, got: ${JSON.stringify(s.errors)}`);
});

// ─── Section 3: prepareConcept Pipeline Tests ────────────────────────────────

console.log("\n§3  Full Pipeline (prepareConcept)");

test("prepareConcept returns prepared concept for valid flowchart", () => {
  const r = prepareConcept(FIXTURE_FLOWCHART);
  assert.strictEqual(r.valid, true, `Expected valid=true, got: ${JSON.stringify(r.errors)}`);
  assert.ok(r.concept.id, "Expected concept.id in result");
  assert.strictEqual(r.concept.type, "flowchart");
});

test("prepareConcept strips extra whitespace from title", () => {
  const r = prepareConcept({ ...FIXTURE_FLOWCHART, title: "  Photosynthesis  " });
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.concept.title, "Photosynthesis");
});

test("prepareConcept rejects schema + semantic failures together", () => {
  const r = prepareConcept({ ...FIXTURE_FLOWCHART, title: "" });
  assert.strictEqual(r.valid, false);
  assert.ok(Array.isArray(r.errors) && r.errors.length > 0, "Expected errors array");
});

// ─── Section 4: HTTP Endpoint Tests ──────────────────────────────────────────

console.log("\n§4  HTTP Endpoints (requires server on port 5000)");

const SERVER_AVAILABLE = await (async () => {
  try {
    await postJSON("/api/health", {});
    return true;
  } catch {
    return false;
  }
})().catch(() => false);

if (!SERVER_AVAILABLE) {
  console.log("  ⚠  Server not running on port 5000 — skipping HTTP endpoint tests.");
  console.log("     Start server with 'npm run server' then re-run tests.");
} else {
  await asyncTest("POST /api/concepts/validate — valid concept returns HTTP 200 + valid=true", async () => {
    const { status, body } = await postJSON("/api/concepts/validate", { concept: FIXTURE_FLOWCHART });
    assert.strictEqual(status, 200, `Expected 200, got ${status}`);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.valid, true);
    assert.ok(body.concept, "Expected concept in response");
  });

  await asyncTest("POST /api/concepts/validate — invalid concept returns HTTP 400 + valid=false", async () => {
    const { status, body } = await postJSON("/api/concepts/validate", { concept: { id: "", title: "", type: "bad-type", nodes: [], connections: [] } });
    assert.strictEqual(status, 400, `Expected 400, got ${status}`);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.valid, false);
    assert.ok(Array.isArray(body.errors), "Expected errors array in response");
  });

  await asyncTest("POST /api/concepts/validate — empty title returns HTTP 400", async () => {
    const { status, body } = await postJSON("/api/concepts/validate", { concept: { ...FIXTURE_CYCLE, title: "" } });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.valid, false);
  });

  await asyncTest("POST /api/concepts/validate — duplicate node IDs return HTTP 400", async () => {
    const { status, body } = await postJSON("/api/concepts/validate", {
      concept: {
        ...FIXTURE_FLOWCHART,
        nodes: [{ id: "dup", label: "A" }, { id: "dup", label: "B" }],
        connections: []
      }
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.valid, false);
  });

  await asyncTest("POST /api/concepts/validate — non-existent node reference returns HTTP 400", async () => {
    const { status, body } = await postJSON("/api/concepts/validate", {
      concept: {
        ...FIXTURE_FLOWCHART,
        connections: [{ from: "ghost", to: "sunlight" }]
      }
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.valid, false);
  });

  await asyncTest("POST /api/concepts/validate — null concept body returns HTTP 400", async () => {
    const { status, body } = await postJSON("/api/concepts/validate", { concept: null });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.success, false);
  });

  await asyncTest("POST /api/concepts/validate — semantic failure (1-node cycle) returns HTTP 400", async () => {
    const { status, body } = await postJSON("/api/concepts/validate", {
      concept: {
        id: "bad-cycle",
        title: "Bad Cycle",
        type: "cycle",
        summary: "This cycle has only one node.",
        nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
        connections: [{ from: "a", to: "b" }]
      }
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.valid, false);
    assert.ok(body.errors.some(e => e.path === "nodes"), "Expected error on nodes for semantic failure");
  });

  await asyncTest("POST /api/concepts/preview — valid concept returns HTTP 200 + source='sample'", async () => {
    const { status, body } = await postJSON("/api/concepts/preview", { concept: FIXTURE_TIMELINE });
    assert.strictEqual(status, 200, `Expected 200, got ${status}`);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.source, "sample");
    assert.ok(body.concept, "Expected concept in preview response");
  });

  await asyncTest("POST /api/concepts/preview — invalid concept returns HTTP 400", async () => {
    const { status, body } = await postJSON("/api/concepts/preview", { concept: { title: "missing id and type" } });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.success, false);
  });

  await asyncTest("GET /api/health — returns HTTP 200 and HEALTHY status", async () => {
    const { status, body } = await new Promise((resolve, reject) => {
      http.get("http://localhost:5000/api/health", (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
      }).on("error", reject);
    });
    assert.strictEqual(status, 200, `Expected 200, got ${status}`);
    assert.strictEqual(body.status, "HEALTHY");
  });
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("\n══════════════════════════════════════════════════════");
console.log(`  RESULTS: ${passed + failed} tests | ✓ ${passed} passed | ✗ ${failed} failed`);
console.log("══════════════════════════════════════════════════════\n");

if (failed > 0) {
  process.exit(1);
}

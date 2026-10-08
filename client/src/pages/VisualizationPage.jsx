import React, { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  GitFork,
  RotateCw,
  History,
  Network,
  ArrowLeftRight,
  HelpCircle,
  RefreshCw,
  Layers,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Expand,
  Shrink,
} from "lucide-react";
import VisualizationRenderer from "../components/visualization/VisualizationRenderer";
import LearningPanel from "../components/learning/LearningPanel";
import { sampleConcepts, getSampleConceptById } from "../data/sampleConcepts";
import { getGenerationSourceMessage } from "../services/conceptService";
import { useAuth } from "../context/AuthContext";
import {
  recordConceptAccess,
  saveQuizResult,
} from "../services/learningHistoryService";
import { createUserLearningActivity } from "../services/userLearningService";

const VisualizationPage = () => {
  const location = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Concept state: prioritized from navigation state -> URL param -> default sample
  const [currentConcept, setCurrentConcept] = useState(() => {
    if (location.state?.concept) {
      return location.state.concept;
    }
    if (id) {
      const found = getSampleConceptById(id);
      if (found) return found;
    }
    return sampleConcepts[0];
  });
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [learningLevel, setLearningLevel] = useState("Intermediate");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [historyNotice, setHistoryNotice] = useState("");
  const visualizationSectionRef = useRef(null);
  const recordedVisitsRef = useRef(new Set());

  // Keep state updated if URL param changes
  useEffect(() => {
    if (location.state?.concept) {
      setCurrentConcept(location.state.concept);
    } else if (id) {
      const found = getSampleConceptById(id);
      if (found) setCurrentConcept(found);
    }
  }, [id, location.state]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(
        document.fullscreenElement === visualizationSectionRef.current,
      );
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    const levels = ["Beginner", "Intermediate", "Advanced"];
    setLearningLevel(
      levels.includes(currentConcept?.difficulty)
        ? currentConcept.difficulty
        : "Intermediate",
    );
  }, [currentConcept?.id, currentConcept?.difficulty]);

  useEffect(() => {
    if (authLoading || !currentConcept) return;
    const visitKey = `${user?.id || "guest"}:${location.key}:${currentConcept.id}:${learningLevel}`;
    if (recordedVisitsRef.current.has(visitKey)) return;
    recordedVisitsRef.current.add(visitKey);

    const activity = {
      concept: currentConcept,
      explanationLevel: learningLevel,
      source: location.state?.source || "sample",
      completed: false,
    };
    if (isAuthenticated) {
      createUserLearningActivity(activity)
        .then((result) => {
          if (!result.success) throw new Error("history unavailable");
          setHistoryNotice("");
        })
        .catch(() =>
          setHistoryNotice(
            "Your account history is temporarily unavailable. This visit was not saved.",
          ),
        );
    } else {
      recordConceptAccess({
        concept: currentConcept,
        level: learningLevel,
        source: location.state?.source,
      });
    }
  }, [
    authLoading,
    currentConcept,
    isAuthenticated,
    learningLevel,
    location.key,
    location.state?.source,
    user?.id,
  ]);

  const handleSelectConcept = (conceptItem) => {
    setCurrentConcept(conceptItem);
    setIsAdvancedOpen(false);
    navigate(`/visualize/${conceptItem.id}`, {
      state: { concept: conceptItem },
    });
  };

  // Type metadata
  const getTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case "flowchart":
        return {
          label: "Flowchart Engine",
          icon: GitFork,
          color: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "cycle":
        return {
          label: "Cycle Engine",
          icon: RotateCw,
          color: "bg-cyan-50 text-cyan-700 border-cyan-200",
        };
      case "timeline":
        return {
          label: "Timeline Engine",
          icon: History,
          color: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "hierarchy":
        return {
          label: "Hierarchy Engine",
          icon: Network,
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "sequence":
        return {
          label: "Sequence Engine",
          icon: ArrowLeftRight,
          color: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };
      default:
        return {
          label: type || "Unknown Engine",
          icon: HelpCircle,
          color: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  const typeMeta = getTypeBadge(currentConcept?.type);
  const TypeIcon = typeMeta.icon;

  const adjustZoom = (amount) => {
    setZoom((currentZoom) => Math.min(150, Math.max(60, currentZoom + amount)));
  };

  const toggleFullscreen = () => {
    const section = visualizationSectionRef.current;
    if (!section) return;

    if (document.fullscreenElement) {
      document.exitFullscreen()?.catch(() => {});
    } else {
      section.requestFullscreen?.().catch(() => {});
    }
  };

  const selectLearningLevel = (level) => {
    setLearningLevel(level);
    setIsAdvancedOpen(level === "Advanced");
  };

  const handleQuizResult = async (result) => {
    if (isAuthenticated) {
      if (result.historySaved) {
        setHistoryNotice("");
        return;
      }
      if (result.historySaved === false) {
        setHistoryNotice(
          "Quiz completed, but it could not be saved to your account history.",
        );
        return;
      }
      try {
        const saved = await createUserLearningActivity({
          concept: currentConcept,
          explanationLevel: learningLevel,
          source: location.state?.source || "sample",
          completed: true,
          quizScore: result.score,
          quizTotal: result.total,
          quizPercentage: result.percentage,
        });
        if (!saved.success) throw new Error("history unavailable");
        setHistoryNotice("");
      } catch {
        setHistoryNotice(
          "Quiz completed, but it could not be saved to your account history.",
        );
      }
      return;
    }
    saveQuizResult({ conceptId: currentConcept.id, ...result });
  };

  const handleQuizConceptRestore = (restoredConcept) => {
    if (restoredConcept?.id && (!id || restoredConcept.id === id)) {
      setCurrentConcept(restoredConcept);
    }
  };

  // Test edge cases handlers
  const handleTestUnknownType = () => {
    setCurrentConcept({
      id: "test-unsupported",
      title: "Experimental 3D Quantum Lattice",
      type: "quantum-lattice-3d",
      summary:
        "Simulating high-dimensional quantum states in a non-standard topological manifold.",
      nodes: [{ id: "n1", label: "State |0>" }],
    });
  };

  const handleTestEmptyNodes = () => {
    setCurrentConcept({
      id: "test-empty",
      title: "Empty Topic Without Extracted Entities",
      type: "flowchart",
      summary:
        "This concept has no nodes to test the error boundary and graceful warning.",
      nodes: [],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/create"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Create Page</span>
          </Link>
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-700">
            Visualization Engine
          </span>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 shrink-0">
            Switch Engine:
          </span>
          {sampleConcepts.slice(0, 5).map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectConcept(sample)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                currentConcept?.id === sample.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Concept Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Visualization Type Indicator */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${typeMeta.color}`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              <span>{typeMeta.label}</span>
            </div>

            {currentConcept?.subject && (
              <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                {currentConcept.subject}
              </span>
            )}
            {getGenerationSourceMessage(location.state?.source) && (
              <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                {getGenerationSourceMessage(location.state.source)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectConcept(sampleConcepts[0])}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 px-2.5 py-1 rounded-md hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Concept</span>
            </button>
          </div>
        </div>

        {/* Title & Summary */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {currentConcept?.title || "Concept Visualization"}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-4xl leading-relaxed">
            {currentConcept?.summary ||
              "No conceptual summary available for this topic."}
          </p>
        </div>
      </div>

      {/* Main Visualization Rendering Area */}
      <section
        ref={visualizationSectionRef}
        className={`space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 ${isFullscreen ? "h-screen overflow-auto" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Visualization</h2>
          </div>
          <div
            className="flex flex-wrap items-center gap-1.5"
            aria-label="Visualization controls"
          >
            <button
              type="button"
              onClick={() => adjustZoom(-10)}
              disabled={zoom <= 60}
              aria-label="Zoom out"
              title="Zoom out"
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-xs font-medium tabular-nums text-slate-600">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => adjustZoom(10)}
              disabled={zoom >= 150}
              aria-label="Zoom in"
              title="Zoom in"
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
            >
              {isFullscreen ? (
                <Shrink className="h-4 w-4" />
              ) : (
                <Expand className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-auto rounded-lg bg-slate-50 p-2 sm:p-4">
          <div style={{ zoom: `${zoom}%` }}>
            <VisualizationRenderer concept={currentConcept} />
          </div>
        </div>
      </section>

      {historyNotice && (
        <p
          role="status"
          className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {historyNotice}
        </p>
      )}

      <LearningPanel
        concept={currentConcept}
        learningLevel={learningLevel}
        onLearningLevelChange={selectLearningLevel}
        onQuizResult={handleQuizResult}
        onQuizConceptRestore={handleQuizConceptRestore}
        resumeScopeId={id || currentConcept?.id}
      />

      <details
        open={isAdvancedOpen}
        onToggle={(event) => setIsAdvancedOpen(event.currentTarget.open)}
        className="rounded-lg border border-slate-200 bg-white px-4"
      >
        <summary className="cursor-pointer py-3 text-sm font-semibold text-slate-700">
          Advanced Details
        </summary>
        <div className="space-y-4 border-t border-slate-100 py-4">
          {currentConcept?.nodes?.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Structured Entities ({currentConcept.nodes.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {currentConcept.nodes.map((node) => (
                  <span
                    key={node.id}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {node.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <details className="rounded-lg border border-slate-200 px-3">
            <summary className="cursor-pointer py-2 text-xs font-semibold text-slate-600">
              Visualization verification tools
            </summary>
            <section className="space-y-3 border-t border-slate-100 py-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Test renderer error handling</span>
              </div>
              <p className="text-xs text-slate-500">
                Confirm unsupported types and empty node sets are handled
                without crashing React.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleTestUnknownType}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Test Unsupported Type
                </button>
                <button
                  onClick={handleTestEmptyNodes}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Test Empty Nodes
                </button>
                <button
                  onClick={() => handleSelectConcept(sampleConcepts[0])}
                  className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Restore Photosynthesis
                </button>
              </div>
            </section>
          </details>
        </div>
      </details>
      </div>
  );
};

export default VisualizationPage;

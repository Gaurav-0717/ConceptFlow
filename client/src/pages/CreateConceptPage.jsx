import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  GitFork,
  RotateCw,
  History,
  Network,
  ArrowLeftRight,
  LoaderCircle,
  Lightbulb,
  BookOpen,
  Compass,
  Zap,
} from "lucide-react";
import { sampleConcepts } from "../data/sampleConcepts";
import {
  generateConcept as generateConceptRequest,
  getGenerationSourceMessage,
} from "../services/conceptService";

const SUBJECTS = [
  "Biology",
  "Computer Science",
  "Physics",
  "World History",
  "Mathematics",
  "Networking",
  "Economics",
  "General",
];

const LEVELS = [
  { id: "Beginner", label: "Beginner", desc: "Core concepts & simple analogies" },
  { id: "Intermediate", label: "Intermediate", desc: "Structured flow & mechanics" },
  { id: "Advanced", label: "Advanced", desc: "Deep technical relationships" },
];

export const CreateConceptPage = () => {
  const navigate = useNavigate();

  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    subject: "Biology",
    targetLevel: "Intermediate",
    content: "",
  });

  const [submittedConcept, setSubmittedConcept] = useState(null);
  const [submittedSource, setSubmittedSource] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleSelectSample = (sample) => {
    setSelectedSampleId(sample.id);
    setFormData({
      title: sample.title,
      subject: sample.subject || "Biology",
      targetLevel: sample.difficulty || "Intermediate",
      content: sample.summary,
    });
    setSubmittedConcept(null);
    setSubmittedSource(null);
    if (error) setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = [formData.title.trim(), formData.content.trim()]
      .filter(Boolean)
      .join("\n\n");
    if (!input) {
      setError("Please enter a concept, question, or topic to understand.");
      return;
    }
    if (input.length > 2000) {
      setError("Keep the concept or question under 2,000 characters.");
      return;
    }

    setIsGenerating(true);
    setSubmittedConcept(null);
    setSubmittedSource(null);
    setError("");
    try {
      const result = await generateConceptRequest({
        input,
        subject: formData.subject,
        difficulty: formData.targetLevel,
      });
      if (!result.success || !result.concept) {
        setError(
          result.message ||
            "The concept could not be generated. Please try again.",
        );
        return;
      }
      setSubmittedConcept(result.concept);
      setSubmittedSource(result.source);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNavigateToVisualization = (conceptData) => {
    const target =
      conceptData ||
      sampleConcepts.find((s) => s.id === selectedSampleId) ||
      sampleConcepts[0];
    const source =
      target.id === submittedConcept?.id ? submittedSource : undefined;
    navigate(`/visualize/${target.id}`, {
      state: { concept: target, ...(source ? { source } : {}) },
    });
  };

  const handleReset = () => {
    setSubmittedConcept(null);
    setSubmittedSource(null);
    setSelectedSampleId("");
    setFormData({
      title: "",
      subject: "Biology",
      targetLevel: "Intermediate",
      content: "",
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 px-3.5 py-1 text-xs font-bold text-purple-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            <span>AI Knowledge Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-display">
            Learn Something New
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
            Enter any topic or question. ConceptFlow structures it into an interactive cognitive map, detailed explanation, and comprehension quiz.
          </p>
        </div>

        {/* Quick Pick Samples */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card-soft space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span>Or Choose a Curated Topic</span>
            </span>
            <span className="text-[11px] text-slate-400">Click to load instantly</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {sampleConcepts.slice(0, 5).map((sample) => {
              const isSelected = selectedSampleId === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 truncate">{sample.title}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{sample.type}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Generator Form */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-card-soft space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Concept Title / Prompt */}
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-bold text-slate-900 font-display">
                What do you want to understand?
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Explain Photosynthesis, How the TCP Handshake works, Black Holes..."
                className="w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                disabled={isGenerating}
              />
            </div>

            {/* Additional details / Notes */}
            <div className="space-y-2">
              <label htmlFor="content" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Additional Notes or Specific Focus (Optional)
              </label>
              <textarea
                id="content"
                name="content"
                rows={3}
                value={formData.content}
                onChange={handleChange}
                placeholder="Add any specific aspects you want emphasized, or paste lecture notes/paragraphs..."
                className="w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                disabled={isGenerating}
              />
            </div>

            {/* Subject Selector & Difficulty Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Subject Selector */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Academic Subject
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, subject: sub }))}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        formData.subject === sub
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Level Cards */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Target Depth
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, targetLevel: lvl.id }))}
                      className={`rounded-xl p-2.5 text-center border transition-all ${
                        formData.targetLevel === lvl.id
                          ? "border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-sm ring-2 ring-indigo-500/20 font-bold"
                          : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="text-xs font-bold">{lvl.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
                role="alert"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-blue-500 hover:shadow-indigo-600/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:hover:scale-100 font-display"
              >
                {isGenerating ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    <span>Synthesizing Concept Architecture…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>Generate Learning Experience ✨</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* AI Generating Loading State */}
          {isGenerating && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-white p-6 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-200 animate-spin flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-indigo-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-950 font-display">
                    AI Knowledge Pipeline Active
                  </p>
                  <p className="text-xs text-indigo-700">
                    Validating educational hierarchy, cognitive steps, and quiz metadata…
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-3/4 rounded-full bg-indigo-200" />
                <div className="h-3 w-1/2 rounded-full bg-purple-200" />
              </div>
            </div>
          )}

          {/* Success Result Showcase */}
          {submittedConcept && !isGenerating && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-6 space-y-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/25">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      Concept Successfully Synthesized
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 font-display">
                      {submittedConcept.title}
                    </h3>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 capitalize">
                  {submittedConcept.type} Engine
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {submittedConcept.summary}
              </p>

              {submittedSource && (
                <p className="text-xs text-slate-500">
                  {getGenerationSourceMessage(submittedSource)}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleNavigateToVisualization(submittedConcept)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-all"
                >
                  <span>Open Interactive Engine</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Create Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default CreateConceptPage;

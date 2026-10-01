import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Layers,
  GitFork,
  RotateCw,
  History,
  Network,
  ArrowLeftRight,
  LoaderCircle,
} from "lucide-react";
import { sampleConcepts } from "../data/sampleConcepts";
import {
  generateConcept as generateConceptRequest,
  getGenerationSourceMessage,
} from "../services/conceptService";

const CreateConceptPage = () => {
  const navigate = useNavigate();

  const [selectedSampleId, setSelectedSampleId] = useState("photosynthesis");
  const [formData, setFormData] = useState({
    title: sampleConcepts[0].title,
    subject: sampleConcepts[0].subject || "Biology",
    targetLevel: sampleConcepts[0].difficulty || "Intermediate",
    content: sampleConcepts[0].summary,
  });

  const [submittedConcept, setSubmittedConcept] = useState(null);
  const [submittedSource, setSubmittedSource] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const subjects = [
    "Science",
    "Computer Science",
    "Biology",
    "World History",
    "Networking",
    "Mathematics",
    "Economics",
    "Other",
  ];
  const levels = ["Beginner", "Intermediate", "Advanced"];

  // When a sample concept pill is clicked, populate the form
  const handleSelectSample = (sample) => {
    setSelectedSampleId(sample.id);
    setFormData({
      title: sample.title,
      subject: sample.subject || "General",
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
      setError("Please enter a concept or question to visualize.");
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
    setSelectedSampleId(sampleConcepts[0].id);
    setFormData({
      title: sampleConcepts[0].title,
      subject: sampleConcepts[0].subject || "Biology",
      targetLevel: sampleConcepts[0].difficulty || "Intermediate",
      content: sampleConcepts[0].summary,
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "flowchart":
        return GitFork;
      case "cycle":
        return RotateCw;
      case "timeline":
        return History;
      case "hierarchy":
        return Network;
      case "sequence":
        return ArrowLeftRight;
      default:
        return Layers;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb / Back Link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>

      {/* Page Title */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>AI-Powered Concept Generation</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">
          Create & Visualize Concept
        </h1>
        <p className="text-slate-600 text-sm">
          Describe a concept or question and ConceptFlow will build a validated
          educational visualization.
        </p>
      </div>

      {/* Sample Concepts Quick Selection Strip */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Select Sample Concept For Engine Testing</span>
          </span>
          <span className="text-[11px] text-slate-400">Click to autofill</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {sampleConcepts.slice(0, 5).map((sample) => {
            const Icon = getTypeIcon(sample.type);
            const isSelected = selectedSampleId === sample.id;

            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-2.5 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {sample.title}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium capitalize mt-0.5">
                    {sample.type} Engine
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => handleNavigateToVisualization()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <span>Launch Visualization Directly</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {submittedConcept ? (
        /* Submission Success / Preview State */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">
                Concept Ready for Visual Engine!
              </span>
              <p className="text-xs text-emerald-700 mt-0.5">
                {getGenerationSourceMessage(submittedSource)} with{" "}
                {submittedConcept.nodes?.length || 0} nodes.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Title
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {submittedConcept.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold capitalize">
                  {submittedConcept.type} Engine
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                  {submittedConcept.difficulty || submittedConcept.targetLevel}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Concept Summary
              </span>
              <div className="mt-1 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
                {submittedConcept.summary || submittedConcept.content}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Reset Form
            </button>
            <button
              onClick={() => handleNavigateToVisualization(submittedConcept)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Visualization</span>
            </button>
          </div>
        </div>
      ) : (
        /* Form State */
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs"
        >
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-slate-800"
            >
              Concept Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Photosynthesis"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Subject & Difficulty Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="subject"
                className="block text-sm font-semibold text-slate-800"
              >
                Subject Domain
              </label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 bg-white"
              >
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="targetLevel"
                className="block text-sm font-semibold text-slate-800"
              >
                Target Difficulty
              </label>
              <select
                id="targetLevel"
                name="targetLevel"
                value={formData.targetLevel}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 bg-white"
              >
                {levels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Concept Description / Text */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label
                htmlFor="content"
                className="block text-sm font-semibold text-slate-800"
              >
                Concept Summary / Description
              </label>
              <span className="text-xs text-slate-400 font-mono">
                {formData.content.length} characters
              </span>
            </div>
            <textarea
              id="content"
              name="content"
              rows={5}
              value={formData.content}
              onChange={handleChange}
              maxLength={2000}
              placeholder="Paste or write explanation..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder-slate-400 leading-relaxed"
            />
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Input is limited to 2,000 characters</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-xs"
              >
                {isGenerating ? (
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>
                  {isGenerating ? "Generating..." : "Generate Visualization"}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateConceptPage;

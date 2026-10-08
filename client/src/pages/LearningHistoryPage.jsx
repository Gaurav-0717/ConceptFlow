import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  LoaderCircle,
  Trash2,
  Clock3,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  RotateCw,
  AlertCircle,
  Award,
  Layers,
} from "lucide-react";
import useUserLearningHistory from "../hooks/useUserLearningHistory";
import { deleteUserLearningActivity } from "../services/userLearningService";

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const LearningHistoryPage = () => {
  const { history, setHistory, loading, error, refresh } =
    useUserLearningHistory();
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const removeActivity = async (id) => {
    setDeletingId(id);
    setDeleteError("");
    try {
      const response = await deleteUserLearningActivity(id);
      if (!response.success) throw new Error("delete failed");
      setHistory((items) => items.filter((item) => item.id !== id));
    } catch {
      setDeleteError("This activity could not be removed. Please try again.");
    } finally {
      setDeletingId("");
    }
  };

  const filteredHistory = useMemo(() => {
    return (history || []).filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.concept?.subject && item.concept.subject.toLowerCase().includes(searchQuery.toLowerCase()));

      const type = item.visualizationType || item.type;
      const matchesType = filterType === "all" || type === filterType;

      return matchesSearch && matchesType;
    });
  }, [history, searchQuery, filterType]);

  const uniqueTypes = useMemo(() => {
    const types = new Set();
    (history || []).forEach((item) => {
      const t = item.visualizationType || item.type;
      if (t) types.add(t);
    });
    return Array.from(types);
  }, [history]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100/80 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Clock3 className="h-3.5 w-3.5" />
              <span>Personal Timeline</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Learning History & Quizzes
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
              Review your explored concepts, visualization diagrams, and validated quiz outcomes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/create-concept"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-purple-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>New Concept</span>
            </Link>
          </div>
        </div>

        {/* Error notices */}
        {error && (
          <div
            className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 shadow-xs"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 hover:bg-rose-200"
            >
              Retry
            </button>
          </div>
        )}

        {deleteError && (
          <div
            className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-800"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{deleteError}</span>
          </div>
        )}

        {/* Filters & Search Bar */}
        {!loading && history && history.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card-soft">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search learned concepts..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {uniqueTypes.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-medium text-slate-400 px-1">Engine:</span>
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                    filterType === "all"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All
                </button>
                {uniqueTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                      filterType === type
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content State */}
        {loading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-card-soft"
            role="status"
          >
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-600">Loading your learning timeline…</p>
          </div>
        ) : error ? null : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-card-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BookOpen className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 font-display">
              No learning history recorded yet
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
              Create an AI-synthesized concept or explore our visual interactive diagrams to start building your personal record.
            </p>
            <Link
              to="/create-concept"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-purple-700"
            >
              <span>Explore Your First Concept</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            <p className="text-sm">No items match your search filter "{searchQuery}".</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterType("all");
              }}
              className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredHistory.map((item) => (
              <article
                key={item.id}
                className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card-soft transition-all hover:border-indigo-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {item.title}
                    </h2>
                    <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-indigo-700">
                      {item.visualizationType || item.type} Engine
                    </span>
                    {item.explanationLevel && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {item.explanationLevel}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">
                    Accessed {formatDate(item.updatedAt || item.createdAt)}
                  </p>

                  {item.quizTotal > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>
                          Quiz: {item.quizScore} / {item.quizTotal} ({item.quizPercentage}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                  <Link
                    to={`/visualize/${encodeURIComponent(item.conceptId)}`}
                    state={{ concept: item.concept }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition"
                  >
                    <span>Open Diagram</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => removeActivity(item.id)}
                    disabled={deletingId === item.id}
                    aria-label={`Delete ${item.title} history`}
                    title="Delete history item"
                    className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 transition"
                  >
                    {deletingId === item.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
  );
};

export default LearningHistoryPage;

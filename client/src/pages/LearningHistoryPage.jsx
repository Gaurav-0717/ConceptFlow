import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, LoaderCircle, Trash2 } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Learning History
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Your account's concepts and completed quizzes.
        </p>
      </header>

      {error && (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          role="alert"
        >
          {error}{" "}
          <button
            type="button"
            onClick={refresh}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}
      {deleteError && (
        <p role="alert" className="text-sm text-rose-700">
          {deleteError}
        </p>
      )}
      {loading ? (
        <div
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-sm text-slate-600"
          role="status"
        >
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading history…
        </div>
      ) : error ? null : history.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900">
            No learning history yet
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Create or explore a concept to start a personal learning record.
          </p>
          <Link
            to="/create-concept"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700"
          >
            Create a concept <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {history.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words font-semibold text-slate-900">
                    {item.title}
                  </h2>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                    {item.visualizationType || item.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {formatDate(item.updatedAt || item.createdAt)}
                  {item.explanationLevel
                    ? ` · ${item.explanationLevel} explanation`
                    : ""}
                </p>
                {item.quizTotal > 0 && (
                  <p className="text-xs font-medium text-emerald-700">
                    Quiz: {item.quizScore}/{item.quizTotal} (
                    {item.quizPercentage}%)
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                <Link
                  to={`/visualize/${encodeURIComponent(item.conceptId)}`}
                  state={{ concept: item.concept }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open <ArrowUpRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => removeActivity(item.id)}
                  disabled={deletingId === item.id}
                  aria-label={`Delete ${item.title} history`}
                  title="Delete history item"
                  className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
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

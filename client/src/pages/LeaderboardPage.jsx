import React, { useState } from "react";
import { LoaderCircle, Trophy } from "lucide-react";
import useLeaderboard from "../hooks/useLeaderboard";

const PERIODS = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "all-time", label: "All Time" },
];

const rankBadge = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
};

const isSamePublicEntry = (a, b) =>
  Boolean(
    a &&
      b &&
      a.rank === b.rank &&
      a.displayName === b.displayName &&
      a.xp === b.xp,
  );

const LeaderboardPage = () => {
  const [period, setPeriod] = useState("weekly");
  const { leaderboard, currentUser, loading, error, refresh } =
    useLeaderboard(period);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          🏆 Leaderboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Top students by XP earned this period. Only rank, name, and XP are
          public.
        </p>
      </header>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Leaderboard period"
      >
        {PERIODS.map((option) => {
          const selected = period === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setPeriod(option.id)}
              className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

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

      {loading ? (
        <div
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-sm text-slate-600"
          role="status"
        >
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading leaderboard…
        </div>
      ) : error ? null : leaderboard.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <Trophy className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900">No rankings yet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Earn XP by learning and completing quizzes to appear on the
            leaderboard.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 sm:px-5">Rank</th>
                <th className="px-4 py-3 sm:px-5">Student</th>
                <th className="px-4 py-3 text-right sm:px-5">XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.map((entry) => {
                const highlight = isSamePublicEntry(entry, currentUser);
                return (
                  <tr
                    key={`${entry.rank}-${entry.displayName}-${entry.xp}`}
                    className={highlight ? "bg-indigo-50" : "bg-white"}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-base font-bold text-slate-900 sm:px-5">
                      {rankBadge(entry.rank)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 sm:px-5">
                      {entry.displayName}
                      {highlight ? (
                        <span className="ml-2 text-xs font-semibold text-indigo-700">
                          You
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-700 sm:px-5">
                      {entry.xp} XP
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && currentUser ? (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-800">
            Your Rank
          </h2>
          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-bold text-slate-900">
              #{currentUser.rank}{" "}
              <span className="font-semibold">{currentUser.displayName}</span>
            </p>
            <p className="text-base font-bold text-emerald-700">
              {currentUser.xp} XP
            </p>
          </div>
        </section>
      ) : null}

      {!loading && !error && !currentUser ? (
        <p className="text-sm text-slate-600">
          You have not earned XP in this period yet. Complete a concept or quiz
          to join the rankings.
        </p>
      ) : null}
    </div>
  );
};

export default LeaderboardPage;

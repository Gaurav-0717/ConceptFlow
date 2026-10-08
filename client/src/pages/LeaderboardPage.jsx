import React, { useState } from "react";
import {
  LoaderCircle,
  Trophy,
  Medal,
  Crown,
  Sparkles,
  RotateCw,
  AlertCircle,
  User,
  ShieldCheck,
} from "lucide-react";
import useLeaderboard from "../hooks/useLeaderboard";

const PERIODS = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "all-time", label: "All Time" },
];

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

  const topThree = (leaderboard || []).slice(0, 3);
  const restLeaderboard = (leaderboard || []).slice(3);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-700">
              <Trophy className="h-3.5 w-3.5" />
              <span>Global Peer Standings</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Student Leaderboard
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
              Recognizing dedicated students by server-verified XP earned from comprehension quizzes.
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
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div
            className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1"
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
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    selected
                      ? "bg-white text-indigo-700 shadow-sm shadow-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Privacy-preserving standings</span>
          </div>
        </div>

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

        {loading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-16 text-center shadow-card-soft"
            role="status"
          >
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-600">Calculating rank standings…</p>
          </div>
        ) : error ? null : leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-card-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Trophy className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 font-display">
              No rankings recorded for this period yet
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
              Complete a concept and score on the comprehension quiz to claim the #1 spot!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top 3 Podium Cards */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* 2nd place */}
                {topThree[1] && (
                  <div
                    className={`order-2 sm:order-1 relative rounded-2xl border p-5 text-center transition-all ${
                      isSamePublicEntry(topThree[1], currentUser)
                        ? "border-indigo-300 bg-gradient-to-b from-indigo-50/70 to-white shadow-md ring-2 ring-indigo-500/20"
                        : "border-slate-200/80 bg-white shadow-card-soft"
                    }`}
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl shadow-inner text-slate-600 font-extrabold">
                      🥈
                    </div>
                    <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                      Rank #2
                    </span>
                    <h3 className="mt-2 text-base font-bold text-slate-900 truncate">
                      {topThree[1].displayName}
                    </h3>
                    <p className="mt-1 text-lg font-extrabold text-slate-700">
                      {topThree[1].xp.toLocaleString()} <span className="text-xs text-slate-400 font-medium">XP</span>
                    </p>
                    {isSamePublicEntry(topThree[1], currentUser) && (
                      <span className="mt-2 inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 uppercase">
                        You
                      </span>
                    )}
                  </div>
                )}

                {/* 1st place (Champion - Center and Prominent) */}
                {topThree[0] && (
                  <div
                    className={`order-1 sm:order-2 sm:-translate-y-2 relative rounded-2xl border p-6 text-center transition-all ${
                      isSamePublicEntry(topThree[0], currentUser)
                        ? "border-amber-300 bg-gradient-to-b from-amber-50/70 to-white shadow-lg ring-2 ring-amber-500/20"
                        : "border-amber-200/80 bg-gradient-to-b from-amber-50/30 to-white shadow-card-hover"
                    }`}
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-3xl shadow-lg shadow-amber-500/25 text-white">
                      👑
                    </div>
                    <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800">
                      #1 Champion
                    </span>
                    <h3 className="mt-2 text-lg font-extrabold text-slate-900 truncate font-display">
                      {topThree[0].displayName}
                    </h3>
                    <p className="mt-1 text-2xl font-black text-amber-600">
                      {topThree[0].xp.toLocaleString()} <span className="text-xs text-amber-500/80 font-medium">XP</span>
                    </p>
                    {isSamePublicEntry(topThree[0], currentUser) && (
                      <span className="mt-2 inline-block rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase">
                        You
                      </span>
                    )}
                  </div>
                )}

                {/* 3rd place */}
                {topThree[2] && (
                  <div
                    className={`order-3 relative rounded-2xl border p-5 text-center transition-all ${
                      isSamePublicEntry(topThree[2], currentUser)
                        ? "border-indigo-300 bg-gradient-to-b from-indigo-50/70 to-white shadow-md ring-2 ring-indigo-500/20"
                        : "border-slate-200/80 bg-white shadow-card-soft"
                    }`}
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl shadow-inner text-amber-700 font-extrabold">
                      🥉
                    </div>
                    <span className="mt-2 inline-block rounded-full bg-amber-100/60 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                      Rank #3
                    </span>
                    <h3 className="mt-2 text-base font-bold text-slate-900 truncate">
                      {topThree[2].displayName}
                    </h3>
                    <p className="mt-1 text-lg font-extrabold text-slate-700">
                      {topThree[2].xp.toLocaleString()} <span className="text-xs text-slate-400 font-medium">XP</span>
                    </p>
                    {isSamePublicEntry(topThree[2], currentUser) && (
                      <span className="mt-2 inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 uppercase">
                        You
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Table for Remaining Positions */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card-soft">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Rank</th>
                    <th className="px-5 py-3.5">Student Learner</th>
                    <th className="px-5 py-3.5 text-right">XP Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((entry) => {
                    const isSelf = isSamePublicEntry(entry, currentUser);
                    return (
                      <tr
                        key={`${entry.rank}-${entry.displayName}-${entry.xp}`}
                        className={`transition-colors ${
                          isSelf
                            ? "bg-gradient-to-r from-indigo-50/80 to-purple-50/40 font-semibold"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                              entry.rank === 1
                                ? "bg-amber-100 text-amber-800"
                                : entry.rank === 2
                                ? "bg-slate-100 text-slate-700"
                                : entry.rank === 3
                                ? "bg-amber-50 text-amber-700"
                                : "text-slate-500"
                            }`}
                          >
                            #{entry.rank}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-900 font-medium">
                          <div className="flex items-center gap-2">
                            <span>{entry.displayName}</span>
                            {isSelf && (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-extrabold text-slate-900">
                          {entry.xp.toLocaleString()}{" "}
                          <span className="text-xs font-normal text-slate-400">XP</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Current User Standings Footer Card */}
            {currentUser && (
              <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 to-purple-50/60 p-5 shadow-card-soft">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-500/25">
                      #{currentUser.rank}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                        Your Personal Ranking
                      </p>
                      <h4 className="text-base font-bold text-slate-900">
                        {currentUser.displayName}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Period Total</p>
                      <p className="text-lg font-black text-indigo-700">
                        {currentUser.xp.toLocaleString()} XP
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
  );
};

export default LeaderboardPage;

import React from "react";
import { Link } from "react-router-dom";
import { Trophy, ArrowRight, Medal, Crown, Zap } from "lucide-react";
import useLeaderboard from "../../hooks/useLeaderboard";

const rankIcon = (rank) => {
  if (rank === 1) return <Crown className="h-4 w-4 text-amber-500 fill-amber-500/20" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400 fill-slate-400/20" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-700 fill-amber-700/20" />;
  return <span className="text-xs font-bold text-slate-400">#{rank}</span>;
};

export const LeaderboardPreviewCard = () => {
  const { leaderboard, currentUser, loading, error } = useLeaderboard("weekly");

  const topLearners = leaderboard.slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card-soft space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 shadow-sm">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Weekly Top Learners
            </h3>
            <p className="text-[11px] text-slate-500">
              Live peer leaderboard
            </p>
          </div>
        </div>

        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2.5 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-full bg-slate-200" />
                <div className="h-3.5 w-24 rounded bg-slate-200" />
              </div>
              <div className="h-3.5 w-12 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : topLearners.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          No leaderboard entries yet this week. Complete a quiz to climb the ranks!
        </div>
      ) : (
        <div className="space-y-1.5">
          {topLearners.map((learner) => {
            const isMe = currentUser && learner.rank === currentUser.rank && learner.displayName === currentUser.displayName;

            return (
              <div
                key={`${learner.rank}-${learner.displayName}`}
                className={`flex items-center justify-between rounded-xl p-2.5 transition-colors ${
                  isMe
                    ? "bg-gradient-to-r from-indigo-50/90 to-purple-50/90 border border-indigo-200/80 shadow-sm font-semibold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {rankIcon(learner.rank)}
                  </div>
                  <span className="truncate text-xs font-medium text-slate-900">
                    {learner.displayName} {isMe && <span className="text-[10px] text-indigo-600 font-bold">(You)</span>}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-indigo-700 shrink-0">
                  <Zap className="h-3 w-3 fill-indigo-500 text-indigo-500" />
                  <span>{learner.xp?.toLocaleString()} XP</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footnote */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Resets every Monday</span>
        <Link to="/leaderboard" className="text-slate-600 hover:text-indigo-600 font-medium">
          Full Leaderboard →
        </Link>
      </div>
    </div>
  );
};

export default LeaderboardPreviewCard;

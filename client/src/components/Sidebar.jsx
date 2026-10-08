import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  Layers,
  Clock3,
  Trophy,
  Settings,
  HelpCircle,
  LogOut,
  Flame,
  ChevronRight,
  Zap,
  BookOpen,
  X,
  User,
  ShieldCheck,
  BarChart3,
  Award,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: "Learn",
    path: "/create-concept",
    icon: Sparkles,
    badge: "AI",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    name: "Concepts",
    path: "/visualize",
    icon: Layers,
    badge: null,
  },
  {
    name: "Quizzes",
    path: "/history",
    icon: BookOpen,
    badge: null,
  },
  {
    name: "Progress",
    path: "/progress",
    icon: BarChart3,
    badge: null,
  },
  {
    name: "Achievements",
    path: "/achievements",
    icon: Award,
    badge: null,
  },
  {
    name: "Leaderboard",
    path: "/leaderboard",
    icon: Trophy,
    badge: null,
  },
];

export const Sidebar = ({ isOpen, onClose, progress }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const currentStreak = progress?.currentStreak ?? 0;
  const totalXP = progress?.totalXP ?? 0;

  const isActive = (path) => {
    if (path === "/create-concept") {
      return location.pathname === "/create-concept" || location.pathname === "/create";
    }
    if (path === "/visualize") {
      return location.pathname.startsWith("/visualize");
    }
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex h-screen h-[100dvh] w-64 flex-col bg-navy-950 border-r border-slate-800/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0 z-50" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-800/80">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white font-display">
                Concept<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Flow</span>
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                AI Learning Platform
              </span>
            </div>
          </Link>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Real Streak & XP Snippet (if logged in) */}
        {isAuthenticated && (
          <div className="mx-4 mt-4 shrink-0 p-3 rounded-xl bg-gradient-to-r from-slate-900 to-navy-900 border border-slate-800/90 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
                  <Flame className="h-4 w-4 fill-orange-400/30 text-orange-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">
                    {currentStreak} Day{currentStreak === 1 ? "" : "s"} Streak
                  </div>
                  <div className="text-[11px] text-slate-400">Keep learning today</div>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                <Zap className="h-3 w-3 fill-indigo-400 text-indigo-400" />
                <span>{totalXP.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-1.5 dark-scrollbar">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Learning Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onClose?.()}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-lg shadow-indigo-600/30 font-semibold"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      active
                        ? "bg-white/20 text-white border-white/30"
                        : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Support & User Info */}
        <div className="shrink-0 border-t border-slate-800/80 p-4 space-y-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800/70 hover:text-white transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="flex-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800/70 hover:text-white transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Help Guide</span>
            </button>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow">
                  {user?.name?.[0]?.toUpperCase() || <User className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-white">
                    {user?.name || "Student"}
                  </div>
                  <div className="truncate text-[10px] text-slate-400">
                    {user?.email || "Account Active"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-indigo-500 hover:to-purple-500 transition-all"
              >
                Sign In to Save Progress
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-navy-900 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold font-display">ConceptFlow Guide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="rounded-xl bg-slate-800/60 p-3 border border-slate-700/60">
                <p className="font-semibold text-indigo-300">1. Generate & Visualize</p>
                <p className="mt-1 text-slate-400">
                  Input any topic or concept on the Learn page to generate cognitive flowcharts, cycles, and timelines.
                </p>
              </div>
              <div className="rounded-xl bg-slate-800/60 p-3 border border-slate-700/60">
                <p className="font-semibold text-purple-300">2. Take Adaptive Quizzes</p>
                <p className="mt-1 text-slate-400">
                  Open any concept and complete the quiz to earn server-verified XP and maintain your daily learning streak.
                </p>
              </div>
              <div className="rounded-xl bg-slate-800/60 p-3 border border-slate-700/60">
                <p className="font-semibold text-cyan-300">3. Unlock Achievements</p>
                <p className="mt-1 text-slate-400">
                  Earn XP milestones and unlock unique badges shown on your dashboard and the public leaderboard.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="mt-6 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-navy-900 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold font-display">Account & Preferences</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-3 border border-slate-700/60">
                <div>
                  <p className="font-semibold text-white">Signed In Account</p>
                  <p className="text-[11px] text-slate-400">{user?.email || "Guest Session"}</p>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-3 border border-slate-700/60">
                <div>
                  <p className="font-semibold text-white">Daily Target</p>
                  <p className="text-[11px] text-slate-400">5 learning activities / day</p>
                </div>
                <span className="text-xs font-bold text-indigo-300">5 Activities</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-3 border border-slate-700/60">
                <div>
                  <p className="font-semibold text-white">Data Protection</p>
                  <p className="text-[11px] text-slate-400">Encrypted JWT & Server-Authoritative XP</p>
                </div>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="mt-6 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;

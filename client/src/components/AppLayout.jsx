import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  Menu,
  Flame,
  Zap,
  Sparkles,
} from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import useUserProgress from "../hooks/useUserProgress";
import { getHealthStatus } from "../services/api";

const getTitleForPathname = (pathname) => {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/create") || pathname.startsWith("/create-concept")) return "Learn";
  if (pathname.startsWith("/visualize")) return "Concepts";
  if (pathname.startsWith("/history")) return "Learning History";
  if (pathname.startsWith("/leaderboard")) return "Leaderboard";
  if (pathname.startsWith("/progress")) return "Progress";
  if (pathname.startsWith("/achievements")) return "Achievements";
  return "Dashboard";
};

export const AppLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(null);
  const { isAuthenticated } = useAuth();
  const { progress } = useUserProgress();
  const location = useLocation();

  const pageTitle = title || getTitleForPathname(location.pathname);
  const currentStreak = progress?.currentStreak ?? 0;
  const totalXP = progress?.totalXP ?? 0;

  useEffect(() => {
    let isMounted = true;
    getHealthStatus()
      .then((data) => {
        if (isMounted) setApiHealthy(data.status === "HEALTHY");
      })
      .catch(() => {
        if (isMounted) setApiHealthy(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="h-screen h-[100dvh] overflow-hidden bg-[#f8fafc] text-slate-900 antialiased font-sans">
      {/* Dark Navy Sidebar - fixed stationary on left */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        progress={progress}
      />

      {/* Main Application Shell - desktop offset by sidebar width (lg:pl-64) */}
      <div className="flex h-screen h-[100dvh] flex-col min-w-0 overflow-hidden lg:pl-64">
        {/* Modern SaaS Topbar - stationary header */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          {/* Left: Mobile hamburger & Contextual Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100/80 rounded-md px-2 py-0.5">
                ConceptFlow
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-slate-700 capitalize">
                {pageTitle}
              </span>
            </div>
          </div>

          {/* Right: Real Streak, XP, Actions, and User Info */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Real Streak Badge */}
            {isAuthenticated && (
              <div
                title={`${currentStreak} day learning streak`}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 px-3 py-1 text-xs font-bold text-orange-700 shadow-sm"
              >
                <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
                <span>{currentStreak}d</span>
              </div>
            )}

            {/* Real XP Badge */}
            {isAuthenticated && (
              <div
                title={`${totalXP} total XP earned`}
                className="hidden xs:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm"
              >
                <Zap className="h-3.5 w-3.5 fill-indigo-600 text-indigo-600" />
                <span>{totalXP.toLocaleString()} XP</span>
              </div>
            )}

            {/* Quick Action: New Concept */}
            <Link
              to="/create-concept"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 hover:shadow-lg transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Learn Concept</span>
            </Link>

            {/* API Health Dot */}
            <div
              title={
                apiHealthy === true
                  ? "Production Backend Connected"
                  : apiHealthy === false
                    ? "Operating in Offline/Fallback Mode"
                    : "Connecting to API..."
              }
              className="hidden md:flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  apiHealthy === true
                    ? "bg-emerald-500 animate-pulse"
                    : apiHealthy === false
                      ? "bg-amber-500"
                      : "bg-slate-400"
                }`}
              />
              <span>{apiHealthy === true ? "Cloud API" : "Offline"}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body - ONLY this area scrolls vertically */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

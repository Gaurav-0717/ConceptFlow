import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  LayoutDashboard,
  PlusCircle,
  Home,
  Menu,
  X,
  Activity,
  Layers,
  LogOut,
  Clock3,
  Trophy,
  UserRound,
} from "lucide-react";
import { getHealthStatus } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

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

  const navLinks = isAuthenticated
    ? [
        { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { name: "Create Concept", path: "/create-concept", icon: PlusCircle },
        { name: "History", path: "/history", icon: Clock3 },
        { name: "Leaderboard", path: "/leaderboard", icon: Trophy },
      ]
    : [
        { name: "Home", path: "/", icon: Home },
        { name: "Login", path: "/login", icon: UserRound },
      ];

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 group-hover:bg-indigo-700 transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                Concept<span className="text-indigo-600">Flow</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Learning MVP
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${active ? "text-indigo-600" : "text-slate-400"}`}
                  />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions & Status */}
          <div className="hidden xl:flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                apiHealthy === true
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : apiHealthy === false
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
              title={
                apiHealthy === true
                  ? "API Connected"
                  : apiHealthy === false
                    ? "API Disconnected"
                    : "Checking API..."
              }
            >
              <Activity className="w-3.5 h-3.5" />
              
            </div>

            {isAuthenticated ? (
              <>
                <span className="max-w-36 truncate text-sm font-medium text-slate-700">
                  Hi, {user.name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <PlusCircle className="h-4 w-4" /> Get Started
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex xl:hidden items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                apiHealthy === true
                  ? "bg-emerald-500"
                  : apiHealthy === false
                    ? "bg-rose-500"
                    : "bg-slate-400"
              }`}
              title={apiHealthy === true ? "API Online" : "API Status"}
            />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${
                  active
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${active ? "text-indigo-600" : "text-slate-400"}`}
                />
                {link.name}
              </Link>
            );
          })}
          {isAuthenticated ? (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="truncate text-sm font-medium text-slate-700">
                Hi, {user.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          ) : (
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white"
            >
              Get Started <PlusCircle className="h-4 w-4" />
            </Link>
          )}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">API Status:</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                apiHealthy === true
                  ? "bg-emerald-100 text-emerald-800"
                  : apiHealthy === false
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {apiHealthy === true
                ? "Online (200)"
                : apiHealthy === false
                  ? "Offline"
                  : "Checking"}
            </span>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import CreateConceptPage from "./pages/CreateConceptPage";
import VisualizationPage from "./pages/VisualizationPage";
import LearningHistoryPage from "./pages/LearningHistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-slate-50">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <CreateConceptPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-concept"
                element={
                  <ProtectedRoute>
                    <CreateConceptPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <LearningHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <LeaderboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/visualize" element={<VisualizationPage />} />
              <Route path="/visualize/:id" element={<VisualizationPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="border-t border-slate-200 bg-white py-6">
            <div className="max-w-7xl space-y-1 px-4 text-center text-xs text-slate-500">
              <p className="font-medium text-slate-700">
                ConceptFlow &copy; 2026 — Visual Learning Platform
              </p>
              <p>Interactive Visual Learning Platform for Students</p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

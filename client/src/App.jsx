import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import AppLayout from "./components/AppLayout";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import CreateConceptPage from "./pages/CreateConceptPage";
import VisualizationPage from "./pages/VisualizationPage";
import LearningHistoryPage from "./pages/LearningHistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProgressPage from "./pages/ProgressPage";
import AchievementsPage from "./pages/AchievementsPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { AuthProvider } from "./context/AuthContext";
import { ProgressProvider } from "./context/ProgressContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const PublicLayout = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-slate-50">
    <Navbar />
    <main className="flex-1">{children}</main>
    <footer className="border-t border-slate-200 bg-white py-6">
      <div className="max-w-7xl mx-auto space-y-1 px-4 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          ConceptFlow &copy; 2026 — Visual Learning Platform
        </p>
        <p>Interactive Visual Learning Platform for Students</p>
      </div>
    </footer>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <ProgressProvider>
          <Routes>
            {/* Public Marketing & Auth routes */}
            <Route
              path="/"
              element={
                <PublicLayout>
                  <LandingPage />
                </PublicLayout>
              }
            />
            <Route
              path="/login"
              element={
                <PublicLayout>
                  <LoginPage />
                </PublicLayout>
              }
            />
            <Route
              path="/register"
              element={
                <PublicLayout>
                  <RegisterPage />
                </PublicLayout>
              }
            />

            {/* Persistent In-App Layout Routes */}
            <Route element={<AppLayout />}>
              {/* Authenticated In-App SaaS Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/create" element={<CreateConceptPage />} />
                <Route path="/create-concept" element={<CreateConceptPage />} />
                <Route path="/history" element={<LearningHistoryPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
              </Route>

              {/* Visualization Engine Routes */}
              <Route path="/visualize" element={<VisualizationPage />} />
              <Route path="/visualize/:id" element={<VisualizationPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProgressProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

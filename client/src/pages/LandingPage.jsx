import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Compass,
  Lightbulb,
  Video,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Layers,
} from "lucide-react";

const LandingPage = () => {
  const features = [
    {
      icon: Layers,
      title: "Interactive Visualizations",
      description:
        "Transform complex text and abstract theories into clear, interactive diagrams and mind maps.",
      color: "from-blue-500 to-indigo-600",
    },
    {
      icon: Lightbulb,
      title: "Structured Explanations",
      description:
        "Break down intricate topics into bite-sized, logically sequenced cognitive steps.",
      color: "from-amber-500 to-orange-600",
    },
    {
      icon: HelpCircle,
      title: "Adaptive Quizzes",
      description:
        "Reinforce comprehension with automatically tailored questions testing key concepts.",
      color: "from-emerald-500 to-teal-600",
    },
    {
      icon: Video,
      title: "Educational Video Synthesis",
      description:
        "Generate narrated walkthroughs that bring explanations to life for visual learners.",
      color: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs sm:text-sm font-medium">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>AI-Powered Visual Learning Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Turn Any Concept Into an <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Interactive Visual Journey
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 leading-relaxed">
            ConceptFlow empowers students to input paragraphs or complex
            concepts and generate structured visual flows, intuitive
            explanations, targeted quizzes, and multimedia lessons.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/visualize"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg transition-all"
            >
              <span>Explore Visual Engines</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/create"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-700 font-semibold border border-slate-300 hover:bg-slate-50 transition-all"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Create Concept</span>
            </Link>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-700 font-semibold border border-slate-300 hover:bg-slate-50 transition-all"
            >
              <Compass className="w-4 h-4 text-slate-500" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Engineered for Deeper Comprehension
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
            Every feature is architected to optimize retention and clarity for
            modern learners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${feature.color} text-white flex items-center justify-center shadow-sm`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Workflow Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 space-y-8">
          <div className="space-y-3">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-400">
              Roadmap Flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">
              How ConceptFlow Transforms Learning
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="space-y-2 border-l-2 border-indigo-500 pl-4">
              <span className="text-xs text-indigo-400 font-mono font-bold">
                STEP 01
              </span>
              <h3 className="font-semibold text-lg text-white">
                Enter Concept
              </h3>
              <p className="text-xs text-slate-400">
                Paste any textbook section, research paragraph, or technical
                concept.
              </p>
            </div>
            <div className="space-y-2 border-l-2 border-indigo-500 pl-4">
              <span className="text-xs text-indigo-400 font-mono font-bold">
                STEP 02
              </span>
              <h3 className="font-semibold text-lg text-white">
                Structured Decomposition
              </h3>
              <p className="text-xs text-slate-400">
                Core entities and logical progressions are extracted and mapped.
              </p>
            </div>
            <div className="space-y-2 border-l-2 border-indigo-500 pl-4">
              <span className="text-xs text-indigo-400 font-mono font-bold">
                STEP 03
              </span>
              <h3 className="font-semibold text-lg text-white">
                Visual Mastery
              </h3>
              <p className="text-xs text-slate-400">
                Interact with diagram nodes, test your knowledge, and review
                video summaries.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

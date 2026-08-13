import React from 'react';
import { PageView } from '../types';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Terminal, 
  BookOpen,
  Briefcase,
  Check,
  Search,
  Sparkles
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: PageView) => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  isAuthenticated: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenAuth, isAuthenticated }) => {
  return (
    <div className="min-h-screen bg-[#FDFDFE] text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-24 overflow-hidden">
        {/* Background accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-80 bg-gradient-to-b from-blue-50/60 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.15]">
              Stop summarizing.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Extract verifiable facts
              </span>{' '}
              directly from your source text.
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Standard AI models paraphrase and hallucinate numbers. Iroko isolates exact quotes, metrics, deadlines, and decisions word for word so your citations are always 100% dependable.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    onNavigate('extract');
                  } else {
                    onOpenAuth('signup');
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                id="hero-btn-start-extracting"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-base rounded-xl border border-gray-200 shadow-sm transition-all"
                id="hero-btn-see-how"
              >
                <span>See how it works</span>
              </a>
            </div>

            {/* Proof Points */}
            <div className="mt-10 flex items-center justify-center gap-6 text-xs text-gray-500 font-medium flex-wrap">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero Hallucination</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verbatim Source Quotes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>One-Click Export</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 bg-gray-50/70 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              The Flaw With Generative Summaries
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              When standard generative tools summarize transcripts, technical specs, or research papers, they rephrase sentences. That introduces subtle errors, drops critical decimal points, and corrupts source truth.
            </p>
          </div>

          {/* Comparison Matrix Table */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 py-3.5 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-4">Evaluation Metric</div>
              <div className="col-span-4 text-red-700">Generic AI Summaries</div>
              <div className="col-span-4 text-blue-700">Iroko Verbatim Extraction</div>
            </div>

            <div className="divide-y divide-gray-100 text-sm">
              <div className="grid grid-cols-12 py-4 px-6 items-center">
                <div className="col-span-4 font-semibold text-gray-800">Source Fidelity</div>
                <div className="col-span-4 text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Paraphrased with rewritten phrasing
                </div>
                <div className="col-span-4 text-gray-900 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Preserves 100% verbatim source text
                </div>
              </div>

              <div className="grid grid-cols-12 py-4 px-6 items-center bg-gray-50/40">
                <div className="col-span-4 font-semibold text-gray-800">Metrics & Timelines</div>
                <div className="col-span-4 text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Frequently omitted or miscalculated
                </div>
                <div className="col-span-4 text-gray-900 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Captures exact numbers, dates, and metrics
                </div>
              </div>

              <div className="grid grid-cols-12 py-4 px-6 items-center">
                <div className="col-span-4 font-semibold text-gray-800">Verification & Trust</div>
                <div className="col-span-4 text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Unreliable, requires full re-reading
                </div>
                <div className="col-span-4 text-gray-900 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Includes confidence score for every entity
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              How Iroko Works in 3 Steps
            </h2>
            <p className="mt-3 text-gray-600">
              Designed for speed, accuracy, and clear data organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col hover:border-blue-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-5 border border-blue-100">
                1
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Input Source Text</h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                Paste transcripts, lab research logs, meeting notes, or technical specifications into the editor.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col hover:border-blue-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-5 border border-indigo-100">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Isolate Verbatim Entities</h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                The extraction engine scans the source for metrics, action items, decisions, and deadlines without modifying words.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col hover:border-blue-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-5 border border-emerald-100">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Search, Edit & Export</h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                Use quick search to filter facts instantly, copy individual quotes, or export clean CSV, JSON, and Markdown summaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Confidence Scoring Section */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Confidence Scoring Tiers
            </h2>
            <p className="mt-3 text-gray-600">
              Every extracted quote is scored to highlight items that may require human review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Strong */}
            <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
                  HIGH (85% TO 99%)
                </span>
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Direct word-for-word match. Recommended for hard numbers, dates, technical parameters, and formal decisions.
              </p>
            </div>

            {/* Partial */}
            <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
                  Moderate (60% to 84%)
                </span>
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Strong contextual relevance. Covers multi-part statements or conversational discussions with clear intent.
              </p>
            </div>

            {/* Weak */}
            <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wider">
                  Needs Review (Under 60%)
                </span>
                <FileText className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Flagged for manual check before citing in formal reports, academic papers, or documentation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Built for High-Precision Workflows
            </h2>
            <p className="mt-3 text-gray-600">
              Trusted by students, developers, and project leads who need exact data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Engineering & Code Logs</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Isolate error codes, server hostnames, performance benchmarks, and release blockers from technical chats.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Academic & Research Papers</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Extract verbatim quotes, test statistics, and experimental constants ready for academic citations.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Project & Committee Lead</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Capture voting outcomes, financial allocations, deliverables, and assigned owners without ambiguity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Single Free Plan */}
      <section id="pricing" className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Simple, Accessible Pricing
            </h2>
            <p className="mt-3 text-gray-600">
              Iroko is completely free to use with full features unlocked.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                  Standard Plan
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Full Access</h3>
                <p className="text-sm text-gray-500 mt-1">Everything included with no usage fees.</p>
                <div className="mt-6 mb-6">
                  <span className="text-5xl font-extrabold text-gray-900">$0</span>
                </div>
                <ul className="space-y-3.5 text-sm text-gray-600">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unlimited verbatim text extractions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Entity confidence scoring & categorization</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Instant real-time search & filter</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Export to CSV, JSON, and Markdown</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Zero AI hallucination or text paraphrasing</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    onNavigate('extract');
                  } else {
                    onOpenAuth('signup');
                  }
                }}
                className="mt-8 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-colors text-sm cursor-pointer"
                id="btn-plan-free"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black text-gray-900 font-sans">
                iroko
              </span>
              <span className="text-xs text-gray-500 ml-2">
                © {new Date().getFullYear()} Iroko. All rights reserved.
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <button
                onClick={() => onNavigate('terms')}
                className="hover:text-gray-900 transition-colors"
                id="footer-link-terms"
              >
                Terms of Service
              </button>
              <button
                onClick={() => onNavigate('privacy')}
                className="hover:text-gray-900 transition-colors"
                id="footer-link-privacy"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => onNavigate('extract')}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                id="footer-link-extract"
              >
                Workspace
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

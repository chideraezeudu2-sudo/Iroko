import React from 'react';
import { PageView } from '../types';
import {
  ArrowRight,
  CheckCircle2,
  Terminal,
  BookOpen,
  PenLine,
  Check,
  Sparkles,
  Play
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: PageView) => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  isAuthenticated: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenAuth, isAuthenticated }) => {
  const startNow = () => {
    if (isAuthenticated) {
      onNavigate('extract');
    } else {
      onOpenAuth('signup');
    }
  };

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
              Stop scrolling through 50-message AI chats.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Extract the exact gems
              </span>{' '}
              instead.
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Standard AI summarizers rewrite and ruin the exact code snippets, deep explanations, or genius formatting from your threads. Iroko isolates and extracts the exact raw blocks you want from long ChatGPT, Claude, or DeepSeek logs using plain English.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={startNow}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                id="hero-btn-start-extracting"
              >
                <span>Try Iroko for Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-base rounded-xl border border-gray-200 shadow-sm transition-all"
                id="hero-btn-watch-demo"
              >
                <Play className="w-4 h-4" />
                <span>Watch a 30-Second Demo</span>
              </a>
            </div>

            {/* Proof Points */}
            <div className="mt-10 flex items-center justify-center gap-6 text-xs text-gray-500 font-medium flex-wrap">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>100% verbatim</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Plain-English filtering</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>One-click export</span>
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
              The flaw with traditional AI summaries
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              When you ask an AI to summarize a massive, brilliant chat thread, it paraphrases everything. It introduces generic fluff, strips out your exact code parameters, and destroys the specific nuance of the original output.
            </p>
            <p className="mt-3 text-gray-600 leading-relaxed">
              You don't want a generic summary. You want the exact golden paragraphs you generated, without spending ten minutes scrolling, copying, and pasting.
            </p>
          </div>

          {/* Comparison Matrix Table */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 py-3.5 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-4">How you find gems</div>
              <div className="col-span-4 text-red-700">The old way (scrolling & fluff)</div>
              <div className="col-span-4 text-blue-700">The Iroko way (instant & raw)</div>
            </div>

            <div className="divide-y divide-gray-100 text-sm">
              <div className="grid grid-cols-12 py-4 px-6 items-center">
                <div className="col-span-4 font-semibold text-gray-800">Data integrity</div>
                <div className="col-span-4 text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Paraphrased text that ruins code and nuance
                </div>
                <div className="col-span-4 text-gray-900 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  100% verbatim, untouched original AI text
                </div>
              </div>

              <div className="grid grid-cols-12 py-4 px-6 items-center bg-gray-50/40">
                <div className="col-span-4 font-semibold text-gray-800">Speed</div>
                <div className="col-span-4 text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Manually scrolling up, copying, and pasting 10 times
                </div>
                <div className="col-span-4 text-gray-900 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Type what you want in plain English, get it instantly
                </div>
              </div>

              <div className="grid grid-cols-12 py-4 px-6 items-center">
                <div className="col-span-4 font-semibold text-gray-800">Exporting</div>
                <div className="col-span-4 text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Clunky formatting mess in a random notepad
                </div>
                <div className="col-span-4 text-gray-900 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Clean Markdown, JSON, or CSV files ready to use
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
              How Iroko saves your AI gems in 3 steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col hover:border-blue-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-5 border border-blue-100">
                1
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Drop your thread</h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                Paste your long ChatGPT, Claude, or DeepSeek chat history right into the box.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col hover:border-blue-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-5 border border-indigo-100">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Name your target</h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                Tell Iroko what you are looking for in plain English, for example "Pull the Python script and the bullet points about the marketing strategy".
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col hover:border-blue-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-5 border border-emerald-100">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Grab your raw output</h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                Instantly view, copy, or export the exact text blocks in their original formatting. Zero rewriting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-gray-50/70 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Built for AI power-users
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Developers & indie hackers</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Instantly isolate error codes, exact code blocks, and deployment steps from long coding sessions with Claude or DeepSeek.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <PenLine className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Writers & content creators</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Pull the exact hooks, metaphors, or specific outlines generated during intense brainstorming threads.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Researchers & learners</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Extract core technical explanations, equations, or prompt definitions without losing the structural formatting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Single Free Plan */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              100% free. No strings attached.
            </h2>
            <p className="mt-3 text-gray-600">
              I built Iroko because I was sick of scrolling through my own endless ChatGPT history. It's completely free to use with all features unlocked.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Full access
                </div>
                <h3 className="text-2xl font-bold text-gray-900">$0</h3>
                <p className="text-sm text-gray-500 mt-1">Everything included, no usage fees.</p>
                <ul className="mt-6 mb-6 space-y-3.5 text-sm text-gray-600">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unlimited text extractions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Preserves original Markdown and code blocks</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Instant plain-English filtering</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Export directly to Markdown, JSON, or CSV</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={startNow}
                className="mt-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-colors text-sm cursor-pointer"
                id="btn-plan-free"
              >
                Try Iroko for Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA strip */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Stop scrolling. Start extracting.
          </h2>
          <p className="mt-3 text-blue-100">
            Pull the exact code, explanations, and formatting from your AI chats in seconds.
          </p>
          <button
            onClick={startNow}
            className="mt-8 inline-flex items-center gap-2.5 px-7 py-3.5 bg-white hover:bg-blue-50 text-blue-700 font-semibold text-base rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
            id="btn-final-cta"
          >
            <span>Try Iroko for Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
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

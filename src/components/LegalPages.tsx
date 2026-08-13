import React from 'react';
import { PageView } from '../types';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

interface LegalPagesProps {
  type: 'terms' | 'privacy';
  onNavigate: (page: PageView) => void;
}

export const LegalPages: React.FC<LegalPagesProps> = ({ type, onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            onClick={() => onNavigate('landing')}
            className="flex items-center cursor-pointer"
          >
            <span className="text-2xl font-black tracking-tight text-gray-900 font-sans">iroko</span>
          </div>

          <button
            onClick={() => onNavigate('extract')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-lg border border-blue-200 transition-colors"
            id="legal-btn-back-app"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Workspace</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-12 space-y-8">
          {type === 'terms' ? (
            <>
              <div className="border-b border-gray-100 pb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                  <FileText className="w-4 h-4" />
                  <span>Platform Terms</span>
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  Terms of Service
                </h1>
                <p className="text-xs text-gray-500 mt-2">
                  Effective date: 2026. Plain-language operating terms for the Iroko extraction engine.
                </p>
              </div>

              <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                <section className="space-y-2">
                  <h2 className="text-base font-bold text-gray-900">1. Acceptance of Terms</h2>
                  <p>
                    By accessing or utilizing Iroko, you agree to these Terms of Service. If you do not agree with any portion of these provisions, you should discontinue using the platform immediately.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base font-bold text-gray-900">2. Service Scope & Verbatim Processing</h2>
                  <p>
                    Iroko provides algorithmic text parsing designed to isolate verbatim source quotes, quantitative metrics, dates, and action items from user-submitted text. Iroko does not alter, rewrite, or paraphrase source records.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base font-bold text-gray-900">3. User Data Ownership</h2>
                  <p>
                    You retain 100% intellectual property ownership of all source documents, notes, logs, and transcripts processed through our workspace. We claim zero proprietary rights over your data.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base font-bold text-gray-900">4. AI Training & Model Privacy</h2>
                  <p>
                    We do not sell, license, or utilize user inputs to train public generative models or commercial LLMs. User extractions are processed solely to satisfy direct real-time extraction requests.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base font-bold text-gray-900">5. Independent Verification</h2>
                  <p>
                    While Iroko provides automated entity scoring and categorizations, users remain responsible for conducting final verification before referencing extracted data in critical academic, legal, or technical documentation.
                  </p>
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-gray-100 pb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                  <Shield className="w-4 h-4" />
                  <span>Data Protection</span>
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  Privacy Policy
                </h1>
                <p className="text-xs text-gray-500 mt-2">
                  Effective date: 2026. How we manage, secure, and handle your data.
                </p>
              </div>

              <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                <section className="space-y-2">
                  <h2 className="text-base font-bold text-gray-900">1. Information We Collect</h2>
                  <p>
                    We collect your account email address for authentication purposes and the text input you submit for verbatim entity parsing.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base font-bold text-gray-900">2. Processing Purpose</h2>
                  <p>
                    User content is processed exclusively to isolate exact text quotes, calculate confidence metrics, and generate formatted exports (CSV, JSON, Markdown).
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base font-bold text-gray-900">3. Zero Data Monetization</h2>
                  <p>
                    We never sell, rent, or trade personal information or source text to third parties or advertising brokers. You can delete your locally cached extraction history at any time in Settings.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base font-bold text-gray-900">4. Local Security & Storage</h2>
                  <p>
                    All active sessions and cached records are secured using standard client-side browser storage and encrypted server transit protocols.
                  </p>
                </section>
              </div>
            </>
          )}

          <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>© {new Date().getFullYear()} Iroko. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <button onClick={() => onNavigate('terms')} className="hover:text-gray-900">Terms of Service</button>
              <button onClick={() => onNavigate('privacy')} className="hover:text-gray-900">Privacy Policy</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

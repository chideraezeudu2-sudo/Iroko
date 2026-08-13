import React from 'react';
import { PageView } from '../types';
import { Sparkles, ArrowRight, Layers, HelpCircle, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  isAuthenticated: boolean;
  userEmail: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onOpenAuth,
  isAuthenticated,
  userEmail,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo - Just the name */}
        <div 
          onClick={() => onNavigate('landing')} 
          className="flex items-center cursor-pointer group"
          id="nav-brand-logo"
        >
          <span className="text-2xl font-black tracking-tight text-gray-900 font-sans">
            iroko
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-colors hover:text-gray-900 ${currentPage === 'landing' ? 'text-gray-900 font-semibold' : ''}`}
            id="nav-link-home"
          >
            Home
          </button>
          <a
            href="#how-it-works"
            onClick={(e) => {
              if (currentPage !== 'landing') {
                e.preventDefault();
                onNavigate('landing');
                setTimeout(() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="transition-colors hover:text-gray-900"
            id="nav-link-how-it-works"
          >
            How it works
          </a>
          <a
            href="#pricing"
            onClick={(e) => {
              if (currentPage !== 'landing') {
                e.preventDefault();
                onNavigate('landing');
                setTimeout(() => {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="transition-colors hover:text-gray-900"
            id="nav-link-pricing"
          >
            Pricing
          </a>
          <button
            onClick={() => onNavigate('extract')}
            className={`transition-colors hover:text-gray-900 ${currentPage === 'extract' ? 'text-blue-600 font-semibold' : ''}`}
            id="nav-link-workspace"
          >
            Workspace
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onNavigate('settings')}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 transition-colors shadow-2xs"
                id="nav-btn-profile"
                title="Account Settings"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {userEmail ? userEmail[0].toUpperCase() : 'U'}
                </div>
                <span className="max-w-[140px] truncate">{userEmail}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenAuth('signin')}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-1.5 transition-colors cursor-pointer"
                id="nav-btn-signin"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-all hover:shadow active:scale-[0.98] cursor-pointer"
                id="nav-btn-get-started"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { PageView } from '../types';
import { 
  FileText, 
  History, 
  Settings, 
  LogOut, 
  Plus, 
  Shield
} from 'lucide-react';

interface SidebarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  onNewExtraction: () => void;
  userEmail: string;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  onNewExtraction,
  userEmail,
  onSignOut,
}) => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen shrink-0 sticky top-0 select-none">
      {/* Brand Header - Text only */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div 
          onClick={() => onNavigate('landing')}
          className="cursor-pointer"
          id="sidebar-logo"
        >
          <span className="text-2xl font-black tracking-tight text-gray-900 leading-none">
            iroko
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4">
        <button
          type="button"
          onClick={() => {
            onNewExtraction();
          }}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm transition-all hover:shadow active:scale-[0.98]"
          id="btn-sidebar-new-extraction"
        >
          <Plus className="w-4 h-4" />
          <span>New Extraction</span>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Workspace
        </div>

        <button
          onClick={() => onNavigate('extract')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            currentPage === 'extract'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          id="sidebar-nav-extract"
        >
          <FileText className={`w-4 h-4 ${currentPage === 'extract' ? 'text-blue-600' : 'text-gray-400'}`} />
          <span className="flex-1 text-left">Extract</span>
          {currentPage === 'extract' && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          )}
        </button>

        <button
          onClick={() => onNavigate('history')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            currentPage === 'history'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          id="sidebar-nav-history"
        >
          <History className={`w-4 h-4 ${currentPage === 'history' ? 'text-blue-600' : 'text-gray-400'}`} />
          <span className="flex-1 text-left">History</span>
          {currentPage === 'history' && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          )}
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            currentPage === 'settings'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          id="sidebar-nav-settings"
        >
          <Settings className={`w-4 h-4 ${currentPage === 'settings' ? 'text-blue-600' : 'text-gray-400'}`} />
          <span className="flex-1 text-left">Settings</span>
          {currentPage === 'settings' && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          )}
        </button>

        <div className="pt-4 px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Legal & Support
        </div>

        <button
          onClick={() => onNavigate('terms')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentPage === 'terms'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
          id="sidebar-nav-terms"
        >
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span className="flex-1 text-left">Terms of Service</span>
        </button>

        <button
          onClick={() => onNavigate('privacy')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentPage === 'privacy'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
          id="sidebar-nav-privacy"
        >
          <Shield className="w-3.5 h-3.5 text-gray-400" />
          <span className="flex-1 text-left">Privacy Policy</span>
        </button>
      </div>

      {/* User Profile Card (No profile picture) */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-semibold text-gray-900 truncate">{userEmail}</p>
            <p className="text-[11px] text-gray-500">Free Plan</p>
          </div>
          <button
            onClick={onSignOut}
            title="Sign Out"
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
            id="sidebar-btn-signout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

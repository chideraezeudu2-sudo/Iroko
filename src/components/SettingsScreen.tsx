import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  User, 
  KeyRound, 
  Sliders, 
  ShieldAlert, 
  Check, 
  Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsScreenProps {
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onClearHistory: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onUpdateUser,
  onClearHistory,
}) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  // Optimistic local mirror of DB-backed preferences so toggles flip instantly
  // while still persisting through onUpdateUser -> Supabase.
  const [hideWeak, setHideWeak] = useState(user.confidenceThresholdHideWeak);
  const [autoSave, setAutoSave] = useState(user.autoSaveHistory);
  const [strictness, setStrictness] = useState(user.modelStrictness);

  React.useEffect(() => {
    setHideWeak(user.confidenceThresholdHideWeak);
    setAutoSave(user.autoSaveHistory);
    setStrictness(user.modelStrictness);
  }, [user.confidenceThresholdHideWeak, user.autoSaveHistory, user.modelStrictness]);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!newPass || newPass.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordSubmitting(true);
    try {
      // Re-authenticate with the current password, then update.
      if (currentPass) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPass,
        });
        if (verifyError) {
          setPasswordError('Current password is incorrect.');
          setPasswordSubmitting(false);
          return;
        }
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
      if (updateError) throw updateError;
      setPasswordSaved(true);
      setTimeout(() => {
        setPasswordSaved(false);
        setShowPasswordModal(false);
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      }, 1500);
    } catch (err: any) {
      setPasswordError(err?.message || 'Could not update password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all locally archived extractions? This action cannot be undone.')) {
      onClearHistory();
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-gray-50/60 p-6 md:p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuration & Preferences</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your account credentials, extraction strictness parameters, and local data storage.
          </p>
        </div>

        {/* Section 1: Account */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">User Account</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Registered Email
              </label>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium text-gray-800">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Subscription Tier
              </label>
              <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                  Standard Full Access
                </span>
                <span className="text-xs bg-blue-600 text-white font-semibold px-2.5 py-0.5 rounded-full">
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Update authentication credentials and security settings.
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 shadow-sm transition-colors"
              id="btn-change-password-modal"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Update Password</span>
            </button>
          </div>
        </div>

        {/* Section 2: Preferences */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Extraction Parameters</h2>
          </div>

          <div className="space-y-5">
            {/* Threshold Toggle */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-gray-900">
                  Filter Low-Confidence Entities
                </div>
                <p className="text-xs text-gray-500 max-w-xl">
                  Automatically exclude items scored under 60% confidence from the primary workspace results.
                </p>
              </div>
              <button
                onClick={() => {
                  const next = !hideWeak;
                  setHideWeak(next);
                  onUpdateUser({ confidenceThresholdHideWeak: next });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hideWeak ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                id="toggle-hide-weak-confidence"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    hideWeak ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Auto-save History Toggle */}
            <div className="flex items-start justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-gray-900">
                  Local Session Auto-Archiving
                </div>
                <p className="text-xs text-gray-500 max-w-xl">
                  Persist all processed documents and extracted quotes to your browser local archive.
                </p>
              </div>
              <button
                onClick={() => {
                  const next = !autoSave;
                  setAutoSave(next);
                  onUpdateUser({ autoSaveHistory: next });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoSave ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                id="toggle-autosave-history"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoSave ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Strictness Level */}
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Extraction Strictness Level
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Configure how rigidly the parser adheres to word-for-word string matches.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'exact', label: 'Strict Verbatim', desc: 'Isolates exact word-for-word source text with zero modifications.' },
                  { id: 'strict', label: 'High Precision', desc: 'Captures verified metrics, deadlines, and quantitative parameters.' },
                  { id: 'relaxed', label: 'Contextual', desc: 'Retains broader conversational context and surrounding clauses.' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setStrictness(item.id as any);
                      onUpdateUser({ modelStrictness: item.id as any });
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      strictness === item.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    id={`strictness-btn-${item.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-900">{item.label}</span>
                      {strictness === item.id && (
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-red-100">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-bold text-red-900">Local Archive Management</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Clear Extraction Archive</p>
              <p className="text-xs text-gray-500">
                Permanently remove all cached extraction documents and entity records from local storage.
              </p>
            </div>
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors shrink-0"
              id="btn-clear-all-history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local Data</span>
            </button>
          </div>

          {clearedNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Local archive cleared successfully.</span>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-1">Update Security Credentials</h3>
            <p className="text-xs text-gray-500 mb-4">
              Enter your current password followed by your updated credentials.
            </p>

            <form onSubmit={handleSavePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              {passwordSaved && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Password updated successfully.</span>
                </div>
              )}

              {passwordError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium">
                  {passwordError}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-60"
                >
                  {passwordSubmitting ? 'Saving…' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

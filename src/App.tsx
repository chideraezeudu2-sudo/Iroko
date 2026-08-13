import React, { useState, useEffect, useCallback } from 'react';
import { PageView, ExtractionRecord, UserProfile } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { ExtractWorkspace } from './components/ExtractWorkspace';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LegalPages } from './components/LegalPages';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './hooks/useAuth';
import { fetchRecords, saveRecord, deleteRecord as dbDeleteRecord, clearAllRecords, updateProfile } from './lib/db';

export const App: React.FC = () => {
  // Navigation
  const [currentPage, setCurrentPage] = useState<PageView>('landing');

  // Auth & Profile (real Supabase session)
  const { isAuthenticated, profile, loading, signOut, refreshProfile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // History Records (loaded from Supabase)
  const [records, setRecords] = useState<ExtractionRecord[]>([]);

  // Active record in workspace
  const [activeRecord, setActiveRecord] = useState<ExtractionRecord | null>(null);

  const loadRecords = useCallback(async () => {
    if (!isAuthenticated) {
      setRecords([]);
      return;
    }
    try {
      const recs = await fetchRecords();
      setRecords(recs);
    } catch (err: any) {
      console.error('Failed to load records:', err);
      setRecords([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // When auth state flips to authenticated, take the user into the workspace.
  useEffect(() => {
    if (isAuthenticated && currentPage === 'landing') {
      setCurrentPage('extract');
    }
    if (!isAuthenticated) {
      setActiveRecord(null);
    }
  }, [isAuthenticated, currentPage]);

  // Handlers
  const handleSaveRecord = async (newRecord: ExtractionRecord) => {
    if (!profile?.id) return;
    // Optimistic local update for snappy UI.
    setRecords((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)]);
    setActiveRecord(newRecord);
    if (profile.autoSaveHistory) {
      try {
        await saveRecord(newRecord, profile.id);
      } catch (err) {
        console.error('Failed to persist record:', err);
        // Re-sync from source of truth on failure.
        loadRecords();
      }
    }
  };

  const handleDeleteRecord = async (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (activeRecord?.id === id) {
      setActiveRecord(null);
    }
    if (profile?.id) {
      try {
        await dbDeleteRecord(id);
      } catch (err) {
        console.error('Failed to delete record:', err);
        loadRecords();
      }
    }
  };

  const handleClearHistory = async () => {
    setRecords([]);
    setActiveRecord(null);
    try {
      await clearAllRecords();
    } catch (err) {
      console.error('Failed to clear records:', err);
      loadRecords();
    }
  };

  const handleUpdateUser = async (updated: Partial<UserProfile>) => {
    if (!profile?.id) return;
    try {
      await updateProfile(profile.id, updated);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const handleNewExtraction = () => {
    setActiveRecord({
      id: `rec-${Date.now()}`,
      title: 'New Extraction',
      rawInput: '',
      extractedAt: new Date().toISOString(),
      characterCount: 0,
      volume: 0,
      status: 'completed',
      entities: [],
    });
    setCurrentPage('extract');
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentPage('landing');
    setRecords([]);
    setActiveRecord(null);
  };

  // Render Layouts
  if (currentPage === 'landing') {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-[#FDFDFE]">
        <Navbar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onOpenAuth={handleOpenAuth}
          isAuthenticated={isAuthenticated}
          userEmail={profile?.email || ''}
        />
        <LandingPage
          onNavigate={setCurrentPage}
          onOpenAuth={handleOpenAuth}
          isAuthenticated={isAuthenticated}
        />
        <AuthModal
          isOpen={showAuthModal}
          initialMode={authMode}
          onClose={() => setShowAuthModal(false)}
          onLogin={() => {}}
        />
      </div>
    );
  }

  if (currentPage === 'terms' || currentPage === 'privacy') {
    return (
      <LegalPages
        type={currentPage}
        onNavigate={setCurrentPage}
      />
    );
  }

  // Dashboard layout for 'extract', 'history', 'settings'
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onNewExtraction={handleNewExtraction}
        userEmail={profile?.email || ''}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Loading workspace…
          </div>
        ) : currentPage === 'extract' ? (
          <ExtractWorkspace
            currentRecord={activeRecord}
            onSaveRecord={handleSaveRecord}
            hideWeakConfidence={profile?.confidenceThresholdHideWeak ?? false}
          />
        ) : currentPage === 'history' ? (
          <HistoryScreen
            records={records}
            onSelectRecord={(rec) => {
              setActiveRecord(rec);
            }}
            onDeleteRecord={handleDeleteRecord}
            onNavigate={setCurrentPage}
          />
        ) : currentPage === 'settings' ? (
          <SettingsScreen
            user={
              profile || {
                id: '',
                email: '',
                name: '',
                avatarUrl: '',
                role: 'Researcher',
                plan: 'free',
                confidenceThresholdHideWeak: false,
                autoSaveHistory: true,
                modelStrictness: 'exact',
              }
            }
            onUpdateUser={handleUpdateUser}
            onClearHistory={handleClearHistory}
          />
        ) : null}
      </main>

      <AuthModal
        isOpen={showAuthModal}
        initialMode={authMode}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => {}}
      />
    </div>
  );
};

export default App;

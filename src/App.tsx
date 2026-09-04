import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { HistorySidebar } from './components/HistorySidebar';
import { ReflectionWorkspace } from './components/ReflectionWorkspace';
import { subscribeToUserInteractions, deleteInteraction } from './lib/firebase';
import type { Interaction } from './types';
import { ShieldCheck, AlertCircle, Menu, X } from 'lucide-react';

function DashboardContent() {
  const { currentUser } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Subscribe to real-time Firestore changes strictly isolated to this user
  useEffect(() => {
    if (!currentUser) {
      setInteractions([]);
      setSelectedId(null);
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    setHistoryError(null);

    const unsubscribe = subscribeToUserInteractions(
      currentUser.uid,
      (data) => {
        setInteractions(data);
        setLoadingHistory(false);

        // If selected interaction exists in updated data, sync it
        if (selectedId) {
          const stillExists = data.find((i) => i.id === selectedId);
          if (!stillExists) {
            setSelectedId(null);
          }
        }
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        setHistoryError('Failed to synchronize user-isolated entries from Firestore.');
        setLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, selectedId]);

  const activeInteraction = interactions.find((i) => i.id === selectedId) || null;

  const handleSelectInteraction = (interaction: Interaction) => {
    setSelectedId(interaction.id);
    setIsMobileSidebarOpen(false);
  };

  const handleNewSession = () => {
    setSelectedId(null);
    setIsMobileSidebarOpen(false);
  };

  const handleInteractionSaved = (saved: Interaction) => {
    setSelectedId(saved.id);
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteInteraction(currentUser.uid, id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (err: any) {
      console.error('Failed to delete interaction:', err);
      alert('Failed to delete entry from Firestore.');
    }
  };

  return (
    <div id="dashboard-container" className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F9FAFB] text-[#111827]">
      {/* Mobile Drawer Toggle & Status Bar */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="flex items-center gap-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
        >
          {isMobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span>Past Entries ({interactions.length})</span>
        </button>

        <span className="text-[11px] text-gray-600 flex items-center gap-1.5 font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span>Isolated</span>
        </span>
      </div>

      {historyError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>{historyError}</span>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
          <HistorySidebar
            interactions={interactions}
            selectedId={selectedId}
            onSelect={handleSelectInteraction}
            onNew={handleNewSession}
            onDelete={handleDeleteInteraction}
            loading={loadingHistory}
          />
        </div>

        {/* Mobile Slide-over Sidebar */}
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-xs"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-50">
              <HistorySidebar
                interactions={interactions}
                selectedId={selectedId}
                onSelect={handleSelectInteraction}
                onNew={handleNewSession}
                onDelete={handleDeleteInteraction}
                loading={loadingHistory}
              />
            </div>
          </div>
        )}

        {/* Primary Reflection Workspace */}
        <ReflectionWorkspace
          activeInteraction={activeInteraction}
          onInteractionSaved={handleInteractionSaved}
          onNewSession={handleNewSession}
        />
      </div>
    </div>
  );
}

function MainApp() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium tracking-tight">Connecting to secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col font-sans antialiased selection:bg-gray-200">
      <Navbar />
      {currentUser ? <DashboardContent /> : <LandingView />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

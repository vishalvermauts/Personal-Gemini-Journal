import React from 'react';
import { useAuth } from '../context/AuthContext';
import type { AppTab } from '../types';
import {
  ShieldCheck,
  LogOut,
  LogIn,
  User as UserIcon,
  BookOpen,
  Clock,
  Sparkles,
  MapPin,
  Shield,
} from 'lucide-react';

interface NavbarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { currentUser, signInWithGoogle, signOutUser, loading } = useAuth();

  const navItems: Array<{ id: AppTab; label: string; icon: React.ReactNode }> = [
    { id: 'journal', label: 'Journal', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="h-4 w-4" /> },
    { id: 'insights', label: 'Insights', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'memories', label: 'Memories', icon: <MapPin className="h-4 w-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <header id="app-header" className="h-16 border-b border-gray-200 bg-white sticky top-0 z-30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Brand & Product Title */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => onTabChange('journal')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-xs">
              <div className="w-3.5 h-3.5 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 tracking-tight text-base sm:text-lg leading-tight">
                Gemini LifeLog
              </span>
              <span className="text-[10px] text-gray-500 font-medium hidden sm:inline leading-none">
                Private AI Memory & Reflection
              </span>
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs (when logged in) */}
        {currentUser && (
          <nav className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-medium">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white text-gray-900 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Security badge & User controls */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div
              id="security-isolation-badge"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded-md text-xs font-medium"
              title="Only authenticated requests with matching UID can read or write to this Firestore vault"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Isolated Vault</span>
            </div>
          )}

          {loading ? (
            <div className="h-8 w-24 bg-gray-100 animate-pulse rounded-md"></div>
          ) : currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 pl-1">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User Avatar'}
                    className="h-8 w-8 rounded-full border border-gray-200 object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 shrink-0">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
                <span className="text-xs font-medium text-gray-800 hidden xl:inline max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
              <button
                id="btn-signout"
                onClick={signOutUser}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
                title="Sign out of your session"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              id="btn-nav-signin"
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-black hover:bg-gray-800 rounded-lg shadow-xs transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Navigation Bar (Under header on mobile screens) */}
      {currentUser && (
        <div className="md:hidden flex items-center justify-around border-t border-gray-200 bg-white px-2 py-1.5 text-xs font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors ${
                  isActive ? 'text-black font-bold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {item.icon}
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

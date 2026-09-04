import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, LogIn, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, signInWithGoogle, signOutUser, loading } = useAuth();

  return (
    <header id="app-header" className="h-16 border-b border-gray-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-xs">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-gray-900 tracking-tight text-base sm:text-lg">
              Reflection
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200 tracking-tight">
              Gemini 3.6 Flash
            </span>
          </div>
        </div>

        {/* Security badge & User controls */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div
              id="security-isolation-badge"
              className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded-md text-xs font-medium"
              title="Only authenticated requests with matching UID can read or write to this Firestore collection"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <ShieldCheck className="h-3.5 w-3.5 text-gray-600" />
              <span>Isolated Vault</span>
            </div>
          )}

          {loading ? (
            <div className="h-8 w-24 bg-gray-100 animate-pulse rounded-md"></div>
          ) : currentUser ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 pl-2">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User Avatar'}
                    className="h-8 w-8 rounded-full border border-gray-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-800 hidden sm:inline max-w-[130px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
              <button
                id="btn-signout"
                onClick={signOutUser}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md transition-colors"
                title="Sign out of your session"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              id="btn-nav-signin"
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg shadow-xs transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

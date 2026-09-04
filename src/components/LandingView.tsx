import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Database,
  BrainCircuit,
  CheckCircle2,
  Lock,
  ArrowRight,
  Clock,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const LandingView: React.FC = () => {
  const { signInWithGoogle, loading, error } = useAuth();

  return (
    <div id="landing-view" className="max-w-5xl mx-auto px-4 py-14 sm:py-20 font-sans">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Gemini LifeLog • Private AI Memory & Reflection
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
          Your Private AI Memory & Structured Reflection Vault
        </h1>

        <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
          Capture thoughts with guaranteed save-before-analysis resilience. Receive empathetic reflections,
          structured insights, and actionable steps. Explore your chronological timeline, memory map, and growth trends.
        </p>

        {/* Primary CTA */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="btn-hero-signin"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 text-sm sm:text-base font-semibold text-white bg-black hover:bg-gray-800 disabled:opacity-60 rounded-xl shadow-xs transition-all active:scale-98"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Authenticating...' : 'Sign in with Google to Enter Vault'}</span>
            <ArrowRight className="h-4 w-4 text-white" />
          </button>
        </div>

        {error && (
          <div
            id="auth-error-alert"
            className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs max-w-md mx-auto flex items-center gap-2"
          >
            <Lock className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Feature Pillars */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div id="feature-card-resilience" className="p-6 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-gray-100 text-gray-900 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-base text-gray-900">Save-Before-Analysis</h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Your words are saved to your vault before AI analysis begins. If connection or AI fails, your thoughts are
            never lost and remain retryable.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-gray-800 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Zero data loss guarantee
          </div>
        </div>

        <div id="feature-card-insights" className="p-6 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-gray-100 text-gray-900 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="font-semibold text-base text-gray-900">Structured AI Insights</h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Automatic extraction of titles, summaries, topic tags, key ideas, and action items. Distinguishes your
            original text from companion thoughts.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-gray-800 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Schema-constrained JSON
          </div>
        </div>

        <div id="feature-card-maps" className="p-6 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-gray-100 text-gray-900 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-rose-500" />
          </div>
          <h3 className="font-semibold text-base text-gray-900">Memory Map & Timeline</h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Optionally attach places to memories. Relive moments on an interactive memory map and search your
            chronological timeline anytime.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-gray-800 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 100% Opt-in location privacy
          </div>
        </div>
      </div>

      {/* Security Architecture Box */}
      <div className="mt-12 p-6 bg-black text-white rounded-2xl border border-gray-800 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-white" />
          <h4 className="font-semibold text-white text-base">Production Directives & Security Guarantees</h4>
        </div>
        <p className="text-xs sm:text-sm text-gray-300">
          Built according to the 5 Threat Zones defense framework:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-300">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">•</span>
            <span>
              <strong>Server-Side ID Token Auth:</strong> All protected API routes verify Firebase ID tokens via
              Firebase Admin SDK.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">•</span>
            <span>
              <strong>Firestore Vault Isolation:</strong> Strict path-bound rules (<code>request.auth.uid == userId</code>)
              mathematically prevent cross-user leaks.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">•</span>
            <span>
              <strong>Zero-Password Exposure:</strong> Federated Google Identity eliminates credential handling on custom
              servers.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">•</span>
            <span>
              <strong>Prompt Injection Hardening:</strong> Journal content is encapsulated within untrusted data delimiters.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

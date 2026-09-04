import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Database, BrainCircuit, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

export const LandingView: React.FC = () => {
  const { signInWithGoogle, loading, error } = useAuth();

  return (
    <div id="landing-view" className="max-w-5xl mx-auto px-4 py-14 sm:py-20 font-sans">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider">
          <div className="w-2 h-2 rounded-full bg-black"></div>
          Gemini 3.6 Flash & Cloud Firestore Architecture
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
          Private, AI-Powered Journaling & Deep Reflections
        </h1>

        <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
          Capture your thoughts, explore multi-turn reflections, and receive intelligent summaries.
          Every entry is locked securely inside your own user-isolated Firestore vault.
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
            <span>{loading ? 'Authenticating...' : 'Sign in with Google to Begin'}</span>
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
        <div id="feature-card-isolation" className="p-6 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-gray-100 text-gray-900 flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-base text-gray-900">User Data Isolation</h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Rigorous security rules bind database operations to <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-800">request.auth.uid</code>. Cross-user leaks are mathematically blocked.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-gray-800 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Zero insecure database rules
          </div>
        </div>

        <div id="feature-card-multiturn" className="p-6 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-gray-100 text-gray-900 flex items-center justify-center">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-base text-gray-900">Multi-Turn Reflections</h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Converse naturally with Gemini 3.6 Flash. Deepen your insights across multiple dialogue turns, request summaries, or brainstorm actionable next steps.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-gray-800 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Resilient 4-step fallback ladder
          </div>
        </div>

        <div id="feature-card-persistence" className="p-6 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-gray-100 text-gray-900 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-base text-gray-900">Cloud Firestore Vault</h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Every thought and AI response is safely synced with zero data loss. Review your past history anytime, search entries, and track your personal journey.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-gray-800 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Real-time listener synchronization
          </div>
        </div>
      </div>

      {/* Security Architecture Box */}
      <div className="mt-12 p-6 bg-black text-white rounded-xl border border-gray-800 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-white" />
          <h4 className="font-semibold text-white text-base">Security & Architectural Guarantees</h4>
        </div>
        <p className="text-xs sm:text-sm text-gray-300">
          This system adheres to the 5 Threat Zones modeling framework:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-300">
          <div className="flex items-start gap-2">
            <span className="text-white font-bold">•</span>
            <span><strong>Zero Password Exposure:</strong> Federated Google OAuth via Firebase Auth handles credentials securely.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-white font-bold">•</span>
            <span><strong>Secret Hygiene:</strong> Gemini API keys are never exposed in browser bundles, proxying only through secure backend routes.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-white font-bold">•</span>
            <span><strong>Payload Sanitization:</strong> Strict zero-undefined stripping guarantees clean Firestore write transactions.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-white font-bold">•</span>
            <span><strong>Prompt Injection Hardened:</strong> User reflections are strictly isolated from execution sinks and system meta-prompts.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

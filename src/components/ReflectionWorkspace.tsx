import React, { useState, useEffect, useRef } from 'react';
import type { Interaction, ReflectionMode, Turn } from '../types';
import { useAuth } from '../context/AuthContext';
import { saveInteraction } from '../lib/firebase';
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  BookOpen,
  FileText,
  Lightbulb,
  AlertCircle,
  RefreshCw,
  Clock,
  User,
  Bot,
  Compass,
} from 'lucide-react';

interface ReflectionWorkspaceProps {
  activeInteraction: Interaction | null;
  onInteractionSaved: (interaction: Interaction) => void;
  onNewSession: () => void;
}

const PROMPT_STARTERS = [
  'What went well today, and what taught me something unexpected?',
  'Help me reflect on a difficult conversation I had today...',
  'Summarize the core themes and mental blocks I am experiencing right now.',
  'Brainstorm creative solutions to balance my deep work and daily responsibilities.',
];

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  activeInteraction,
  onInteractionSaved,
  onNewSession,
}) => {
  const { currentUser } = useAuth();

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<ReflectionMode>('reflection');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedPayload, setFailedPayload] = useState<{
    prompt: string;
    mode: ReflectionMode;
    history: Turn[];
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync mode with active interaction if loaded
  useEffect(() => {
    if (activeInteraction) {
      setCurrentMode(activeInteraction.mode);
      setErrorMessage(null);
      setFailedPayload(null);
    } else {
      setInputPrompt('');
    }
  }, [activeInteraction]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeInteraction?.turns, isGenerating]);

  // Copy response to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePromptStarter = (starterText: string) => {
    setInputPrompt(starterText);
    textareaRef.current?.focus();
  };

  /**
   * Generates reflection with Gemini API backend and atomically verifies save to Firestore
   */
  const handleSendReflection = async (retryPrompt?: string, retryMode?: ReflectionMode) => {
    const promptToSend = retryPrompt ?? inputPrompt.trim();
    const modeToUse = retryMode ?? currentMode;

    if (!promptToSend || !currentUser) return;

    setIsGenerating(true);
    setErrorMessage(null);

    // Build history from existing interaction
    const existingTurns: Turn[] = activeInteraction?.turns || [];
    const historyPayload = activeInteraction
      ? [
          { user: activeInteraction.prompt, model: activeInteraction.response, timestamp: activeInteraction.createdAt },
          ...existingTurns,
        ]
      : [];

    try {
      // 1. Call secure backend Gemini proxy with resilient fallback ladder
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          mode: modeToUse,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}: Failed to generate reflection.`);
      }

      const data = await response.json();
      const geminiReply = data.response;

      // 2. Guaranteed Transaction Verification: Persist user input AND generated output to Firestore
      const timestamp = new Date().toISOString();
      let updatedInteraction: Interaction;

      if (activeInteraction) {
        // Multi-turn addition to existing interaction
        const newTurn: Turn = {
          user: promptToSend,
          model: geminiReply,
          timestamp,
        };
        updatedInteraction = {
          ...activeInteraction,
          turns: [...(activeInteraction.turns || []), newTurn],
          updatedAt: timestamp,
        };
      } else {
        // Fresh initial interaction
        const interactionId = `interaction_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const titleSnippet =
          promptToSend.length > 55 ? promptToSend.substring(0, 52) + '...' : promptToSend;

        updatedInteraction = {
          id: interactionId,
          userId: currentUser.uid,
          title: titleSnippet,
          mode: modeToUse,
          prompt: promptToSend,
          response: geminiReply,
          turns: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }

      // Save to Firestore with strict undefined-stripping
      await saveInteraction(currentUser.uid, updatedInteraction);

      // Only clear input buffer AFTER successful write confirmation
      setInputPrompt('');
      setFailedPayload(null);
      onInteractionSaved(updatedInteraction);
    } catch (err: any) {
      console.error('Reflection submission failed:', err);
      setErrorMessage(
        err.message || 'An error occurred while generating or saving your reflection.'
      );
      // Retain buffer and store failed payload for retry
      setFailedPayload({
        prompt: promptToSend,
        mode: modeToUse,
        history: historyPayload,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendReflection();
    }
  };

  return (
    <main
      id="reflection-workspace"
      className="flex-1 flex flex-col h-full bg-[#F9FAFB] overflow-hidden relative font-sans"
    >
      {/* Top Workspace Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex rounded-md bg-gray-100 p-1 border border-gray-200 text-xs font-medium">
            <button
              id="mode-tab-reflection"
              onClick={() => setCurrentMode('reflection')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                currentMode === 'reflection'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-gray-700" />
              <span>Reflection</span>
            </button>
            <button
              id="mode-tab-summary"
              onClick={() => setCurrentMode('summary')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                currentMode === 'summary'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-gray-700" />
              <span>Summary</span>
            </button>
            <button
              id="mode-tab-brainstorm"
              onClick={() => setCurrentMode('brainstorm')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                currentMode === 'brainstorm'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Lightbulb className="h-3.5 w-3.5 text-gray-700" />
              <span>Brainstorm</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>Vault Synced</span>
          </span>

          {activeInteraction && (
            <button
              onClick={onNewSession}
              className="text-xs text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-medium transition-colors shadow-xs"
            >
              Start New Thread
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {!activeInteraction ? (
          /* Empty / Initial State */
          <div className="max-w-2xl mx-auto py-10 sm:py-16 text-center space-y-6">
            <div className="h-14 w-14 bg-black text-white rounded-xl flex items-center justify-center mx-auto shadow-xs">
              <Compass className="h-7 w-7 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                What is on your mind today?
              </h2>
              <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
                Write freely about what happened, ideas you are exploring, or decisions you are making. Gemini will reflect, summarize, or brainstorm with you.
              </p>
            </div>

            {/* Prompt Starters */}
            <div className="pt-2 text-left space-y-2 max-w-lg mx-auto">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block text-center">
                Need inspiration? Select a starter prompt
              </span>
              <div className="grid grid-cols-1 gap-2">
                {PROMPT_STARTERS.map((starter, i) => (
                  <button
                    key={i}
                    id={`starter-${i}`}
                    onClick={() => handlePromptStarter(starter)}
                    className="p-3 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg text-left text-xs sm:text-sm text-gray-800 transition-all shadow-xs flex items-center justify-between group"
                  >
                    <span className="line-clamp-1">{starter}</span>
                    <Sparkles className="h-3.5 w-3.5 text-gray-400 group-hover:text-black shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Multi-Turn Thread Container */
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Primary Entry (Turn 1) */}
            <div className="space-y-4">
              {/* User Prompt Card */}
              <div className="flex flex-col items-end gap-1.5">
                <div className="max-w-[85%] bg-gray-100 text-gray-900 p-4 rounded-2xl rounded-tr-none shadow-xs space-y-1 border border-gray-200/60">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500 pb-1.5 border-b border-gray-200">
                    <span className="font-semibold text-gray-700">You (Journal Reflection)</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="h-3 w-3" />
                      {new Date(activeInteraction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-900 pt-1">
                    {activeInteraction.prompt}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 mr-2 uppercase tracking-wider font-medium">
                  Sent • Isolated Vault
                </span>
              </div>

              {/* Gemini Response Card */}
              <div className="flex flex-col items-start gap-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-black rounded flex items-center justify-center shadow-xs">
                    <div className="w-2.5 h-2.5 border border-white rotate-45"></div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Gemini 3.6 Flash
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200 uppercase tracking-tight">
                    {activeInteraction.mode}
                  </span>
                </div>

                <div className="w-full max-w-[88%] bg-white border border-gray-200 p-5 sm:p-6 rounded-2xl rounded-tl-none shadow-xs space-y-3">
                  <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap space-y-2">
                    {activeInteraction.response}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                      Generated via Gemini 3.6 Flash
                    </span>

                    <button
                      onClick={() => handleCopy(activeInteraction.response, 'main-response')}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-black transition-colors font-medium p-1"
                      title="Copy response"
                    >
                      {copiedId === 'main-response' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Response</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Subsequent Dialogue Turns (Turns 2+) */}
            {activeInteraction.turns?.map((turn, index) => (
              <div key={index} className="space-y-4 pt-2">
                {/* User follow-up */}
                <div className="flex flex-col items-end gap-1.5">
                  <div className="max-w-[85%] bg-gray-100 text-gray-900 p-4 rounded-2xl rounded-tr-none shadow-xs space-y-1 border border-gray-200/60">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500 pb-1.5 border-b border-gray-200">
                      <span className="font-semibold text-gray-700">You (Turn {index + 2})</span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-900 pt-1">
                      {turn.user}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 mr-2 uppercase tracking-wider font-medium">
                    Sent • Turn {index + 2}
                  </span>
                </div>

                {/* Gemini follow-up */}
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center shadow-xs">
                      <div className="w-2.5 h-2.5 border border-white rotate-45"></div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      Gemini 3.6 Flash
                    </span>
                  </div>

                  <div className="w-full max-w-[88%] bg-white border border-gray-200 p-5 sm:p-6 rounded-2xl rounded-tl-none shadow-xs space-y-3">
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {turn.model}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        Turn {index + 2} Response
                      </span>

                      <button
                        onClick={() => handleCopy(turn.model, `turn-${index}`)}
                        className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-black transition-colors font-medium p-1"
                      >
                        {copiedId === `turn-${index}` ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Generating Skeleton / Loading Turn */}
            {isGenerating && (
              <div className="flex flex-col items-start gap-1.5 pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-black rounded flex items-center justify-center shadow-xs animate-pulse">
                    <div className="w-2.5 h-2.5 border border-white rotate-45"></div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Gemini 3.6 Flash
                  </span>
                </div>

                <div className="w-full max-w-[88%] bg-white border border-gray-200 p-5 rounded-2xl rounded-tl-none shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                    <span>Gemini is synthesizing reflection...</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-4/6" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/6" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error & Retry Banner (Directive: Explicit Error Escalation & User Feedback) */}
      {errorMessage && (
        <div
          id="error-feedback-banner"
          className="mx-4 sm:mx-6 mb-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between gap-3 shadow-xs shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          {failedPayload && (
            <button
              id="btn-retry-save"
              onClick={() => handleSendReflection(failedPayload.prompt, failedPayload.mode)}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-medium text-xs shrink-0 transition-colors shadow-xs"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry Save & Generation</span>
            </button>
          )}
        </div>
      )}

      {/* Bottom Input Console */}
      <div className="p-4 sm:p-6 bg-[#F9FAFB] border-t border-gray-200 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="relative rounded-xl border border-gray-300 bg-white focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all shadow-xs">
            <textarea
              ref={textareaRef}
              id="reflection-input-textarea"
              rows={3}
              placeholder={
                activeInteraction
                  ? 'Add a follow-up reflection, question, or continuation...'
                  : 'Write your journal entry or thoughts here (Press Cmd+Enter to send)...'
              }
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              className="w-full p-3 sm:p-4 text-sm bg-transparent border-0 resize-none focus:outline-none placeholder-gray-400 text-gray-900 leading-relaxed"
            />

            <div className="flex items-center justify-between px-3.5 pb-3 pt-1 border-t border-gray-100">
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                Mode: <strong className="capitalize text-gray-700">{currentMode}</strong> • Cmd+Enter to submit
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  id="btn-submit-reflection"
                  onClick={() => handleSendReflection()}
                  disabled={!inputPrompt.trim() || isGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 disabled:opacity-40 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-xs"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Reflecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="h-3.5 w-3.5 text-white" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

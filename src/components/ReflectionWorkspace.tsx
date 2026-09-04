import React, { useState, useEffect, useRef } from 'react';
import type { Interaction, ReflectionMode, Turn, LocationData } from '../types';
import { useAuth } from '../context/AuthContext';
import { saveInteraction, updateInteraction } from '../lib/firebase';
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
  MapPin,
  X,
  Smile,
  CheckSquare,
  Compass,
  ShieldCheck,
} from 'lucide-react';

interface ReflectionWorkspaceProps {
  activeInteraction: Interaction | null;
  onInteractionSaved: (interaction: Interaction) => void;
  onNewSession: () => void;
}

const PROMPT_STARTERS = [
  'What went well today, and what taught me something unexpected?',
  'Reflect on a challenging decision or dilemma I faced recently...',
  'Summarize the core mental blocks and priorities on my plate right now.',
  'Brainstorm creative experiments to improve my focus and balance.',
];

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  activeInteraction,
  onInteractionSaved,
  onNewSession,
}) => {
  const { currentUser } = useAuth();

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<ReflectionMode>('reflection');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Location opt-in state
  const [locationName, setLocationName] = useState<string>('');
  const [isAddingLocation, setIsAddingLocation] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with active interaction
  useEffect(() => {
    if (activeInteraction) {
      setCurrentMode(activeInteraction.mode);
      setCurrentLocation(activeInteraction.location || null);
      setErrorMessage(null);
      setSaveStatusText(null);
    } else {
      setInputPrompt('');
      setCurrentLocation(null);
      setLocationName('');
      setIsAddingLocation(false);
    }
  }, [activeInteraction]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeInteraction?.turns, isAnalyzing, isSaving]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePromptStarter = (starterText: string) => {
    setInputPrompt(starterText);
    textareaRef.current?.focus();
  };

  // Location Opt-In Geolocation
  const handleCaptureCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fuzzyLat = parseFloat(pos.coords.latitude.toFixed(3));
        const fuzzyLng = parseFloat(pos.coords.longitude.toFixed(3));
        const placeLabel = locationName.trim() || `Place (${fuzzyLat}, ${fuzzyLng})`;
        setCurrentLocation({
          name: placeLabel,
          lat: fuzzyLat,
          lng: fuzzyLng,
          capturedAt: new Date().toISOString(),
        });
        setIsAddingLocation(false);
      },
      (err) => {
        console.warn('Geolocation failed or permission denied:', err);
        // Still allow manual place naming if permission denied
        if (locationName.trim()) {
          setCurrentLocation({
            name: locationName.trim(),
            capturedAt: new Date().toISOString(),
          });
          setIsAddingLocation(false);
        } else {
          alert('Location permission was not granted. You can type a place name manually.');
        }
      },
      { timeout: 8000 }
    );
  };

  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locationName.trim()) {
      setCurrentLocation({
        name: locationName.trim(),
        capturedAt: new Date().toISOString(),
      });
      setIsAddingLocation(false);
    }
  };

  const handleRemoveLocation = () => {
    setCurrentLocation(null);
    setLocationName('');
    setIsAddingLocation(false);
  };

  /**
   * Resilient Save-Before-Analysis Pipeline:
   * 1. Save user prompt to Firestore FIRST (guarantee zero data loss).
   * 2. Call Gemini API for reflection + structured insights.
   * 3. Update document with companion response and insights.
   * 4. If AI fails, user prompt remains saved and retryable.
   */
  const handleSendReflection = async (retryEntry?: Interaction) => {
    if (!currentUser) return;

    const promptToSend = retryEntry ? retryEntry.prompt : inputPrompt.trim();
    const modeToUse = retryEntry ? retryEntry.mode : currentMode;
    const locationToUse = retryEntry ? retryEntry.location : currentLocation;

    if (!promptToSend) return;

    setErrorMessage(null);
    setSaveStatusText('Saving to vault...');
    setIsSaving(true);

    const timestamp = new Date().toISOString();
    let currentRecord: Interaction;

    try {
      // STEP 1: Persist User-authored draft to Firestore FIRST
      if (activeInteraction && !retryEntry) {
        // Appending new turn
        const newTurn: Turn = {
          user: promptToSend,
          model: 'Analyzing...',
          timestamp,
        };
        currentRecord = {
          ...activeInteraction,
          turns: [...(activeInteraction.turns || []), newTurn],
          aiStatus: 'analyzing',
          updatedAt: timestamp,
        };
      } else if (retryEntry) {
        currentRecord = { ...retryEntry, aiStatus: 'analyzing' };
      } else {
        // Brand new entry
        const interactionId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const titleSnippet = promptToSend.length > 50 ? promptToSend.slice(0, 47) + '...' : promptToSend;
        currentRecord = {
          id: interactionId,
          userId: currentUser.uid,
          title: titleSnippet,
          mode: modeToUse,
          prompt: promptToSend,
          response: '',
          turns: [],
          location: locationToUse || undefined,
          aiStatus: 'pending',
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }

      await saveInteraction(currentUser.uid, currentRecord);
      onInteractionSaved(currentRecord);
      setInputPrompt(''); // Clear input buffer once safely persisted in Firestore
      setSaveStatusText('Saved to Vault. Synthesizing AI reflection...');
    } catch (saveErr: any) {
      console.error('Firestore save failed:', saveErr);
      setErrorMessage('Failed to save to Firestore. Your text is preserved in the editor.');
      setIsSaving(false);
      setSaveStatusText(null);
      return;
    } finally {
      setIsSaving(false);
    }

    // STEP 2: Call Gemini API for reflection and structured insights
    setIsAnalyzing(true);

    const historyPayload = currentRecord.turns?.slice(0, -1) || [];

    try {
      const idToken = await currentUser.getIdToken();

      // Parallelize reflection and insights analysis
      const [reflectRes, analyzeRes] = await Promise.all([
        fetch('/api/gemini/reflect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            prompt: currentRecord.prompt,
            mode: currentRecord.mode,
            history: historyPayload,
          }),
        }),
        fetch('/api/gemini/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            prompt: currentRecord.prompt,
          }),
        }),
      ]);

      if (!reflectRes.ok) {
        throw new Error('Gemini reflection service was unavailable.');
      }

      const reflectData = await reflectRes.json();
      const geminiText = reflectData.response;

      let structuredInsights = currentRecord.insights;
      if (analyzeRes.ok) {
        const analyzeData = await analyzeRes.json();
        structuredInsights = analyzeData.insights;
      }

      // STEP 3: Update Firestore with completed AI output
      const finalizedInteraction: Interaction = {
        ...currentRecord,
        title: structuredInsights?.title || currentRecord.title,
        response: geminiText,
        insights: structuredInsights,
        aiStatus: 'completed',
        updatedAt: new Date().toISOString(),
      };

      await saveInteraction(currentUser.uid, finalizedInteraction);
      onInteractionSaved(finalizedInteraction);
      setSaveStatusText('Vault synced & AI reflection completed.');
      setTimeout(() => setSaveStatusText(null), 3500);
    } catch (aiErr: any) {
      console.warn('Gemini analysis failed after journal save:', aiErr);
      // Mark as failed in Firestore so user can retry anytime
      const failedAiInteraction: Interaction = {
        ...currentRecord,
        aiStatus: 'failed',
        updatedAt: new Date().toISOString(),
      };
      await updateInteraction(currentUser.uid, currentRecord.id, { aiStatus: 'failed' });
      onInteractionSaved(failedAiInteraction);
      setErrorMessage(
        'Journal entry safely saved to your private vault! AI companion reflection was interrupted.'
      );
    } finally {
      setIsAnalyzing(false);
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
      {/* Top Workspace Bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-1 border border-gray-200 text-xs font-medium">
            <button
              id="mode-tab-reflection"
              onClick={() => setCurrentMode('reflection')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                currentMode === 'reflection'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Reflection</span>
            </button>
            <button
              id="mode-tab-summary"
              onClick={() => setCurrentMode('summary')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                currentMode === 'summary'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Summary</span>
            </button>
            <button
              id="mode-tab-brainstorm"
              onClick={() => setCurrentMode('brainstorm')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                currentMode === 'brainstorm'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Brainstorm</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveStatusText && (
            <span className="text-xs text-gray-600 flex items-center gap-1.5 font-medium animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>{saveStatusText}</span>
            </span>
          )}

          {activeInteraction && (
            <button
              onClick={onNewSession}
              className="text-xs text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium transition-colors shadow-xs"
            >
              New Thread
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {!activeInteraction ? (
          /* Empty / Initial State */
          <div className="max-w-2xl mx-auto py-10 sm:py-16 text-center space-y-6">
            <div className="h-14 w-14 bg-black text-white rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Compass className="h-7 w-7 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                What is on your mind today?
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                Reflect freely. Your words are saved instantly to your vault, followed by private AI companion
                reflections, topic extraction, and key action steps.
              </p>
            </div>

            {/* Prompt Starters */}
            <div className="pt-2 text-left space-y-2 max-w-lg mx-auto">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block text-center">
                Select a starter reflection prompt
              </span>
              <div className="grid grid-cols-1 gap-2">
                {PROMPT_STARTERS.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => handlePromptStarter(starter)}
                    className="p-3 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl text-left text-xs sm:text-sm text-gray-800 transition-all shadow-xs flex items-center justify-between group"
                  >
                    <span className="line-clamp-1">{starter}</span>
                    <Sparkles className="h-3.5 w-3.5 text-gray-400 group-hover:text-black shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Interaction View */
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Structured Insights Card (Directive 9 & 4) */}
            {activeInteraction.insights && (
              <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black text-white">
                      Structured AI Insights
                    </span>
                    {activeInteraction.insights.mood && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        <Smile className="h-3 w-3" /> {activeInteraction.insights.mood}
                      </span>
                    )}
                  </div>
                  {activeInteraction.location?.name && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-white px-2.5 py-0.5 rounded-md border border-gray-200">
                      <MapPin className="h-3 w-3 text-rose-500" />
                      <span>{activeInteraction.location.name}</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  {activeInteraction.insights.title}
                </h3>

                {activeInteraction.insights.summary && (
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-white/70 p-3 rounded-xl border border-gray-100">
                    {activeInteraction.insights.summary}
                  </p>
                )}

                {/* Tags & Action Items */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {activeInteraction.insights.topics?.map((topic, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>

                {activeInteraction.insights.actionItems && activeInteraction.insights.actionItems.length > 0 && (
                  <div className="pt-2 border-t border-gray-200/60 space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Extracted Action Next Steps
                    </span>
                    <ul className="space-y-1">
                      {activeInteraction.insights.actionItems.map((act, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-800">
                          <CheckSquare className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Primary Entry Turn */}
            <div className="space-y-4">
              {/* User Prompt Card */}
              <div className="flex flex-col items-end gap-1.5">
                <div className="max-w-[88%] bg-gray-100 text-gray-900 p-4 rounded-2xl rounded-tr-none shadow-xs space-y-1 border border-gray-200/60">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500 pb-1.5 border-b border-gray-200">
                    <span className="font-semibold text-gray-700">You (Journal Entry)</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="h-3 w-3" />
                      {new Date(activeInteraction.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-900 pt-1">
                    {activeInteraction.prompt}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 mr-2 uppercase tracking-wider font-medium">
                  Vault Saved • Isolated
                </span>
              </div>

              {/* Gemini Response Card */}
              {activeInteraction.response ? (
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center shadow-xs">
                      <div className="w-2.5 h-2.5 border border-white rotate-45"></div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      Gemini Companion
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200 uppercase tracking-tight">
                      {activeInteraction.mode}
                    </span>
                  </div>

                  <div className="w-full max-w-[90%] bg-white border border-gray-200 p-5 rounded-2xl rounded-tl-none shadow-xs space-y-3">
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {activeInteraction.response}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        AI Generated Companion Reflection
                      </span>

                      <button
                        onClick={() => handleCopy(activeInteraction.response, 'main-response')}
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-black font-medium transition-colors"
                      >
                        {copiedId === 'main-response' ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
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
              ) : activeInteraction.aiStatus === 'failed' ? (
                /* Failed AI State with Retry Button */
                <div className="w-full max-w-[90%] bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>AI Reflection was interrupted. Your journal text is safely stored.</span>
                  </div>
                  <button
                    id="btn-retry-ai-analysis"
                    onClick={() => handleSendReflection(activeInteraction)}
                    disabled={isAnalyzing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                  >
                    <RefreshCw className={`h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>Retry AI Analysis</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Subsequent Conversation Turns */}
            {activeInteraction.turns?.map((turn, index) => (
              <div key={index} className="space-y-4 pt-2">
                <div className="flex flex-col items-end gap-1.5">
                  <div className="max-w-[88%] bg-gray-100 text-gray-900 p-4 rounded-2xl rounded-tr-none shadow-xs space-y-1 border border-gray-200/60">
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
                </div>

                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center shadow-xs">
                      <div className="w-2.5 h-2.5 border border-white rotate-45"></div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      Gemini Companion
                    </span>
                  </div>

                  <div className="w-full max-w-[90%] bg-white border border-gray-200 p-5 rounded-2xl rounded-tl-none shadow-xs space-y-3">
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {turn.model}
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        Turn {index + 2}
                      </span>
                      <button
                        onClick={() => handleCopy(turn.model, `turn-${index}`)}
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-black font-medium transition-colors"
                      >
                        {copiedId === `turn-${index}` ? (
                          <span className="text-emerald-600 font-semibold">Copied</span>
                        ) : (
                          <span>Copy</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Analyzing Loading Indicator */}
            {isAnalyzing && (
              <div className="flex flex-col items-start gap-1.5 pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-black rounded flex items-center justify-center shadow-xs animate-pulse">
                    <div className="w-2.5 h-2.5 border border-white rotate-45"></div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Gemini Companion
                  </span>
                </div>

                <div className="w-full max-w-[88%] bg-white border border-gray-200 p-5 rounded-2xl rounded-tl-none shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    <span>Synthesizing reflection & insights...</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/6" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error & Feedback Banner */}
      {errorMessage && (
        <div
          id="error-feedback-banner"
          className="mx-4 sm:mx-6 mb-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-3 shadow-xs shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Bottom Input Console */}
      <div className="p-4 sm:p-6 bg-[#F9FAFB] border-t border-gray-200 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Location Chip or Opt-In Bar */}
          <div className="flex items-center justify-between text-xs">
            {currentLocation ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-gray-800 font-medium shadow-xs">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>{currentLocation.name}</span>
                <button
                  onClick={handleRemoveLocation}
                  className="ml-1 text-gray-400 hover:text-gray-700"
                  title="Remove location from this entry"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : isAddingLocation ? (
              <form onSubmit={handleManualLocationSubmit} className="flex items-center gap-2 w-full max-w-md">
                <input
                  type="text"
                  placeholder="Enter place name or city..."
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800"
                >
                  Save Place
                </button>
                <button
                  type="button"
                  onClick={handleCaptureCurrentLocation}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg"
                  title="Use current GPS"
                >
                  Use GPS
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingLocation(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingLocation(true)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors font-medium"
              >
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span>Add Location (Opt-in)</span>
              </button>
            )}

            <span className="text-[11px] text-gray-400 hidden sm:inline">
              Press <kbd className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[10px]">Cmd+Enter</kbd> to submit
            </span>
          </div>

          <div className="relative rounded-2xl border border-gray-300 bg-white focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all shadow-xs">
            <textarea
              ref={textareaRef}
              id="reflection-input-textarea"
              rows={3}
              placeholder={
                activeInteraction
                  ? 'Add a follow-up reflection or inquiry to this thread...'
                  : 'Write your private thoughts, decisions, or daily reflection here...'
              }
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving || isAnalyzing}
              className="w-full p-3.5 text-sm bg-transparent border-0 resize-none focus:outline-none placeholder-gray-400 text-gray-900 leading-relaxed"
            />

            <div className="flex items-center justify-between px-3.5 pb-3 pt-1 border-t border-gray-100">
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                Mode: <strong className="capitalize text-gray-700">{currentMode}</strong>
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  id="btn-submit-reflection"
                  onClick={() => handleSendReflection()}
                  disabled={!inputPrompt.trim() || isSaving || isAnalyzing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Saving to Vault...</span>
                    </>
                  ) : isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Reflecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Save & Reflect</span>
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

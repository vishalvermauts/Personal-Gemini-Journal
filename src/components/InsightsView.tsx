import React, { useState, useMemo } from 'react';
import type { Interaction } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  TrendingUp,
  Calendar,
  CheckSquare,
  Smile,
  BarChart2,
  RefreshCw,
  Clock,
  BookOpen,
  Tag,
  ArrowRight,
} from 'lucide-react';

interface InsightsViewProps {
  interactions: Interaction[];
  onSelectInteraction: (interaction: Interaction) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ interactions, onSelectInteraction }) => {
  const { currentUser } = useAuth();
  const [weeklySynthesis, setWeeklySynthesis] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);

  // Deterministic metrics calculation
  const metrics = useMemo(() => {
    const total = interactions.length;

    // Entries in the past 7 days
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const pastWeekCount = interactions.filter((i) => new Date(i.createdAt).getTime() >= oneWeekAgo).length;

    // Topic frequency
    const topicCounts: Record<string, number> = {};
    interactions.forEach((entry) => {
      entry.insights?.topics?.forEach((topic) => {
        const key = topic.toLowerCase().trim();
        topicCounts[key] = (topicCounts[key] || 0) + 1;
      });
    });
    const sortedTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Mood frequency
    const moodCounts: Record<string, number> = {};
    interactions.forEach((entry) => {
      if (entry.insights?.mood) {
        const mood = entry.insights.mood.trim();
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      }
    });
    const sortedMoods = Object.entries(moodCounts).sort(([, a], [, b]) => b - a);
    const primaryMood = sortedMoods[0] ? sortedMoods[0][0] : 'Reflective';

    // Action items across all entries
    const allActions: Array<{ action: string; entryTitle: string; entry: Interaction }> = [];
    interactions.forEach((entry) => {
      entry.insights?.actionItems?.forEach((item) => {
        allActions.push({
          action: item,
          entryTitle: entry.insights?.title || entry.title || 'Journal Entry',
          entry,
        });
      });
    });

    return {
      total,
      pastWeekCount,
      sortedTopics,
      primaryMood,
      allActions,
    };
  }, [interactions]);

  const handleGenerateSynthesis = async () => {
    if (!currentUser || interactions.length === 0) return;

    setIsSynthesizing(true);
    setSynthesisError(null);

    const recentThemes = metrics.sortedTopics.map(([t]) => t);
    if (recentThemes.length === 0) {
      recentThemes.push('mindfulness', 'reflection', 'focus');
    }

    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/gemini/synthesis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ themes: recentThemes }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate weekly growth synthesis.');
      }

      const data = await response.json();
      setWeeklySynthesis(data.synthesis);
    } catch (err: any) {
      console.error('Synthesis failed:', err);
      setSynthesisError(err.message || 'Failed to synthesize growth insights.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div id="insights-view" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F9FAFB] font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Personal Insights & Growth Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Deterministic analytics and private AI pattern synthesis from your personal journal vault
          </p>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Memories</span>
              <BookOpen className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{metrics.total}</div>
            <p className="text-[11px] text-gray-400">Isolated Firestore documents</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Past 7 Days</span>
              <Calendar className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{metrics.pastWeekCount}</div>
            <p className="text-[11px] text-emerald-600 font-medium">Recent reflection cadence</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Predominant Mood</span>
              <Smile className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-purple-900 truncate">
              {metrics.total > 0 ? metrics.primaryMood : '—'}
            </div>
            <p className="text-[11px] text-gray-400">Aggregated sentiment badge</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Action Items</span>
              <CheckSquare className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{metrics.allActions.length}</div>
            <p className="text-[11px] text-gray-400">Extracted next steps</p>
          </div>
        </div>

        {/* AI Growth Synthesis Card */}
        <div className="bg-gradient-to-br from-black to-gray-900 text-white p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">AI Weekly Growth Synthesis</h3>
                <p className="text-xs text-gray-300">
                  Grounded strictly in your recurring topics; does not expose private entry content
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateSynthesis}
              disabled={isSynthesizing || metrics.total === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 text-xs font-semibold rounded-lg transition-colors shrink-0 shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
              <span>{isSynthesizing ? 'Synthesizing...' : 'Generate Weekly Synthesis'}</span>
            </button>
          </div>

          {weeklySynthesis ? (
            <div className="p-4 bg-white/10 border border-white/10 rounded-xl text-sm leading-relaxed text-gray-100 font-medium">
              "{weeklySynthesis}"
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">
              {metrics.total === 0
                ? 'Log your reflections to generate personalized weekly growth insights.'
                : 'Click "Generate Weekly Synthesis" to request Gemini reflection on your recurring themes.'}
            </p>
          )}

          {synthesisError && <p className="text-xs text-rose-300">{synthesisError}</p>}
        </div>

        {/* Grid: Topics Cloud & Action Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Topics */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-600" />
              <h3 className="font-bold text-gray-900 text-sm">Most Frequent Topics & Themes</h3>
            </div>

            {metrics.sortedTopics.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No topics logged yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {metrics.sortedTopics.map(([topic, count], i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  >
                    <span>#{topic}</span>
                    <span className="px-1.5 py-0.2 bg-gray-200 text-gray-600 rounded-full text-[10px] font-bold">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Items extracted */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Extracted Action Steps ({metrics.allActions.length})</h3>
              </div>
            </div>

            {metrics.allActions.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No action items extracted from reflections yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {metrics.allActions.slice(0, 10).map((act, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectInteraction(act.entry)}
                    className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 cursor-pointer transition-colors space-y-1"
                  >
                    <div className="text-xs font-medium text-gray-900 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <span>{act.action}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 pl-3.5 flex items-center justify-between">
                      <span className="truncate max-w-[200px]">From: {act.entryTitle}</span>
                      <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                        View <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

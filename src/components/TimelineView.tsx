import React, { useState, useMemo } from 'react';
import type { Interaction, ReflectionMode } from '../types';
import {
  Search,
  Calendar,
  Tag,
  MapPin,
  Sparkles,
  BookOpen,
  FileText,
  Lightbulb,
  ArrowUpDown,
  Filter,
  Trash2,
  ExternalLink,
  Smile,
  CheckCircle2,
} from 'lucide-react';

interface TimelineViewProps {
  interactions: Interaction[];
  onSelectInteraction: (interaction: Interaction) => void;
  onDeleteInteraction: (id: string) => Promise<void>;
  onNewSession: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  interactions,
  onSelectInteraction,
  onDeleteInteraction,
  onNewSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<Interaction | null>(null);

  // Extract unique topics for filter dropdown
  const allTopics = useMemo(() => {
    const topicsSet = new Set<string>();
    interactions.forEach((i) => {
      i.insights?.topics?.forEach((t) => topicsSet.add(t.toLowerCase()));
    });
    return Array.from(topicsSet).sort();
  }, [interactions]);

  // Filtered and sorted interactions
  const filteredInteractions = useMemo(() => {
    return interactions
      .filter((item) => {
        // Mode filter
        if (selectedMode !== 'all' && item.mode !== selectedMode) {
          return false;
        }

        // Topic filter
        if (selectedTopic !== 'all') {
          const hasTopic = item.insights?.topics?.some(
            (t) => t.toLowerCase() === selectedTopic.toLowerCase()
          );
          if (!hasTopic) return false;
        }

        // Text search (title, prompt, response, summary, tags, location)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchPrompt = item.prompt?.toLowerCase().includes(q);
          const matchResponse = item.response?.toLowerCase().includes(q);
          const matchSummary = item.insights?.summary?.toLowerCase().includes(q);
          const matchLocation = item.location?.name?.toLowerCase().includes(q);
          const matchTopic = item.insights?.topics?.some((t) => t.toLowerCase().includes(q));
          const matchMood = item.insights?.mood?.toLowerCase().includes(q);

          if (
            !matchTitle &&
            !matchPrompt &&
            !matchResponse &&
            !matchSummary &&
            !matchLocation &&
            !matchTopic &&
            !matchMood
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [interactions, selectedMode, selectedTopic, searchQuery, sortOrder]);

  const getModeBadge = (mode: ReflectionMode) => {
    switch (mode) {
      case 'summary':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <FileText className="h-3 w-3" /> Summary
          </span>
        );
      case 'brainstorm':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Lightbulb className="h-3 w-3" /> Brainstorm
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <BookOpen className="h-3 w-3" /> Reflection
          </span>
        );
    }
  };

  return (
    <div id="timeline-view" className="flex-1 flex flex-col h-full bg-[#F9FAFB] overflow-hidden font-sans">
      {/* Top Filter Bar */}
      <div className="bg-white border-b border-gray-200 p-4 sm:px-6 shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Timeline & Memory Search</h1>
            <p className="text-xs text-gray-500">
              Chronological vault of your thoughts, reflections, and AI-synthesized insights
            </p>
          </div>

          <button
            id="btn-timeline-new-entry"
            onClick={onNewSession}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-xs"
          >
            <span>Write New Memory</span>
          </button>
        </div>

        {/* Search and Filters Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
          {/* Search bar */}
          <div className="relative sm:col-span-6">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              id="timeline-search-input"
              type="text"
              placeholder="Search memories by topic, text, mood, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Mode Selector */}
          <div className="sm:col-span-3">
            <select
              id="timeline-mode-filter"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            >
              <option value="all">All Reflection Modes</option>
              <option value="reflection">Reflection</option>
              <option value="summary">Summary</option>
              <option value="brainstorm">Brainstorm</option>
            </select>
          </div>

          {/* Topic Selector */}
          <div className="sm:col-span-2">
            <select
              id="timeline-topic-filter"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-black focus:border-black truncate"
            >
              <option value="all">All Topics ({allTopics.length})</option>
              {allTopics.map((topic) => (
                <option key={topic} value={topic}>
                  #{topic}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order Toggle */}
          <div className="sm:col-span-1 flex items-center">
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg flex items-center justify-center gap-1 transition-colors"
              title={`Sort ${sortOrder === 'desc' ? 'Oldest first' : 'Newest first'}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4">
        {filteredInteractions.length === 0 ? (
          <div className="max-w-md mx-auto py-16 text-center space-y-3">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto" />
            <h3 className="text-base font-semibold text-gray-800">
              {searchQuery || selectedMode !== 'all' || selectedTopic !== 'all'
                ? 'No matching memories found'
                : 'Your Timeline is currently empty'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || selectedMode !== 'all' || selectedTopic !== 'all'
                ? 'Try adjusting your search keywords or resetting filters.'
                : 'Start logging your daily thoughts and reflections to build your private personal timeline.'}
            </p>
            <button
              onClick={onNewSession}
              className="mt-2 px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Write First Reflection
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">
              Showing {filteredInteractions.length} {filteredInteractions.length === 1 ? 'memory' : 'memories'}
            </div>

            {filteredInteractions.map((entry) => {
              const formattedDate = new Date(entry.createdAt).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedTime = new Date(entry.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <article
                  key={entry.id}
                  id={`timeline-card-${entry.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:border-gray-300 transition-all space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getModeBadge(entry.mode)}
                        {entry.location?.name && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            <MapPin className="h-3 w-3 text-rose-500" />
                            <span className="truncate max-w-[150px]">{entry.location.name}</span>
                          </span>
                        )}
                        {entry.insights?.mood && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-medium">
                            <Smile className="h-3 w-3" /> {entry.insights.mood}
                          </span>
                        )}
                      </div>

                      <h2
                        onClick={() => onSelectInteraction(entry)}
                        className="text-base font-bold text-gray-900 hover:text-black cursor-pointer tracking-tight"
                      >
                        {entry.insights?.title || entry.title || 'Untitled Memory'}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-gray-400">
                        {formattedDate} • {formattedTime}
                      </span>
                      <button
                        onClick={() => onDeleteInteraction(entry.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete memory"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary / User Prompt snippet */}
                  <div className="text-xs sm:text-sm text-gray-700 leading-relaxed space-y-2">
                    {entry.insights?.summary ? (
                      <p className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-gray-800 font-medium">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                          AI Executive Summary
                        </span>
                        {entry.insights.summary}
                      </p>
                    ) : (
                      <p className="line-clamp-3 text-gray-600">{entry.prompt}</p>
                    )}
                  </div>

                  {/* Topics and Actions Footer */}
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {entry.insights?.topics?.map((topic, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedTopic(topic.toLowerCase())}
                          className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium transition-colors"
                        >
                          #{topic}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => onSelectInteraction(entry)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900 hover:underline ml-auto"
                    >
                      <span>Open in Workspace</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

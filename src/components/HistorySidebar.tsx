import React, { useState } from 'react';
import type { Interaction, ReflectionMode } from '../types';
import {
  PlusCircle,
  Search,
  BookOpen,
  FileText,
  Lightbulb,
  Trash2,
  Calendar,
  MessageSquare,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface HistorySidebarProps {
  interactions: Interaction[];
  selectedId: string | null;
  onSelect: (interaction: Interaction) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void>;
  loading: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  interactions,
  selectedId,
  onSelect,
  onNew,
  onDelete,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter and search interactions
  const filteredInteractions = interactions.filter((item) => {
    const matchesFilter =
      selectedFilter === 'all' || item.mode === selectedFilter;

    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const titleMatch = item.title?.toLowerCase().includes(q);
    const promptMatch = item.prompt?.toLowerCase().includes(q);
    const responseMatch = item.response?.toLowerCase().includes(q);
    return titleMatch || promptMatch || responseMatch;
  });

  const getModeIcon = (mode: ReflectionMode) => {
    switch (mode) {
      case 'summary':
        return <FileText className="h-3.5 w-3.5 text-blue-600" />;
      case 'brainstorm':
        return <Lightbulb className="h-3.5 w-3.5 text-amber-600" />;
      default:
        return <BookOpen className="h-3.5 w-3.5 text-emerald-600" />;
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this reflection entry? This cannot be undone.')) {
      setDeletingId(id);
      try {
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <aside
      id="history-sidebar"
      className="w-full md:w-72 lg:w-80 flex flex-col bg-white border-r border-gray-200 h-full overflow-hidden shrink-0 font-sans"
    >
      {/* Sidebar Header & New Button */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <button
          id="btn-new-reflection"
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-black hover:bg-gray-800 text-white font-medium text-sm rounded-md shadow-xs transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Session</span>
        </button>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            id="history-search-input"
            type="text"
            placeholder="Search past entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Mode Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedFilter === 'all'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            All ({interactions.length})
          </button>
          <button
            onClick={() => setSelectedFilter('reflection')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedFilter === 'reflection'
                ? 'bg-gray-100 text-gray-900 font-semibold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            Reflections
          </button>
          <button
            onClick={() => setSelectedFilter('summary')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedFilter === 'summary'
                ? 'bg-gray-100 text-gray-900 font-semibold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            Summaries
          </button>
          <button
            onClick={() => setSelectedFilter('brainstorm')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedFilter === 'brainstorm'
                ? 'bg-gray-100 text-gray-900 font-semibold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            Brainstorm
          </button>
        </div>
      </div>

      {/* Recent History Section Header */}
      <div className="px-4 pt-3 pb-1">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Recent History
        </h3>
      </div>

      {/* Interaction List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="space-y-3 p-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-lg border border-gray-100" />
            ))}
          </div>
        ) : filteredInteractions.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto" />
            <p className="text-sm font-medium text-gray-600">
              {searchQuery ? 'No matching reflections found.' : 'No reflections logged yet.'}
            </p>
            <p className="text-xs text-gray-400">
              {searchQuery
                ? 'Try a different search keyword.'
                : 'Write your first thought to begin with Gemini.'}
            </p>
          </div>
        ) : (
          filteredInteractions.map((item) => {
            const isSelected = item.id === selectedId;
            const turnCount = (item.turns?.length || 0) + 1;
            const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                onClick={() => onSelect(item)}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-gray-100 border-gray-300 shadow-xs'
                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0">{getModeIcon(item.mode)}</span>
                    <h4 className="text-xs font-semibold text-gray-900 truncate">
                      {item.title || 'Untitled Entry'}
                    </h4>
                  </div>

                  <button
                    id={`btn-delete-${item.id}`}
                    onClick={(e) => handleDeleteClick(e, item.id)}
                    disabled={deletingId === item.id}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-gray-400 hover:text-rose-600 rounded transition-opacity"
                    title="Delete reflection"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>

                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    {formattedDate}
                  </span>

                  <span className="flex items-center gap-1 font-medium text-gray-500">
                    <MessageSquare className="h-3 w-3 text-gray-400" />
                    {turnCount} {turnCount === 1 ? 'turn' : 'turns'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

'use client';

import { X, BookOpen, Brain, Dumbbell, Clock, Calendar } from 'lucide-react';
import { useEffect } from 'react';

interface FocusPanelProps {
  isOpen: boolean;
  topicId: string | null;
  topicTitle: string | null;
  masteryLevel: 'learning' | 'developing' | 'mastered';
  masteryScore: number;
  dueDate: string | null;
  lastStudied: string | null;
  onClose: () => void;
  onAction: (action: string) => void;
}

const badgeColors = {
  learning: 'bg-slate-700/60 text-slate-300 border-slate-600/50',
  developing: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  mastered: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50',
} as const;

const progressColors = {
  learning: 'bg-slate-500',
  developing: 'bg-amber-500',
  mastered: 'bg-indigo-500',
} as const;

function getDueDateColor(dueDate: string | null): string {
  if (!dueDate) return 'text-slate-500';
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'text-red-400';
  if (diffDays <= 2) return 'text-amber-400';
  return 'text-slate-300';
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return 'No review scheduled';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays} days`;
}

const actions = [
  { id: 'study', label: 'Study This Topic', icon: BookOpen, description: 'Deep dive with your AI tutor' },
  { id: 'quiz', label: 'Quick Quiz', icon: Brain, description: 'Test your understanding' },
  { id: 'practice', label: 'Practice Problems', icon: Dumbbell, description: 'Apply what you know' },
];

export function FocusPanel({
  isOpen,
  topicId,
  topicTitle,
  masteryLevel,
  masteryScore,
  dueDate,
  lastStudied,
  onClose,
  onAction,
}: FocusPanelProps) {
  // Handle Escape key to close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Restore focus on close
  useEffect(() => {
    if (isOpen) {
      const previouslyFocusedElement = document.activeElement as HTMLElement;
      return () => {
        if (previouslyFocusedElement) {
          previouslyFocusedElement.focus();
        }
      };
    }
  }, [isOpen]);

  if (!topicId || !topicTitle) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-panel-title"
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-[420px] lg:w-[460px]
                   bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl
                   transition-transform duration-300 ease-in-out
                   ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="border-b border-slate-800 p-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="focus-panel-title" className="text-lg font-semibold text-slate-100 truncate">
              {topicTitle}
            </h2>
            <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeColors[masteryLevel]}`}>
              {masteryLevel.charAt(0).toUpperCase() + masteryLevel.slice(1)}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close focus panel"
            className="p-2 -m-2 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto h-[calc(100vh-88px)]">
          {/* Mastery Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Mastery</span>
              <span className="text-sm font-medium text-slate-200">{Math.round(masteryScore)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColors[masteryLevel]}`}
                style={{ width: `${Math.min(100, Math.max(0, masteryScore))}%` }}
              />
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-500">Last Studied</span>
              </div>
              <p className="text-sm text-slate-300">{formatRelativeDate(lastStudied)}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-500">Review</span>
              </div>
              <p className={`text-sm ${getDueDateColor(dueDate)}`}>{formatDueDate(dueDate)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</span>
            <div className="space-y-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => onAction(action.id)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group"
                >
                  <div className="p-2 bg-slate-800/60 rounded-lg group-hover:bg-indigo-900/30 transition-colors">
                    <action.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-200">{action.label}</p>
                    <p className="text-xs text-slate-500">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

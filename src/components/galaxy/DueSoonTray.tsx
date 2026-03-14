'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  course_name: string | null;
  due_date: string | null;
  study_topic_id: string | null;
}

interface DueSoonTrayProps {
  profileId: string;
  onSelectTopic: (topicId: string, topicTitle: string) => void;
}

function getDueDateColor(dueDate: string | null): string {
  if (!dueDate) return 'text-slate-400';
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'text-red-400';
  if (diffDays <= 2) return 'text-amber-400';
  return 'text-slate-300';
}

function formatDueLabel(dueDate: string | null): string {
  if (!dueDate) return 'No due date';
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Tomorrow';
  return `${diffDays}d left`;
}

export function DueSoonTray({ profileId, onSelectTopic }: DueSoonTrayProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch(`/api/assignments/due-soon?profileId=${profileId}`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.assignments || []);
        }
      } catch (err) {
        console.error('[DueSoonTray] Failed to fetch:', err);
      }
    }
    fetchAssignments();
  }, [profileId]);

  if (assignments.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur border-t border-slate-800">
      <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span className="text-xs text-slate-500 font-medium flex-shrink-0">Due Soon</span>
        {assignments.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              if (a.study_topic_id) {
                onSelectTopic(a.study_topic_id, a.title);
              }
            }}
            disabled={!a.study_topic_id}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-default border border-slate-700/50 rounded-lg transition-colors"
          >
            <span className="text-sm text-slate-200 truncate max-w-[180px]">{a.title}</span>
            {a.course_name && (
              <span className="text-xs text-slate-500 truncate max-w-[100px]">{a.course_name}</span>
            )}
            <span className={`text-xs font-medium flex-shrink-0 ${getDueDateColor(a.due_date)}`}>
              {formatDueLabel(a.due_date)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

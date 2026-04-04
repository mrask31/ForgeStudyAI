'use client';

import { useState, useEffect } from 'react';
import { X, CalendarDays, BookOpen, FileText, StickyNote } from 'lucide-react';

const SUBJECTS = [
  'Math',
  'Science',
  'English/ELA',
  'History',
  'Foreign Language',
  'Art',
  'Other',
];

export interface ManualAssignment {
  id: string;
  title: string;
  course_name: string | null;
  due_date: string | null;
  notes: string | null;
  is_complete: boolean;
  created_at: string;
}

interface AddAssignmentModalProps {
  profileId: string;
  editing?: ManualAssignment | null;
  onSave: (assignment: ManualAssignment) => void;
  onClose: () => void;
}

export function AddAssignmentModal({ profileId, editing, onSave, onClose }: AddAssignmentModalProps) {
  const [title, setTitle] = useState('');
  const [courseName, setCourseName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setCourseName(editing.course_name || '');
      setDueDate(editing.due_date ? editing.due_date.slice(0, 16) : '');
      setNotes(editing.notes || '');
    }
  }, [editing]);

  async function handleSave() {
    if (!title.trim()) {
      setError('Assignment name is required.');
      return;
    }
    if (!dueDate) {
      setError('Due date is required.');
      return;
    }
    setError('');
    setSaving(true);

    try {
      let res: Response;
      if (editing) {
        res = await fetch(`/api/manual-assignments/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, course_name: courseName, due_date: dueDate, notes }),
        });
      } else {
        res = await fetch('/api/manual-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: profileId, title, course_name: courseName, due_date: dueDate, notes }),
        });
      }

      if (!res.ok) {
        setError('Failed to save. Please try again.');
        return;
      }

      const data = await res.json();
      onSave(data.assignment);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">
            {editing ? 'Edit Assignment' : 'Add Assignment'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Assignment name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <FileText className="w-3.5 h-3.5" />
              Assignment Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 5 Review"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <BookOpen className="w-3.5 h-3.5" />
              Subject
            </label>
            <input
              type="text"
              list="assignment-subjects"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Choose or type a subject..."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <datalist id="assignment-subjects">
              {SUBJECTS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <CalendarDays className="w-3.5 h-3.5" />
              Due Date *
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 [color-scheme:dark]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <StickyNote className="w-3.5 h-3.5" />
              Notes <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What do you need to study?"
              rows={2}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}

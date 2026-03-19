'use client';

import { useRouter } from 'next/navigation';

interface HelperChipsProps {
  topics: { id: string; title: string; mastery_score: number; orbit_state: number; last_studied_at: string | null; next_review_date: string | null }[];
  profileId: string | null;
}

interface Chip {
  label: string;
  action: string;
}

export function HelperChips({ topics, profileId }: HelperChipsProps) {
  const router = useRouter();

  const chips = generateChips(topics);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {chips.slice(0, 3).map((chip, i) => (
        <button
          key={i}
          onClick={() => router.push(chip.action)}
          className="inline-flex items-center rounded-full border border-slate-600/50 bg-slate-800/40 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-slate-300 transition-all duration-200 hover:border-indigo-500/40 hover:bg-slate-700/60 hover:text-slate-100"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

function generateChips(topics: HelperChipsProps['topics']): Chip[] {
  const chips: Chip[] = [];

  // If no topics or no study history → first session chips
  const hasStudied = topics.some(t => t.last_studied_at);

  if (!hasStudied || topics.length === 0) {
    return [
      { label: 'I have a test coming up', action: '/tutor?mode=exam-prep' },
      { label: 'Help me understand something', action: '/tutor' },
      { label: 'Review what I studied last time', action: '/tutor?mode=review' },
    ];
  }

  // Returning user — personalized chips

  // 1. Due soon / overdue topics
  const now = Date.now();
  const dueSoon = topics.filter(t => {
    if (!t.next_review_date) return false;
    const diff = new Date(t.next_review_date).getTime() - now;
    return diff <= 48 * 60 * 60 * 1000; // within 48 hours (including overdue)
  });
  if (dueSoon.length > 0) {
    chips.push({
      label: `Review ${dueSoon.length} due topic${dueSoon.length > 1 ? 's' : ''}`,
      action: '/vault',
    });
  }

  // 2. Last studied topic — continue where you left off
  const withStudied = topics
    .filter(t => t.last_studied_at)
    .sort((a, b) => new Date(b.last_studied_at!).getTime() - new Date(a.last_studied_at!).getTime());
  if (withStudied.length > 0) {
    const last = withStudied[0];
    const truncated = last.title.length > 25 ? last.title.slice(0, 25) + '...' : last.title;
    chips.push({
      label: `Continue: ${truncated}`,
      action: `/tutor?topicId=${last.id}&topicTitle=${encodeURIComponent(last.title)}`,
    });
  }

  // 3. Lowest mastery topic — needs work
  const lowMastery = topics
    .filter(t => t.orbit_state >= 1 && (t.mastery_score || 0) < 30)
    .sort((a, b) => (a.mastery_score || 0) - (b.mastery_score || 0));
  if (lowMastery.length > 0 && chips.length < 3) {
    const weak = lowMastery[0];
    const truncated = weak.title.length > 25 ? weak.title.slice(0, 25) + '...' : weak.title;
    chips.push({
      label: `Practice: ${truncated}`,
      action: `/tutor?topicId=${weak.id}&topicTitle=${encodeURIComponent(weak.title)}`,
    });
  }

  // 4. Ghost nodes — memory decay
  const ghosts = topics.filter(t => t.orbit_state === 3);
  if (ghosts.length > 0 && chips.length < 3) {
    chips.push({
      label: `${ghosts.length} fading memor${ghosts.length === 1 ? 'y' : 'ies'}`,
      action: '/vault',
    });
  }

  // Fill remaining with general actions
  if (chips.length < 3) {
    chips.push({ label: 'Ask your tutor anything', action: '/tutor' });
  }

  return chips.slice(0, 3);
}

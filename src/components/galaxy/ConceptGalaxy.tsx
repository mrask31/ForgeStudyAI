'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { FocusPanel } from './FocusPanel';
import { DueSoonTray } from './DueSoonTray';

interface Topic {
  id: string;
  title: string;
  mastery_score: number;
  orbit_state: number;
  next_review_date?: string | null;
  updated_at?: string | null;
  last_studied_at?: string | null;
}

interface CoursePlanet {
  courseId: string;
  courseName: string;
  topicCount: number;
  avgMastery: number;
  topics: { id: string; title: string; mastery_score: number; orbit_state: number; next_review_date: string | null; last_studied_at: string | null }[];
}

interface ConceptGalaxyProps {
  topics: Topic[];
  coursePlanets?: CoursePlanet[];
  studentName?: string;
  profileId?: string;
  totalTopicCount?: number;
  onDueSoonChange?: (hasDueSoon: boolean) => void;
  onTopicsRefresh?: () => void;
  onDrillDownChange?: (isInDrillDown: boolean) => void;
}

const ORBIT_RADIUS = 200; // px — constant, room for pill-shaped nodes
const ORBIT_RADIUS_MOBILE = 130;

function getNodeColor(orbitState: number): string {
  if (orbitState === 3) return '#94a3b8';
  if (orbitState === 2) return '#6366f1';
  if (orbitState === 1) return '#f59e0b';
  return '#64748b';
}

function getMasteryColor(score: number): string {
  if (score >= 70) return '#6366f1';
  if (score >= 30) return '#f59e0b';
  return '#64748b';
}

export function ConceptGalaxy({ topics, coursePlanets, studentName, profileId, totalTopicCount = 0, onDueSoonChange, onTopicsRefresh, onDrillDownChange }: ConceptGalaxyProps) {
  const router = useRouter();

  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const hasPlanets = (coursePlanets?.length ?? 0) > 0;
  const showPlanetView = hasPlanets && !expandedCourseId;
  const expandedPlanet = expandedCourseId ? coursePlanets?.find(p => p.courseId === expandedCourseId) : null;

  const [focusPanelState, setFocusPanelState] = useState({
    isOpen: false,
    selectedTopicId: null as string | null,
    selectedTopicTitle: null as string | null,
    courseId: null as string | null,
    masteryScore: 0,
    dueDate: null as string | null,
    lastStudied: null as string | null,
  });

  // Notify parent of drill-down state
  const setExpanded = (id: string | null) => {
    setExpandedCourseId(id);
    onDrillDownChange?.(id !== null);
  };

  // Build the list of orbiting items
  type OrbitItem = { id: string; label: string; color: string; size: number; isPlanet?: boolean; mastery: number; orbitState: number; dueDate?: string | null; lastStudied?: string | null };
  let orbitItems: OrbitItem[] = [];
  let anchorLabel = studentName || 'My Galaxy';

  if (showPlanetView) {
    orbitItems = (coursePlanets || []).map(p => ({
      id: `planet_${p.courseId}`,
      label: p.courseName,
      color: getMasteryColor(p.avgMastery),
      size: 40 + p.topicCount * 6,
      isPlanet: true,
      mastery: p.avgMastery,
      orbitState: 1,
    }));
  } else if (expandedPlanet) {
    anchorLabel = expandedPlanet.courseName;
    orbitItems = expandedPlanet.topics.map(t => ({
      id: t.id,
      label: t.title,
      color: getNodeColor(t.orbit_state),
      size: 36 + (t.mastery_score || 0) / 5,
      mastery: t.mastery_score || 0,
      orbitState: t.orbit_state,
      dueDate: t.next_review_date,
      lastStudied: t.last_studied_at,
    }));
  } else {
    orbitItems = topics.map(t => ({
      id: t.id,
      label: t.title,
      color: getNodeColor(t.orbit_state),
      size: 36 + (t.mastery_score || 0) / 5,
      mastery: t.mastery_score || 0,
      orbitState: t.orbit_state,
      dueDate: t.next_review_date,
      lastStudied: t.last_studied_at || t.updated_at,
    }));
  }

  const handleNodeClick = (item: OrbitItem) => {
    if (item.isPlanet) {
      const courseId = item.id.replace('planet_', '');
      // Navigate to Course Workspace
      router.push(`/courses/${courseId}`);
      return;
    }
    const topic = (expandedPlanet ? expandedPlanet.topics : topics).find(t => t.id === item.id);
    setFocusPanelState({
      isOpen: true,
      selectedTopicId: item.id,
      selectedTopicTitle: item.label,
      courseId: expandedCourseId,
      masteryScore: item.mastery,
      dueDate: topic?.next_review_date ?? null,
      lastStudied: topic?.last_studied_at ?? null,
    });
  };

  const handleCloseFocusPanel = () => {
    setFocusPanelState({ isOpen: false, selectedTopicId: null, selectedTopicTitle: null, courseId: null, masteryScore: 0, dueDate: null, lastStudied: null });
  };

  // Empty state
  if (topics.length === 0 && !hasPlanets) {
    const hasAnyTopicsInDb = totalTopicCount > 0;

    return (
      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-6 max-w-md">
          {hasAnyTopicsInDb ? (
            <>
              <Sparkles className="w-12 h-12 text-indigo-400" />
              <h2 className="text-xl font-semibold text-slate-100 text-center">Your topics are ready to explore!</h2>
              <p className="text-sm text-slate-400 text-center">{totalTopicCount} topic{totalTopicCount !== 1 ? 's' : ''} uploaded. Tap the button below to start studying.</p>
              <button onClick={() => router.push('/tutor')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 w-full font-medium transition-colors">Start Studying</button>
            </>
          ) : (
            <>
              <Sparkles className="w-12 h-12 text-indigo-400" />
              <h2 className="text-xl font-semibold text-slate-100 text-center">Your Galaxy is waiting.</h2>
              <p className="text-sm text-slate-400 text-center">Upload study materials to build your Learning Galaxy.</p>
              <div className="flex flex-col gap-3 w-full">
                <button onClick={() => router.push('/sources')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 w-full font-medium transition-colors">Upload Materials</button>
                <button onClick={() => router.push('/tutor')} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-xl px-6 py-3 w-full font-medium transition-all">Ask Your Tutor</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Detect mobile for orbit radius
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const radius = isMobile ? ORBIT_RADIUS_MOBILE : ORBIT_RADIUS;

  return (
    <div className="w-full h-full relative bg-slate-950 overflow-hidden">
      {/* Back button for drill-down */}
      {expandedCourseId && expandedPlanet && (
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-50">
          <button
            onClick={() => setExpanded(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            &larr; Courses
          </button>
        </div>
      )}

      {/* SVG connector lines — absolutely positioned, drawn from center to each node */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {orbitItems.map((item, i) => {
          const angle = (i / orbitItems.length) * 2 * Math.PI - Math.PI / 2;
          const endXPct = 50 + (Math.cos(angle) * radius / 4); // approximate % for SVG
          const endYPct = 50 + (Math.sin(angle) * radius / 4);
          return (
            <line
              key={item.id}
              x1="50%" y1="50%"
              x2={`${endXPct}%`} y2={`${endYPct}%`}
              stroke="rgba(99, 102, 241, 0.2)"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>

      {/* Anchor node — centered */}
      <div
        className="absolute z-10"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <div className="relative flex items-center justify-center">
          {/* Outer glow */}
          <div className="absolute rounded-full bg-indigo-500/5" style={{ width: 120, height: 120, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          {/* Inner glow */}
          <div className="absolute rounded-full bg-indigo-500/10" style={{ width: 96, height: 96, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          {/* Core — pill shape to fit long names */}
          <div className="bg-indigo-400 border-2 border-white/20 flex items-center justify-center shadow-lg shadow-indigo-500/20 z-10 rounded-full px-5 py-3 min-w-[80px]">
            <span className="text-white font-bold text-sm text-center leading-tight whitespace-nowrap">
              {anchorLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Orbit nodes — positioned radially using CSS */}
      {orbitItems.map((item, i) => {
        const angle = (i / orbitItems.length) * 2 * Math.PI - Math.PI / 2;
        const offsetX = Math.cos(angle) * radius;
        const offsetY = Math.sin(angle) * radius;

        return (
          <button
            key={item.id}
            onClick={() => handleNodeClick(item)}
            className="absolute z-10 group transition-transform duration-200 hover:scale-110 focus:outline-none"
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
            }}
          >
            {/* Glow ring */}
            <div
              className="absolute inset-[-6px] rounded-full opacity-25 group-hover:opacity-50 transition-opacity"
              style={{ backgroundColor: item.color, filter: 'blur(10px)' }}
            />
            {/* Node — pill shape to fit full title */}
            <div
              className="relative rounded-full flex items-center justify-center border border-white/10 shadow-lg px-4 py-2 min-w-[60px]"
              style={{
                backgroundColor: item.color,
                opacity: item.orbitState === 3 ? 0.5 : 1,
              }}
            >
              <span className="text-white text-xs font-medium text-center leading-tight whitespace-nowrap">
                {item.label}
              </span>
            </div>
            {/* Mastery badge */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-[10px] text-slate-400">{item.mastery}%</span>
            </div>
            {/* Quick Study button for planets */}
            {item.isPlanet && (
              <div
                className="absolute -bottom-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  const courseId = item.id.replace('planet_', '')
                  router.push(`/tutor?classId=${courseId}&intent=new_question`)
                }}
              >
                <span className="text-[9px] text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap cursor-pointer">
                  Study Now →
                </span>
              </div>
            )}
          </button>
        );
      })}

      {/* Due Soon Tray */}
      {profileId && (
        <DueSoonTray
          profileId={profileId}
          onItemsLoaded={(hasItems) => onDueSoonChange?.(hasItems)}
          onSelectTopic={(topicId, topicTitle) => {
            const topic = topics.find(t => t.id === topicId);
            setFocusPanelState({
              isOpen: true,
              selectedTopicId: topicId,
              selectedTopicTitle: topicTitle,
              courseId: expandedCourseId,
              masteryScore: topic?.mastery_score ?? 0,
              dueDate: topic?.next_review_date ?? null,
              lastStudied: topic?.last_studied_at ?? topic?.updated_at ?? null,
            });
          }}
        />
      )}

      {/* Focus Panel */}
      <FocusPanel
        isOpen={focusPanelState.isOpen}
        topicId={focusPanelState.selectedTopicId}
        topicTitle={focusPanelState.selectedTopicTitle}
        masteryScore={focusPanelState.masteryScore}
        masteryLevel={
          (focusPanelState.masteryScore >= 70 ? 'mastered' :
          focusPanelState.masteryScore >= 30 ? 'developing' : 'learning') as 'learning' | 'developing' | 'mastered'
        }
        dueDate={focusPanelState.dueDate}
        lastStudied={focusPanelState.lastStudied}
        onClose={handleCloseFocusPanel}
        isActionLoading={isCreatingSession}
        onAction={async (action: string) => {
          if (!focusPanelState.selectedTopicId || !focusPanelState.selectedTopicTitle) return;

          const topicId = focusPanelState.selectedTopicId;
          const topicTitle = focusPanelState.selectedTopicTitle;
          const classId = focusPanelState.courseId;

          // Build the opening prompt that the AI will respond to
          const openingPrompt = `I want to study ${topicTitle}. Please explain it step by step at my level and then quiz me with practice questions.`;

          setIsCreatingSession(true);
          try {
            const body: Record<string, unknown> = {
              intent: 'new_question',
              topicId,
              topicTitle,
            };
            if (classId) body.classId = classId;

            const res = await fetch('/api/chats/resolve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error('Failed to create session');
            const { chatId } = await res.json();
            if (!chatId) throw new Error('No chatId returned');

            // Store message so ClinicalTutorWorkspace auto-sends it on mount
            localStorage.setItem('forgestudy-tutor-prefill', openingPrompt);
            localStorage.setItem('forgestudy-tutor-auto-send', 'true');

            const params = new URLSearchParams({ topicId, topicTitle, sessionId: chatId });
            if (classId) params.set('classId', classId);
            router.push(`/tutor?${params.toString()}`);
          } catch {
            toast.error('Could not start session. Please try again.');
          } finally {
            setIsCreatingSession(false);
          }
        }}
      />
    </div>
  );
}

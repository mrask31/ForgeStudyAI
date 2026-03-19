'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, TrendingUp, Play } from 'lucide-react';
import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { getCourseDetail, type CourseDetail } from '@/app/actions/courses';

export default function CourseWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const { activeProfileId } = useActiveProfile();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfileId || !courseId) return;
    setLoading(true);
    getCourseDetail(activeProfileId, courseId)
      .then(setCourse)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProfileId, courseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Course not found.</div>
      </div>
    );
  }

  const avgMastery = course.topics.length > 0
    ? Math.round(course.topics.reduce((s, t) => s + (t.mastery_score || 0), 0) / course.topics.length)
    : 0;

  const upcomingAssignments = course.assignments
    .filter(a => a.due_date && new Date(a.due_date) > new Date())
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">{course.courseName}</h1>
          <p className="text-sm text-slate-400">
            {course.topics.length} topic{course.topics.length !== 1 ? 's' : ''} &middot; {course.assignments.length} assignment{course.assignments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            const topicParam = course.topics[0]?.id ? `&topicId=${course.topics[0].id}` : '';
            router.push(`/tutor?courseContext=${encodeURIComponent(course.courseName)}${topicParam}`);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          Continue Studying
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Mastery
          </div>
          <p className="text-2xl font-bold">{avgMastery}%</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            Topics
          </div>
          <p className="text-2xl font-bold">{course.topics.length}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            Sessions
          </div>
          <p className="text-2xl font-bold">{course.sessions.length}</p>
        </div>
      </div>

      {/* Mastery Progress Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-medium text-slate-300 mb-3">Course Progress</h2>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${avgMastery}%`,
              backgroundColor: avgMastery >= 70 ? '#6366f1' : avgMastery >= 30 ? '#f59e0b' : '#64748b',
            }}
          />
        </div>
      </div>

      {/* Upcoming Due Dates */}
      {upcomingAssignments.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Upcoming Due Dates</h2>
          <div className="space-y-2">
            {upcomingAssignments.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-200 truncate flex-1 mr-3">{a.title}</span>
                <span className="text-slate-400 whitespace-nowrap text-xs">
                  {new Date(a.due_date!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic Nodes */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-medium text-slate-300 mb-3">Assignment Topics</h2>
        <div className="space-y-2">
          {course.topics.map(topic => (
            <button
              key={topic.id}
              onClick={() => router.push(`/tutor?topicId=${topic.id}&topicTitle=${encodeURIComponent(topic.title)}`)}
              className="w-full flex items-center gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-lg hover:border-indigo-500/40 transition-colors text-left"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: topic.orbit_state === 3 ? '#94a3b8'
                    : topic.orbit_state === 2 ? '#6366f1'
                    : (topic.mastery_score || 0) >= 70 ? '#6366f1'
                    : (topic.mastery_score || 0) >= 30 ? '#f59e0b'
                    : '#64748b',
                }}
              />
              <span className="flex-1 text-sm text-slate-200 truncate">{topic.title}</span>
              <span className="text-xs text-slate-400">{topic.mastery_score || 0}%</span>
              {topic.last_studied_at && (
                <span className="text-xs text-slate-500">
                  {new Date(topic.last_studied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
            </button>
          ))}
          {course.topics.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No topics synced yet for this course.</p>
          )}
        </div>
      </div>

      {/* Session History */}
      {course.sessions.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {course.sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm p-2 bg-slate-950/40 rounded-lg">
                <span className="text-slate-300">
                  {s.topics_passed} passed, {s.topics_failed} failed
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

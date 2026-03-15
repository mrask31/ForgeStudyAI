'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';

interface TopicData {
  id: string;
  title: string;
  masteryScore: number;
  orbitState: number;
}

interface ShareData {
  displayName: string;
  gradeBand: string;
  topicCount: number;
  overallMastery: number;
  topics: TopicData[];
}

function getMasteryColor(score: number): string {
  if (score < 30) return 'bg-slate-600';
  if (score < 70) return 'bg-amber-500';
  return 'bg-indigo-500';
}

function getMasteryLabel(score: number): string {
  if (score < 30) return 'Learning';
  if (score < 70) return 'Developing';
  return 'Mastered';
}

export default function ShareGalaxyPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share/${studentId}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Student not found' : 'Failed to load');
          return;
        }
        setData(await res.json());
      } catch {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    }
    if (studentId) load();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading galaxy...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-red-400">{error || 'Not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Learning Galaxy</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {data.displayName}&apos;s Progress
          </h1>
          <p className="text-slate-400 text-sm">
            {data.gradeBand === 'middle' ? 'Middle School' : 'High School'} Student
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center">
            <p className="text-4xl font-bold text-white">{data.topicCount}</p>
            <p className="text-sm text-slate-400 mt-1">Topics Studied</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center">
            <p className="text-4xl font-bold text-indigo-400">{data.overallMastery}%</p>
            <p className="text-sm text-slate-400 mt-1">Overall Mastery</p>
          </div>
        </div>

        {/* Topic Grid */}
        {data.topics.length > 0 ? (
          <div className="space-y-3">
            {data.topics.map((topic) => (
              <div
                key={topic.id}
                className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center gap-4"
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getMasteryColor(topic.masteryScore)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{topic.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getMasteryColor(topic.masteryScore)}`}
                      style={{ width: `${topic.masteryScore}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-8 text-right">{topic.masteryScore}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500">No topics yet.</p>
        )}

        {/* Footer CTA */}
        <div className="text-center mt-12">
          <p className="text-xs text-slate-600">
            Powered by ForgeStudy AI
          </p>
        </div>
      </div>
    </div>
  );
}

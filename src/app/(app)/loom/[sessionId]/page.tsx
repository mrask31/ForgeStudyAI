'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LoomWorkspace } from '@/components/loom/LoomWorkspace';

interface Topic {
  id: string;
  title: string;
  mastery_score: number;
  orbit_state: number;
}

interface LoomSession {
  id: string;
  selectedTopicIds: string[];
  status: 'SPARRING' | 'THESIS_ACHIEVED';
  transcript: any[];
  finalOutline: string | null;
  cryptographicProof: string | null;
  createdAt: string;
  completedAt: string | null;
  topics: Topic[];
}

export default function LoomSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<LoomSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch(`/api/loom/sessions/${sessionId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Session not found or access denied');
          }
          if (response.status === 401) {
            throw new Error('Please sign in to access this session');
          }
          throw new Error('Failed to load synthesis session');
        }

        const data = await response.json();
        setSession(data.session);
      } catch (err: any) {
        console.error('[Loom] Failed to fetch session:', err);
        setError(err.message);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-400 text-lg mb-2">Loading synthesis session...</div>
          <div className="text-slate-500 text-sm">Preparing your constellation</div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-lg mb-4">{error || 'Session not found'}</div>
          <button
            onClick={() => router.push('/app/middle')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Return to Galaxy
          </button>
        </div>
      </div>
    );
  }

  return <LoomWorkspace session={session} />;
}

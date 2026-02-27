'use client';

import { useState, useEffect } from 'react';
import { LockedConstellation } from './LockedConstellation';
import { OutlineBoard } from './OutlineBoard';
import { SocraticChat } from './SocraticChat';

interface Topic {
  id: string;
  title: string;
  mastery_score: number;
  orbit_state: number;
}

interface Message {
  role: 'student' | 'ai';
  content: string;
  timestamp: string;
}

interface LoomSession {
  id: string;
  selectedTopicIds: string[];
  status: 'SPARRING' | 'THESIS_ACHIEVED';
  transcript: Message[];
  finalOutline: string | null;
  cryptographicProof: string | null;
  createdAt: string;
  completedAt: string | null;
  topics: Topic[];
}

interface LoomWorkspaceProps {
  session: LoomSession;
}

export function LoomWorkspace({ session: initialSession }: LoomWorkspaceProps) {
  const [session, setSession] = useState(initialSession);
  const [crystallizedThreads, setCrystallizedThreads] = useState<string[]>([]);

  // Extract crystallized threads from transcript
  useEffect(() => {
    const threads: string[] = [];
    for (const message of session.transcript) {
      if (message.role === 'ai' && (message as any).crystallizedThread) {
        threads.push((message as any).crystallizedThread);
      }
    }
    setCrystallizedThreads(threads);
  }, [session.transcript]);

  const handleSendMessage = async (message: string) => {
    // This will be implemented in Task 12.1
    console.log('[Loom] Sending message:', message);
  };

  const isLocked = session.status === 'THESIS_ACHIEVED';

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Panel: Constellation + Outline (40%) */}
      <div className="w-2/5 border-r border-slate-800 flex flex-col">
        {/* Locked Constellation */}
        <div className="h-1/2 border-b border-slate-800 p-4">
          <LockedConstellation
            topics={session.topics}
            selectedTopicIds={session.selectedTopicIds}
          />
        </div>

        {/* Outline Board */}
        <div className="h-1/2 p-4 overflow-y-auto">
          <OutlineBoard crystallizedThreads={crystallizedThreads} />
        </div>
      </div>

      {/* Right Panel: Socratic Chat (60%) */}
      <div className="w-3/5 flex flex-col">
        <SocraticChat
          transcript={session.transcript}
          onSendMessage={handleSendMessage}
          isLocked={isLocked}
        />
      </div>
    </div>
  );
}

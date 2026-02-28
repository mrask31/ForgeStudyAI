'use client';

import { useState, useEffect } from 'react';
import { LockedConstellation } from './LockedConstellation';
import { OutlineBoard } from './OutlineBoard';
import { SocraticChat } from './SocraticChat';
import { toast } from 'sonner';

interface Topic {
  id: string;
  title: string;
  mastery_score: number;
  orbit_state: number;
}

interface Message {
  role: 'student' | 'ai';
  content: string;
  crystallizedThread?: string;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFlaring, setIsFlaring] = useState(false);

  // Extract crystallized threads from transcript
  useEffect(() => {
    const threads: string[] = [];
    for (const message of session.transcript) {
      if (message.role === 'ai' && message.crystallizedThread) {
        threads.push(message.crystallizedThread);
      }
    }
    setCrystallizedThreads(threads);
  }, [session.transcript]);

  const handleSendMessage = async (message: string) => {
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    // Optimistically add student message to transcript
    const studentMessage: Message = {
      role: 'student',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setSession(prev => ({
      ...prev,
      transcript: [...prev.transcript, studentMessage],
    }));

    try {
      // Call /api/loom/spar endpoint
      const response = await fetch('/api/loom/spar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle session termination
        if (error.terminated) {
          setSession(prev => ({
            ...prev,
            status: 'THESIS_ACHIEVED',
          }));
          toast.error(error.error, { duration: 7000 });
          return;
        }
        
        throw new Error(error.error || 'Failed to send message');
      }

      const data = await response.json();
      
      // Check for 45-turn warning
      if (data.warning_45_turns) {
        toast.warning('Approaching synthesis limit (45/50 turns). Aim for your thesis!', {
          duration: 5000,
        });
      }

      // Add AI response to transcript
      const aiMessage: Message = {
        role: 'ai',
        content: data.socratic_response,
        crystallizedThread: data.crystallized_thread || undefined,
        timestamp: new Date().toISOString(),
      };

      setSession(prev => ({
        ...prev,
        transcript: [...prev.transcript, aiMessage],
        status: data.loom_status,
        cryptographicProof: data.cryptographic_proof || prev.cryptographicProof,
      }));

      // Handle thesis achievement
      if (data.loom_status === 'THESIS_ACHIEVED') {
        // Trigger constellation flare animation
        setIsFlaring(true);
        setTimeout(() => setIsFlaring(false), 300);
        
        toast.success('Synthesis complete! Your thesis has been crystallized.');
      }

    } catch (error) {
      console.error('[Loom] Failed to send message:', error);
      
      // Remove optimistic message on error
      setSession(prev => ({
        ...prev,
        transcript: prev.transcript.slice(0, -1),
      }));

      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to send message. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
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
            isFlaring={isFlaring}
            isAchieved={isLocked}
          />
        </div>

        {/* Outline Board */}
        <div className="h-1/2 p-4 overflow-y-auto">
          <OutlineBoard 
            crystallizedThreads={crystallizedThreads}
            isThesisAchieved={isLocked}
            sessionId={session.id}
          />
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface VaultWorkspaceProps {
  params: {
    sessionId: string;
  };
}

export default function VaultWorkspace({ params }: VaultWorkspaceProps) {
  const router = useRouter();
  const { sessionId } = params;
  
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentTopicId, setCurrentTopicId] = useState<string>('');
  const [currentTopicTitle, setCurrentTopicTitle] = useState<string>('');
  const [contextReference, setContextReference] = useState<string>('');
  
  const [answer, setAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [progress, setProgress] = useState({ current: 1, total: 5 });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  
  const [sessionComplete, setSessionComplete] = useState(false);
  const [completionStats, setCompletionStats] = useState({ passed: 0, failed: 0 });
  
  const [loading, setLoading] = useState(true);
  
  // Load session data on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch(`/api/vault/session?sessionId=${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Failed to load session');
        }
        
        const data = await response.json();
        
        // Check if session is already complete
        if (data.session.status === 'COMPLETED') {
          setSessionComplete(true);
          setCompletionStats({
            passed: data.session.topics_passed || 0,
            failed: data.session.topics_failed || 0,
          });
          setLoading(false);
          return;
        }
        
        // Load current question
        if (data.current_question) {
          setCurrentQuestion(data.current_question.question);
          setCurrentTopicId(data.current_question.topic_id);
          setCurrentTopicTitle(data.current_question.topic_title);
          setContextReference(data.current_question.context_reference);
          setProgress({
            current: data.session.current_topic_index + 1,
            total: data.session.batch_size,
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('[VaultWorkspace] Failed to load session:', error);
        toast.error('Failed to load session');
        setLoading(false);
      }
    }
    
    loadSession();
  }, [sessionId]);
  
  const handleSubmit = async () => {
    if (!answer.trim()) {
      toast.error('Please enter an answer');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/vault/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          topicId: currentTopicId,
          answer,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }
      
      const data = await response.json();
      
      // Show feedback
      setFeedback(data.brief_feedback);
      setPassed(data.passed);
      
      // Trigger snap-back animation if passed
      if (data.passed) {
        window.dispatchEvent(new CustomEvent('vault:snap-back', {
          detail: { topicId: currentTopicId },
        }));
      }
      
      // Wait 2 seconds to show feedback
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (data.session_complete) {
        // Session complete
        setSessionComplete(true);
        setCompletionStats({
          passed: data.topics_passed,
          failed: data.topics_failed,
        });
      } else {
        // Load next question
        if (data.next_question) {
          setCurrentQuestion(data.next_question.question);
          setCurrentTopicId(data.next_question.topic_id);
          setCurrentTopicTitle(data.next_question.topic_title);
          setContextReference(data.next_question.context_reference);
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        
        // Reset form
        setAnswer('');
        setFeedback(null);
        setPassed(null);
      }
      
    } catch (error) {
      console.error('[VaultWorkspace] Error:', error);
      toast.error('Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading Vault session...</div>
      </div>
    );
  }
  
  if (sessionComplete) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-slate-900 rounded-lg border border-slate-800 p-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            🔐 Vault Session Complete
          </h1>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <span className="text-slate-300">Memories Secured</span>
              <span className="text-2xl font-bold text-indigo-400">
                {completionStats.passed}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <span className="text-slate-300">Need Review Tomorrow</span>
              <span className="text-2xl font-bold text-amber-400">
                {completionStats.failed}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/app/middle')}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Return to Galaxy
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900 rounded-lg border border-slate-800 p-8">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              Question {progress.current} of {progress.total}
            </span>
            <span className="text-sm text-slate-400">
              {currentTopicTitle}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Question */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            {currentQuestion}
          </h2>
          <p className="text-sm text-slate-400 italic">
            {contextReference}
          </p>
        </div>
        
        {/* Feedback (if shown) */}
        {feedback && (
          <div className={`mb-6 p-4 rounded-lg ${
            passed 
              ? 'bg-green-900/20 border border-green-700' 
              : 'bg-amber-900/20 border border-amber-700'
          }`}>
            <p className={`text-sm ${
              passed ? 'text-green-300' : 'text-amber-300'
            }`}>
              {feedback}
            </p>
          </div>
        )}
        
        {/* Answer input */}
        <div className="mb-6">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            disabled={isSubmitting || feedback !== null}
            className="w-full h-32 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50"
          />
        </div>
        
        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || feedback !== null}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Evaluating...' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}

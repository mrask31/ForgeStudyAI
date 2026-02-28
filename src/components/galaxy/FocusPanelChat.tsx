'use client';

import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';

interface FocusPanelChatProps {
  topicId: string;
  topicTitle: string;
}

export function FocusPanelChat({ topicId, topicTitle }: FocusPanelChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Initialize chat session
  useEffect(() => {
    async function initializeSession() {
      try {
        const response = await fetch('/api/chats/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent: 'new_question',
            topicId,
            topicTitle,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create chat session');
        }

        const data = await response.json();
        setSessionId(data.chatId);
        setIsInitializing(false);
      } catch (err) {
        console.error('[FocusPanelChat] Session creation failed:', err);
        setError('Unable to start chat session. Please try again.');
        setIsInitializing(false);
      }
    }

    initializeSession();
  }, [topicId, topicTitle]);

  const handleSend = async () => {
    if (!message.trim() || !sessionId || isSending) return;

    setIsSending(true);
    
    try {
      // Send message to chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          chatId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setMessage('');
      // TODO: Handle response and update messages
    } catch (err) {
      console.error('[FocusPanelChat] Send failed:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isInitializing) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
          </div>
          <p className="text-lg font-medium text-slate-400">Initializing chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome Message */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl rounded-tl-none p-4">
              <p className="text-sm">
                Hi! I'm here to help you explore <span className="font-semibold text-indigo-400">{topicTitle}</span>. 
                What would you like to learn about?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Input Bar */}
      <div className="border-t border-slate-800 bg-slate-950 p-4 pb-safe-b">
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            rows={1}
            className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-indigo-500 transition-colors"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

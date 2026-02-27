'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'student' | 'ai';
  content: string;
  timestamp: string;
}

interface SocraticChatProps {
  transcript: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLocked: boolean;
}

export function SocraticChat({ transcript, onSendMessage, isLocked }: SocraticChatProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSending || isLocked) {
      return;
    }

    const messageToSend = message.trim();
    setMessage('');
    setIsSending(true);

    try {
      await onSendMessage(messageToSend);
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Chat Header */}
      <div className="border-b border-slate-800 p-4">
        <h2 className="text-xl font-semibold text-slate-200">Socratic Dialogue</h2>
        <p className="text-sm text-slate-500 mt-1">
          {isLocked 
            ? 'Synthesis complete - chat is locked' 
            : 'Discover connections through questioning'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {transcript.length === 0 && (
          <div className="text-center text-slate-500 mt-8">
            <p className="text-lg mb-2">Begin your synthesis journey</p>
            <p className="text-sm">
              Ask a question or share your initial thoughts about how these concepts might connect
            </p>
          </div>
        )}

        {transcript.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                msg.role === 'student'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-200'
              }`}
            >
              <div className="text-sm font-medium mb-1 opacity-70">
                {msg.role === 'student' ? 'You' : 'Socratic Guide'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-200 rounded-lg p-4 max-w-[80%]">
              <div className="text-sm font-medium mb-1 opacity-70">Socratic Guide</div>
              <div className="flex items-center gap-2">
                <span className="animate-pulse">Thinking...</span>
                <span className="animate-bounce">💭</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLocked || isSending}
            placeholder={
              isLocked
                ? 'Chat is locked - synthesis complete'
                : 'Share your thoughts or ask a question...'
            }
            className="flex-1 bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[60px] max-h-[200px]"
            rows={1}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLocked || isSending}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>
        <div className="text-xs text-slate-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

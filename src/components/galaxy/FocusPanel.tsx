'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface FocusPanelProps {
  isOpen: boolean;
  topicId: string | null;
  topicTitle: string | null;
  onClose: () => void;
}

export function FocusPanel({ isOpen, topicId, topicTitle, onClose }: FocusPanelProps) {
  // Handle Escape key to close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Trap focus within panel when open
  useEffect(() => {
    if (isOpen) {
      // Store the element that had focus before opening
      const previouslyFocusedElement = document.activeElement as HTMLElement;

      return () => {
        // Restore focus when closing
        if (previouslyFocusedElement) {
          previouslyFocusedElement.focus();
        }
      };
    }
  }, [isOpen]);

  if (!topicId || !topicTitle) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay with depth of field effect */}
      <div
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Focus Panel Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-panel-title"
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-[450px] lg:w-[500px] 
                   bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl
                   transition-transform duration-300 ease-in-out
                   ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="border-b border-slate-800 p-4 flex items-center justify-between">
          <h2 id="focus-panel-title" className="text-lg font-semibold text-slate-200 truncate pr-4">
            {topicTitle}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close focus panel"
            className="p-4 -m-4 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Content */}
        <div className="h-[calc(100vh-64px)] overflow-hidden">
          {isOpen && (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
                </div>
                <p className="text-lg font-medium text-slate-400">Loading chat...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

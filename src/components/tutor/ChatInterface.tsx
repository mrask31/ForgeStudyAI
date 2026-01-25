'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Paperclip, Calculator } from 'lucide-react'
import SuggestedPrompts from '@/components/tutor/SuggestedPrompts'
import { useTutorContext } from './TutorContext'
import MedicalMathCalculator from './MedicalMathCalculator'

interface ChatInterfaceProps {
  sessionId?: string // Optional - will be created on first message if missing
  onSend: (message: string) => Promise<void> | void
  initialPrompt?: string // For topic/exam prefill - does NOT auto-send
  attachedFiles?: { id: string, name: string, document_type: string | null }[]
  attachedContext?: 'none' | 'syllabus' | 'textbook' | 'mixed'
  isLoading?: boolean
  messages?: any[] // Optional messages array to check if session is empty
  onDetach?: (fileId: string) => void // Callback to detach a file
}

export default function ChatInterface({
  sessionId,
  onSend,
  initialPrompt,
  attachedFiles = [],
  attachedContext = 'none',
  isLoading = false,
  messages = [],
  onDetach
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasAttachedFiles = attachedFiles.length > 0
  const tutorContext = useTutorContext()
  // If sessionId exists, assume there might be messages (don't prefill)
  // If no sessionId, it's a fresh session (safe to prefill)
  const hasMessages = !!sessionId || (messages && messages.length > 0)

  // Debug: Log incoming attachedFiles prop
  useEffect(() => {
    console.log('🔍 ChatInterface received files:', {
      count: attachedFiles.length,
      files: attachedFiles.map(f => ({ id: f.id, name: f.name, document_type: f.document_type })),
    });
  }, [attachedFiles]);

  // Update input when initialPrompt changes, but only if no messages and user hasn't typed
  useEffect(() => {
    if (!hasMessages && initialPrompt && !inputValue) {
      setInputValue(initialPrompt)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [initialPrompt, hasMessages]) // Only depend on initialPrompt and hasMessages - don't depend on inputValue to avoid loops

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`
    }
  }, [inputValue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    
    const message = inputValue.trim()
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tutor-scroll-to-bottom', { detail: { behavior: 'smooth' } }))
    }

    // Call onSend and only clear input on success
    try {
      await onSend(message)
      setInputValue('') // Clear ONLY after successful send
    } catch (error) {
      console.error('[ChatInterface] Error sending message:', error)
      // Keep input value on error so user can retry
    }
    
    // Refocus input after sending
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleSuggestionClick = async (prompt: string) => {
    await onSend(prompt)
  }

  const getPlaceholderText = () => {
    if (attachedFiles.length > 0) {
      return "Ask a question about your uploaded materials..."
    }
    return "Ask a question about what you're learning..."
  }

  return (
    <div className="flex-shrink-0 pt-3 bg-slate-50 relative">
      {/* Calculator Panel */}
      <MedicalMathCalculator 
        isOpen={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
      />

      {/* Context Pills (Above the dock) */}
      {attachedFiles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-2 mb-2">
          {attachedFiles.map((file) => (
            <div 
              key={file.id} 
              className="flex items-center gap-2 rounded-full bg-white/80 border border-emerald-100 px-3 py-1 text-xs text-emerald-700 shadow-sm backdrop-blur-sm transition-all duration-200"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              {onDetach && (
                <button 
                  onClick={() => onDetach(file.id)} 
                  className="hover:text-emerald-900 transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chat Input Dock */}
      <form 
        onSubmit={handleSubmit}
        className="rounded-full bg-white shadow-lg border border-slate-200 px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3"
      >
        {/* Paperclip */}
        <button 
          type="button"
          className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-emerald-600 transition-all duration-200"
          aria-label="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Textarea */}
        <textarea 
          ref={inputRef}
          className="flex-1 max-h-32 min-h-[44px] resize-none bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          placeholder={getPlaceholderText()}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />

        {/* Calculator Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsCalculatorOpen(!isCalculatorOpen)
          }}
          className={`rounded-full p-1.5 sm:p-2 transition-all duration-200 ${
            isCalculatorOpen
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-slate-400 hover:bg-slate-50 hover:text-emerald-600'
          }`}
          aria-label="Toggle calculator"
          aria-pressed={isCalculatorOpen}
          title="Calculator"
        >
          <Calculator className="h-5 w-5" />
        </button>

        {/* Send Button - Circular with gradient */}
        <button 
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 p-2.5 text-white shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}


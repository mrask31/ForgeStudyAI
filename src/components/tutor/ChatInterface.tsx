'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ChatInterfaceProps {
  sessionId?: string
  onSend: (message: string) => Promise<void> | void
  initialPrompt?: string
  attachedFiles?: { id: string, name: string, document_type: string | null }[]
  isLoading?: boolean
  messages?: any[]
  onDetach?: (fileId: string) => void
}

export default function ChatInterface({
  sessionId,
  onSend,
  initialPrompt,
  attachedFiles = [],
  isLoading = false,
  messages = [],
  onDetach,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasMessages = !!sessionId || (messages && messages.length > 0)

  useEffect(() => {
    if (!hasMessages && initialPrompt && !inputValue) {
      setInputValue(initialPrompt)
      setTimeout(() => { inputRef.current?.focus() }, 100)
    }
  }, [initialPrompt, hasMessages])

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

    try {
      await onSend(message)
      setInputValue('')
    } catch (error) {
      console.error('[ChatInterface] Error sending message:', error)
    }

    setTimeout(() => { inputRef.current?.focus() }, 100)
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be under 20MB.')
      return
    }

    setIsProcessingPhoto(true)
    toast.info('Extracting text from photo...')

    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const res = await fetch('/api/ai/extract-image-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image: base64, mimeType: file.type }),
      })

      if (!res.ok) throw new Error('Failed to extract text')

      const { text } = await res.json()
      if (!text?.trim()) throw new Error('No text found in image')

      const contextMessage = `The student has uploaded a photo of their assignment. Here is what it contains:\n\n${text}\n\nAcknowledge what you see, ask which part they want to work on first, and begin Socratic tutoring from there.`

      toast.success('Text extracted! Sending to tutor...')
      await onSend(contextMessage)
    } catch (error: any) {
      toast.error(error.message || 'Failed to process photo')
    } finally {
      setIsProcessingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex-shrink-0 pt-3 relative" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* Chat Input Dock */}
      <form
        onSubmit={handleSubmit}
        className="rounded-full bg-[#1a1a2e] shadow-lg border border-slate-700 px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3"
      >
        {/* Camera */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingPhoto}
          className={`rounded-full p-2 transition-all duration-200 ${
            isProcessingPhoto
              ? 'text-indigo-400 animate-pulse'
              : 'text-slate-500 hover:bg-slate-800 hover:text-indigo-400'
          }`}
          aria-label="Upload homework photo"
          title="Take a photo of homework"
        >
          {isProcessingPhoto ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </button>

        {/* Textarea */}
        <textarea
          ref={inputRef}
          className="flex-1 max-h-32 min-h-[44px] resize-none bg-transparent py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          placeholder="Ask about what you're learning..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading || isProcessingPhoto}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={isLoading || isProcessingPhoto || !inputValue.trim()}
          className="rounded-full bg-indigo-600 hover:bg-indigo-700 p-2.5 text-white shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}

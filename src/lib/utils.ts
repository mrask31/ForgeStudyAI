import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Cleans Markdown syntax from chat titles for display in Dashboard UI
 * Removes: bold, italic, headers, links, code, strikethrough, lists, blockquotes
 */
export function cleanChatTitle(title: string | null): string {
  if (!title) return ''
  
  let cleaned = title
  
  // Remove headers (# ## ### etc.)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '')
  
  // Remove bold (**text** or __text__)
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1')
  cleaned = cleaned.replace(/__(.+?)__/g, '$1')
  
  // Remove italic (*text* or _text_)
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1')
  cleaned = cleaned.replace(/_(.+?)_/g, '$1')
  
  // Remove links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  
  // Remove inline code `code`
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1')
  
  // Remove strikethrough ~~text~~
  cleaned = cleaned.replace(/~~(.+?)~~/g, '$1')
  
  // Remove list markers (- * 1. etc.)
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '')
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '')
  
  // Remove blockquotes (>)
  cleaned = cleaned.replace(/^>\s+/gm, '')
  
  // Remove horizontal rules (--- or ***)
  cleaned = cleaned.replace(/^[-*]{3,}$/gm, '')
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  // Truncate if too long (keep first 50 chars)
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 47) + '...'
  }
  
  return cleaned
}
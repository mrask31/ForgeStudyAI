'use client'

import { ReactNode, useMemo } from 'react'
import { VOCABULARY_TERMS } from '@/lib/medicalTerms'
import MedicalTermPopover from './MedicalTermPopover'
import ReactMarkdown from 'react-markdown'

interface MessageWithMedicalTermsProps {
  content: string
  markdownComponents?: Record<string, React.ComponentType<any>>
}

/**
 * Component that processes the entire message content to find vocabulary terms
 * and renders it with ReactMarkdown, ensuring vocabulary terms are detected
 * even when ReactMarkdown splits text into fragments.
 * 
 * Strategy: Process the full content, find all terms, then render with a custom
 * text component that checks each fragment against our known terms.
 */
export default function MessageWithMedicalTerms({ 
  content, 
  markdownComponents 
}: MessageWithMedicalTermsProps): ReactNode {
  // Build a map of all vocabulary terms for quick lookup
  // We check ALL terms in fragments, not just ones found in initial scan
  const vocabularyTermMap = useMemo(() => {
    const map = new Map<string, { term: string; definition: string; category?: string }>()
    
    for (const vocabularyTerm of VOCABULARY_TERMS) {
      map.set(vocabularyTerm.term.toLowerCase(), {
        term: vocabularyTerm.term,
        definition: vocabularyTerm.definition,
        category: vocabularyTerm.category
      })
    }
    
    return map
  }, [])

  // Custom text component that checks fragments against our term map
  const enhancedComponents = {
    ...markdownComponents,
    text: ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => {
      if (!children) return null
      const text = String(children)
      
      // If fragment is empty or just whitespace/punctuation, return as-is
      if (!text.trim() || text.trim().length === 0) {
        return <>{text}</>
      }
      
      const lowerText = text.toLowerCase()
      
      // Check if this fragment contains any vocabulary terms
      const parts: ReactNode[] = []
      let lastIndex = 0
      const matches: Array<{ start: number; end: number; termInfo: { term: string; definition: string; category?: string } }> = []
      
      // Sort terms by length (longest first) to match longer phrases first
      const sortedTerms = Array.from(vocabularyTermMap.entries()).sort((a, b) => b[0].length - a[0].length)
      
      // Find all term matches in this fragment
      for (const [lowerTerm, termInfo] of sortedTerms) {
        // Skip if term is longer than the fragment
        if (lowerTerm.length > lowerText.length) continue
        
        // Simple indexOf search - we'll check word boundaries manually
        let searchIndex = 0
        
        while (true) {
          const index = lowerText.indexOf(lowerTerm, searchIndex)
          if (index === -1) break
          
          // Check word boundaries
          const charBefore = index > 0 ? lowerText[index - 1] : ' '
          const charAfter = index + lowerTerm.length < lowerText.length ? lowerText[index + lowerTerm.length] : ' '
          const isWordBoundaryBefore = /[\s.,;:!?()[\]{}-]/.test(charBefore) || index === 0
          const isWordBoundaryAfter = /[\s.,;:!?()[\]{}-]/.test(charAfter) || index + lowerTerm.length === lowerText.length
          
          if (isWordBoundaryBefore && isWordBoundaryAfter) {
            // Check if this match overlaps with a previous match
            const overlaps = matches.some(m => 
              (index >= m.start && index < m.end) ||
              (index + lowerTerm.length > m.start && index + lowerTerm.length <= m.end) ||
              (index <= m.start && index + lowerTerm.length >= m.end)
            )
            
            if (!overlaps) {
              matches.push({
                start: index,
                end: index + lowerTerm.length,
                termInfo
              })
            }
          }
          
          searchIndex = index + 1
        }
      }
      
      // Sort matches by start position
      matches.sort((a, b) => a.start - b.start)
      
      // Build the parts array with text and term popovers
      for (const match of matches) {
        // Add text before the match
        if (match.start > lastIndex) {
          parts.push(text.slice(lastIndex, match.start))
        }
        
        // Add the vocabulary term with popover (preserve original casing)
        const originalTerm = text.slice(match.start, match.end)
        parts.push(
          <MedicalTermPopover
            key={`term-${match.start}-${match.end}-${Math.random()}`}
            term={match.termInfo.term}
            definition={match.termInfo.definition}
            category={match.termInfo.category}
          >
            {originalTerm}
          </MedicalTermPopover>
        )
        
        lastIndex = match.end
      }
      
      // Add remaining text after the last match
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
      }
      
      // If no matches found, return original text
      if (parts.length === 0) {
        return <>{text}</>
      }
      
      // Debug: Log when we find matches
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && matches.length > 0) {
        console.log('[MessageWithMedicalTerms] Found', matches.length, 'term(s) in fragment:', text.substring(0, 50), '...')
      }
      
      return <>{parts}</>
    }
  }

  return (
    <ReactMarkdown components={enhancedComponents}>
      {content}
    </ReactMarkdown>
  )
}


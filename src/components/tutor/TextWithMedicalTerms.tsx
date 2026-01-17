'use client'

import { ReactNode } from 'react'
import { findVocabularyTerms } from '@/lib/medicalTerms'
import MedicalTermPopover from './MedicalTermPopover'

interface TextWithMedicalTermsProps {
  text: string
}

/**
 * Component that renders text with vocabulary terms made clickable
 * Vocabulary terms are detected and wrapped with a popover component
 */
export default function TextWithMedicalTerms({ text }: TextWithMedicalTermsProps): ReactNode {
  const matches = findVocabularyTerms(text)
  
  // If no matches, just return the text as-is
  if (matches.length === 0) {
    return <>{text}</>
  }
  
  // Build array of text segments and vocabulary term components
  const segments: ReactNode[] = []
  let lastIndex = 0
  
  for (const match of matches) {
    // Add text before the match
    if (match.startIndex > lastIndex) {
      segments.push(text.slice(lastIndex, match.startIndex))
    }
    
    // Get the original casing from the text
    const originalTerm = text.slice(match.startIndex, match.endIndex)
    
    // Add the vocabulary term with popover
    segments.push(
      <MedicalTermPopover
        key={`${match.startIndex}-${match.endIndex}`}
        term={match.term}
        definition={match.definition}
      >
        {originalTerm}
      </MedicalTermPopover>
    )
    
    lastIndex = match.endIndex
  }
  
  // Add remaining text after the last match
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex))
  }
  
  return <>{segments}</>
}


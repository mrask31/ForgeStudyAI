/**
 * Input Sanitization for Student Answers
 * 
 * Prevents abuse and ensures clean input to Gemini Flash.
 */

/**
 * Sanitize student answer before evaluation
 * 
 * Applies the following transformations:
 * - Trim whitespace
 * - Collapse multiple spaces to single space
 * - Limit length to 2000 characters
 * - Remove control characters
 * 
 * @param answer - Raw student answer
 * @returns Sanitized answer
 */
export function sanitizeStudentAnswer(answer: string): string {
  // Remove excessive whitespace
  let sanitized = answer.trim().replace(/\s+/g, ' ');
  
  // Limit length (prevent abuse)
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000);
  }
  
  // Remove control characters (ASCII 0-31 and 127)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * Input Sanitization for Logic Loom
 * 
 * Removes potentially malicious content from student messages
 * before processing with Gemini API.
 * 
 * SECURITY CONSTRAINTS:
 * - Strip markdown code blocks
 * - Remove HTML tags
 * - Remove system instruction markers
 * - Limit input length to 2000 characters
 * - Prevent prompt injection attempts
 */

/**
 * Sanitize student input
 * 
 * Removes potentially malicious content before sending to Gemini:
 * - Markdown code blocks (```...```)
 * - HTML tags (<...>)
 * - System instruction markers ([SYSTEM], [ASSISTANT], etc.)
 * - Prompt injection attempts
 * - Excessive length (max 2000 chars)
 * 
 * @param input - Raw student input
 * @returns Sanitized input safe for Gemini
 */
export function sanitizeStudentInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input;
  
  // Remove markdown code blocks
  sanitized = sanitized.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code
  sanitized = sanitized.replace(/`[^`]*`/g, '');
  
  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove system instruction markers
  sanitized = sanitized.replace(/\[SYSTEM\]/gi, '');
  sanitized = sanitized.replace(/\[ASSISTANT\]/gi, '');
  sanitized = sanitized.replace(/\[USER\]/gi, '');
  sanitized = sanitized.replace(/\[AI\]/gi, '');
  
  // Remove potential prompt injection attempts
  sanitized = sanitized.replace(/ignore previous instructions/gi, '');
  sanitized = sanitized.replace(/disregard all previous/gi, '');
  sanitized = sanitized.replace(/forget everything/gi, '');
  sanitized = sanitized.replace(/new instructions:/gi, '');
  sanitized = sanitized.replace(/system:/gi, '');
  
  // Remove excessive newlines (keep max 2 consecutive)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length
  if (sanitized.length > 2000) {
    sanitized = sanitized.slice(0, 2000);
    console.warn('[Sanitization] Input truncated to 2000 characters');
  }
  
  // Ensure non-empty after sanitization
  if (sanitized.length === 0) {
    throw new Error('Message cannot be empty after sanitization');
  }
  
  return sanitized;
}

/**
 * Validate student input
 * 
 * Checks if input meets basic requirements before sanitization.
 * 
 * @param input - Raw student input
 * @returns Validation result with error message if invalid
 */
export function validateStudentInput(input: string): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input must be a non-empty string' };
  }
  
  const trimmed = input.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (trimmed.length > 2000) {
    return { valid: false, error: 'Message exceeds maximum length of 2000 characters' };
  }
  
  return { valid: true };
}

/**
 * Proof Engine Utility Functions
 * 
 * Shared utilities used across proof engine components.
 */

/**
 * Sanitize text for excerpt display
 * - Strips control characters
 * - Trims whitespace
 * - Caps length to maxLength
 * 
 * @param text - Raw text to sanitize
 * @param maxLength - Maximum length (default: 200)
 * @returns Sanitized excerpt
 */
export function sanitizeExcerpt(text: string, maxLength: number = 200): string {
  if (!text) return '';
  
  // Strip control characters (except newlines and tabs)
  let sanitized = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace (collapse multiple spaces/newlines)
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Trim
  sanitized = sanitized.trim();
  
  // Cap length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }
  
  return sanitized;
}

/**
 * Generate SHA-256 hash for response deduplication
 * 
 * @param chatId - Chat ID
 * @param studentResponse - Student response text
 * @param timestamp - Timestamp (ISO string)
 * @returns Hex-encoded SHA-256 hash
 */
export async function generateResponseHash(
  chatId: string,
  studentResponse: string,
  timestamp: string
): Promise<string> {
  const data = `${chatId}|${studentResponse}|${timestamp}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generate random integer in range [min, max] (inclusive)
 * 
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

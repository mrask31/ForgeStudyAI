/**
 * Error Handling & Graceful Degradation for AI Services
 * 
 * Provides error classes, retry logic, and fallback mechanisms.
 * 
 * Requirements: 6.4, 8.1, 8.2, 8.5
 */

import type { VisionErrorCode, ChatErrorCode } from '@/types/dual-ai-orchestration';

// Declare process for Node.js environment
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

/**
 * Custom error class for AI service errors
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: VisionErrorCode | ChatErrorCode,
    public retryable: boolean = false,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AIServiceError';
    
    // Ensure API keys never appear in error messages
    this.message = this.sanitizeMessage(message);
  }

  /**
   * Remove any potential API keys or sensitive data from error messages
   */
  private sanitizeMessage(message: string): string {
    // Remove anything that looks like an API key (long alphanumeric strings)
    return message.replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]');
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      retryable: this.retryable,
    };
  }
}

/**
 * Handle API errors with user-friendly messages
 */
export function handleAPIError(error: any, service: 'gemini' | 'claude'): AIServiceError {
  const errorMessage = error?.message || String(error);

  // API key errors
  if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
    return new AIServiceError(
      `${service === 'gemini' ? 'Gemini' : 'Claude'} API key is invalid or missing`,
      'MISSING_API_KEY',
      false,
      500
    );
  }

  // Rate limit errors
  if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return new AIServiceError(
      `${service === 'gemini' ? 'Gemini' : 'Claude'} API rate limit exceeded. Please try again later.`,
      'RATE_LIMIT',
      true,
      429
    );
  }

  // Context too large (Claude specific)
  if (service === 'claude' && (errorMessage.includes('context') || errorMessage.includes('too large'))) {
    return new AIServiceError(
      'Context exceeds Claude\'s limit. Please reduce the amount of source material.',
      'CONTEXT_TOO_LARGE',
      false,
      400
    );
  }

  // Unsupported format (Gemini specific)
  if (service === 'gemini' && errorMessage.includes('format')) {
    return new AIServiceError(
      'Unsupported image format. Please use JPEG, PNG, WebP, or HEIC.',
      'UNSUPPORTED_FORMAT',
      false,
      400
    );
  }

  // Unreadable image (Gemini specific)
  if (service === 'gemini' && (errorMessage.includes('unreadable') || errorMessage.includes('corrupted'))) {
    return new AIServiceError(
      'Image is corrupted or unreadable. Please try a different image.',
      'UNREADABLE_IMAGE',
      false,
      400
    );
  }

  // Generic API error
  return new AIServiceError(
    `${service === 'gemini' ? 'Gemini' : 'Claude'} API error. Please try again.`,
    'API_ERROR',
    true,
    500
  );
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if error is not retryable
      if (error instanceof AIServiceError && !error.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate exponential backoff delay
      const delay = initialDelayMs * Math.pow(2, attempt);
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Get response with fallback for chat endpoint
 * If Claude fails, return a helpful error message instead of crashing
 */
export async function getResponseWithFallback(
  fn: () => Promise<any>,
  fallbackMessage: string = 'I\'m having trouble connecting right now. Please try again in a moment.'
): Promise<any> {
  try {
    return await retryWithBackoff(fn, 2, 500);
  } catch (error: any) {
    console.error('[Fallback] All retries failed:', error);

    // Return graceful fallback response
    return {
      content: fallbackMessage,
      metrics: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
      finish_reason: 'error',
    };
  }
}

/**
 * Validate environment variables on startup
 */
export function validateAPIKeys(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!process.env.GEMINI_API_KEY) {
    missing.push('GEMINI_API_KEY');
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    missing.push('ANTHROPIC_API_KEY');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

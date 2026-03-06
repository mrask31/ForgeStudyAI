/**
 * AI Service Configuration and Validation
 * Requirements: 6.1, 6.2, 6.3, 6.5
 * 
 * This module handles API key validation and configuration for the Dual AI Orchestration system.
 */

import { DEFAULT_GEMINI_CONFIG, DEFAULT_CLAUDE_CONFIG } from '@/types/dual-ai-orchestration';

/**
 * Validate that required API keys are present
 * 
 * @throws Error if required API keys are missing
 */
export function validateAPIKeys(): void {
  const missingKeys: string[] = [];

  if (!process.env.ANTHROPIC_API_KEY) {
    missingKeys.push('ANTHROPIC_API_KEY');
  }

  if (!process.env.GEMINI_API_KEY) {
    missingKeys.push('GEMINI_API_KEY');
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required API keys: ${missingKeys.join(', ')}. ` +
      `Please add them to your .env.local file. ` +
      `See .env.example for reference.`
    );
  }
}

/**
 * Get Anthropic API key with validation
 * 
 * @returns Anthropic API key
 * @throws Error if API key is not configured
 */
export function getAnthropicAPIKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. ' +
      'Please add it to your .env.local file. ' +
      'Get your API key from: https://console.anthropic.com/'
    );
  }

  return apiKey;
}

/**
 * Get Gemini API key with validation
 * 
 * @returns Gemini API key
 * @throws Error if API key is not configured
 */
export function getGeminiAPIKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. ' +
      'Please add it to your .env.local file. ' +
      'Get your API key from: https://makersuite.google.com/app/apikey'
    );
  }

  return apiKey;
}

/**
 * Check if AI services are configured
 * 
 * @returns Object indicating which services are configured
 */
export function checkAIServicesAvailability(): {
  anthropic: boolean;
  gemini: boolean;
  allConfigured: boolean;
} {
  const anthropic = !!process.env.ANTHROPIC_API_KEY;
  const gemini = !!process.env.GEMINI_API_KEY;

  return {
    anthropic,
    gemini,
    allConfigured: anthropic && gemini,
  };
}

/**
 * Get Gemini Vision configuration
 */
export function getGeminiConfig() {
  return DEFAULT_GEMINI_CONFIG;
}

/**
 * Get Claude configuration
 */
export function getClaudeConfig() {
  return DEFAULT_CLAUDE_CONFIG;
}

/**
 * Validate API keys on startup (for server-side initialization)
 * 
 * This function logs warnings instead of throwing errors to allow
 * the application to start even if AI services are not configured.
 * Individual API routes will handle missing keys gracefully.
 */
export function validateAPIKeysOnStartup(): void {
  const availability = checkAIServicesAvailability();

  if (!availability.allConfigured) {
    console.warn('[AI Services] Some API keys are not configured:');
    
    if (!availability.anthropic) {
      console.warn('  - ANTHROPIC_API_KEY is missing (Claude Socratic tutor will not work)');
    }
    
    if (!availability.gemini) {
      console.warn('  - GEMINI_API_KEY is missing (Gemini Vision OCR will not work)');
    }
    
    console.warn('  Add missing keys to .env.local to enable all AI features.');
    console.warn('  See .env.example for reference.');
  } else {
    console.log('[AI Services] All API keys configured successfully');
  }
}

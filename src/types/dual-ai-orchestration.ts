/**
 * TypeScript Types for Dual AI Orchestration
 * Requirements: 1.6, 2.2, 2.3, 3.1
 * 
 * This file contains all TypeScript interfaces and types for the Dual AI Orchestration system,
 * which combines Gemini Pro Vision for image processing and Claude Sonnet 4.6 for Socratic tutoring.
 */

// ============================================================================
// Database Types
// ============================================================================

/**
 * Parsed Content - Markdown extracted from images by Gemini Pro Vision
 */
export interface ParsedContent {
  id: string;
  manual_upload_id: string;
  student_id: string;
  markdown_content: string;
  token_count: number | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  gemini_model_version: string | null;
  processing_time_ms: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Chat Session - Conversation between student and Claude tutor
 */
export interface ChatSession {
  id: string;
  student_id: string;
  parsed_content_id: string | null;
  synced_assignment_id: string | null;
  session_title: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Chat Message - Individual message in a chat session
 */
export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_creation_tokens: number | null;
  cache_read_tokens: number | null;
  model_version: string | null;
  created_at: string;
}

/**
 * AI Metrics - Usage tracking for cost monitoring and optimization
 */
export interface AIMetric {
  id: string;
  student_id: string | null;
  service_type: 'gemini_vision' | 'claude_chat';
  operation_type: string;
  model_version: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_creation_tokens: number | null;
  cache_read_tokens: number | null;
  latency_ms: number | null;
  estimated_cost_usd: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

// ============================================================================
// Gemini Vision Service Types
// ============================================================================

/**
 * Result of image processing by Gemini Pro Vision
 */
export interface VisionProcessingResult {
  success: boolean;
  markdown_content?: string;
  error_message?: string;
  token_count?: number;
  processing_time_ms?: number;
}

/**
 * Metadata for an uploaded image to be processed
 */
export interface ImageMetadata {
  upload_id: string;
  student_id: string;
  file_path: string;
  mime_type: string;
}

// ============================================================================
// Claude Service Types
// ============================================================================

/**
 * Chat message format for Claude API
 */
export interface ClaudeChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Source material to inject into Claude's context
 */
export interface SourceMaterial {
  parsed_content?: string;
  assignment_description?: string;
  teacher_rubric?: string;
  pdf_text?: string;
}

/**
 * Token usage metrics from Claude API
 */
export interface CacheMetrics {
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  input_tokens: number;
  output_tokens: number;
}

/**
 * Response from Claude chat generation
 */
export interface ChatResponse {
  content: string;
  metrics: CacheMetrics;
  finish_reason: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * POST /api/vision/process - Request
 */
export interface VisionProcessRequest {
  upload_id: string;
  student_id: string;
}

/**
 * POST /api/vision/process - Response
 */
export interface VisionProcessResponse {
  success: boolean;
  parsed_content_id?: string;
  markdown_content?: string;
  token_count?: number;
  processing_time_ms?: number;
  error?: string;
  error_code?: string;
}

/**
 * POST /api/chat - Request
 */
export interface ChatRequest {
  session_id: string;
  message: string;
  parsed_content_id?: string;
  synced_assignment_id?: string;
  stream?: boolean;
}

/**
 * POST /api/chat - Response (non-streaming)
 */
export interface ChatResponseData {
  success: boolean;
  content: string;
  metrics: CacheMetrics;
  message_id: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for vision processing
 */
export type VisionErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'UNREADABLE_IMAGE'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'MISSING_API_KEY';

/**
 * Error codes for chat
 */
export type ChatErrorCode =
  | 'MISSING_SESSION'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'MISSING_API_KEY'
  | 'CONTEXT_TOO_LARGE';

/**
 * Custom error class for AI service errors
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: VisionErrorCode | ChatErrorCode,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Supported image formats for Gemini Vision
 */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export type SupportedImageFormat = typeof SUPPORTED_IMAGE_FORMATS[number];

/**
 * Gemini Vision model configuration
 */
export interface GeminiVisionConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

/**
 * Claude model configuration
 */
export interface ClaudeConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  cache_threshold: number; // Minimum tokens to enable caching
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default Gemini Vision configuration
 */
export const DEFAULT_GEMINI_CONFIG: GeminiVisionConfig = {
  model: 'gemini-1.5-pro-vision',
  temperature: 0.2, // Low for consistent OCR
  maxOutputTokens: 4096,
};

/**
 * Default Claude configuration
 */
export const DEFAULT_CLAUDE_CONFIG: ClaudeConfig = {
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  temperature: 0.7,
  cache_threshold: 1024, // Enable caching for content > 1024 tokens
};

/**
 * API pricing (per 1M tokens in USD)
 */
export const API_PRICING = {
  CLAUDE_INPUT: 3.0,
  CLAUDE_OUTPUT: 15.0,
  CLAUDE_CACHE_WRITE: 3.75,
  CLAUDE_CACHE_READ: 0.3, // 90% discount
  GEMINI_INPUT: 0.075, // Gemini 1.5 Pro pricing
  GEMINI_OUTPUT: 0.3,
} as const;

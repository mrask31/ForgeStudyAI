/**
 * AI Metrics Tracking
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 * 
 * Track AI API usage for cost monitoring and optimization.
 */

import { createClient } from '@/lib/supabase/server';
import type { CacheMetrics } from '@/types/dual-ai-orchestration';

/**
 * Track AI API usage
 */
export async function trackAPIUsage(params: {
  studentId: string | null;
  serviceType: 'gemini_vision' | 'claude_chat';
  operationType: string;
  modelVersion: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from('ai_metrics').insert({
      student_id: params.studentId,
      service_type: params.serviceType,
      operation_type: params.operationType,
      model_version: params.modelVersion,
      input_tokens: params.inputTokens || null,
      output_tokens: params.outputTokens || null,
      cache_creation_tokens: params.cacheCreationTokens || null,
      cache_read_tokens: params.cacheReadTokens || null,
      latency_ms: params.latencyMs || null,
      estimated_cost_usd: params.estimatedCostUsd || null,
      success: params.success,
      error_message: params.errorMessage || null,
    });
  } catch (error) {
    // Don't fail the request if metrics tracking fails
    console.error('[Metrics] Failed to track API usage:', error);
  }
}

/**
 * Calculate cost from Claude metrics
 */
export function calculateClaudeCost(metrics: CacheMetrics): number {
  const INPUT_COST_PER_1M = 3.0; // USD
  const OUTPUT_COST_PER_1M = 15.0; // USD
  const CACHE_WRITE_COST_PER_1M = 3.75; // USD
  const CACHE_READ_COST_PER_1M = 0.3; // USD (90% discount)

  const inputCost = (metrics.input_tokens / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (metrics.output_tokens / 1_000_000) * OUTPUT_COST_PER_1M;
  const cacheWriteCost = ((metrics.cache_creation_input_tokens || 0) / 1_000_000) * CACHE_WRITE_COST_PER_1M;
  const cacheReadCost = ((metrics.cache_read_input_tokens || 0) / 1_000_000) * CACHE_READ_COST_PER_1M;

  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

/**
 * Calculate cost from Gemini metrics
 */
export function calculateGeminiCost(inputTokens: number, outputTokens: number): number {
  const GEMINI_INPUT_COST_PER_1M = 0.075; // USD
  const GEMINI_OUTPUT_COST_PER_1M = 0.3; // USD

  const inputCost = (inputTokens / 1_000_000) * GEMINI_INPUT_COST_PER_1M;
  const outputCost = (outputTokens / 1_000_000) * GEMINI_OUTPUT_COST_PER_1M;

  return inputCost + outputCost;
}

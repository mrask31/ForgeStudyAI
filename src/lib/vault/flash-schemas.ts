/**
 * Zod Schemas for Gemini Flash Responses
 * 
 * Validates structured JSON output from Gemini 1.5 Flash.
 * Ensures strict output format compliance to prevent conversational drift.
 */

import { z } from 'zod';

/**
 * Schema for Flash question generation response
 * 
 * Validates that Flash returns:
 * - question: The active recall question (10-500 chars)
 * - context_reference: Brief note about which historical learning event is referenced (5-200 chars)
 */
export const FlashQuestionSchema = z.object({
  question: z.string().min(10).max(500),
  context_reference: z.string().min(5).max(200),
});

/**
 * Schema for Flash answer evaluation response
 * 
 * Validates that Flash returns:
 * - passed_recall: Boolean indicating if student demonstrated sufficient recall
 * - brief_feedback: One sentence explaining the evaluation (5-300 chars)
 */
export const FlashEvaluationSchema = z.object({
  passed_recall: z.boolean(),
  brief_feedback: z.string().min(5).max(300),
});

/**
 * TypeScript types inferred from schemas
 */
export type FlashQuestion = z.infer<typeof FlashQuestionSchema>;
export type FlashEvaluation = z.infer<typeof FlashEvaluationSchema>;

/**
 * Parse and validate Flash question response
 * 
 * @param json - Unknown JSON object from Flash
 * @returns Validated FlashQuestion
 * @throws ZodError if validation fails
 */
export function parseFlashQuestion(json: unknown): FlashQuestion {
  return FlashQuestionSchema.parse(json);
}

/**
 * Parse and validate Flash evaluation response
 * 
 * @param json - Unknown JSON object from Flash
 * @returns Validated FlashEvaluation
 * @throws ZodError if validation fails
 */
export function parseFlashEvaluation(json: unknown): FlashEvaluation {
  return FlashEvaluationSchema.parse(json);
}

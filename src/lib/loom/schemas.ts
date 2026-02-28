/**
 * Zod Schemas for Logic Loom Synthesis Engine
 * 
 * Defines structured output schemas for Gemini API responses
 * with runtime validation and TypeScript type inference.
 * 
 * CRITICAL: These schemas must be compatible with Gemini's
 * structured output format using .nullable() for optional fields.
 */

import { z } from 'zod';
import { SchemaType } from '@google/generative-ai';

/**
 * Socratic Response Schema
 * 
 * Enforces structured output from Gemini during Socratic sparring.
 * 
 * Fields:
 * - socratic_response: The AI's Socratic question or pushback
 * - loom_status: Current session status (SPARRING or THESIS_ACHIEVED)
 * - crystallized_thread: 1-sentence academic summary when micro-connection detected
 * - cryptographic_proof_of_cognition: Proof text when thesis achieved
 * 
 * Validation Rules:
 * - socratic_response: Required, non-empty string
 * - loom_status: Required, must be 'SPARRING' or 'THESIS_ACHIEVED'
 * - crystallized_thread: Nullable (only present during SPARRING when connection made)
 * - cryptographic_proof_of_cognition: Nullable (only present when THESIS_ACHIEVED)
 */
export const SocraticResponseSchema = z.object({
  socratic_response: z.string().min(1, 'Socratic response cannot be empty'),
  loom_status: z.enum(['SPARRING', 'THESIS_ACHIEVED']),
  crystallized_thread: z.string().nullable(),
  cryptographic_proof_of_cognition: z.string().nullable(),
});

/**
 * TypeScript type inferred from schema
 */
export type SocraticResponse = z.infer<typeof SocraticResponseSchema>;

/**
 * Convert Zod schema to JSON Schema for Gemini API
 * 
 * Gemini's structured output requires JSON Schema format.
 * This utility converts our Zod schema to the required format.
 */
export function zodToJsonSchema(schema: typeof SocraticResponseSchema) {
  return {
    type: SchemaType.OBJECT,
    properties: {
      socratic_response: {
        type: SchemaType.STRING,
        description: 'The Socratic question or pushback to guide the student',
      },
      loom_status: {
        type: SchemaType.STRING,
        enum: ['SPARRING', 'THESIS_ACHIEVED'],
        description: 'Current session status - SPARRING during dialogue, THESIS_ACHIEVED when synthesis complete',
      },
      crystallized_thread: {
        type: SchemaType.STRING,
        nullable: true,
        description: 'One-sentence academic summary when student makes valid micro-connection between concepts. Null if no connection detected.',
      },
      cryptographic_proof_of_cognition: {
        type: SchemaType.STRING,
        nullable: true,
        description: 'Clinical audit proving HOW student arrived at thesis. Only populated when loom_status is THESIS_ACHIEVED.',
      },
    },
    required: ['socratic_response', 'loom_status'],
  } as const;
}

/**
 * Validate and parse Gemini response
 * 
 * @param response - Raw response from Gemini API
 * @returns Parsed and validated SocraticResponse
 * @throws ZodError if validation fails
 */
export function parseSocraticResponse(response: unknown): SocraticResponse {
  return SocraticResponseSchema.parse(response);
}

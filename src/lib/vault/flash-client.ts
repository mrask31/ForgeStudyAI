/**
 * Gemini Flash Interrogator Client
 * 
 * Lightweight client for Gemini 1.5 Flash active recall testing.
 * No caching, no conversation history - just fast single-turn interactions.
 * 
 * Performance targets:
 * - Question generation: <1 second at 95th percentile
 * - Answer evaluation: <2 seconds at 95th percentile
 * - Cost: ~$0.001 per question/evaluation pair
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  buildFlashInterrogatorPrompt, 
  buildFlashEvaluatorPrompt 
} from './flash-prompt';
import { 
  parseFlashQuestion, 
  parseFlashEvaluation,
  FlashQuestion,
  FlashEvaluation 
} from './flash-schemas';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export interface ProofEvent {
  concept: string;
  transcript_excerpt: string;
  student_analogy?: string;
  timestamp: string;
}

/**
 * Flash Interrogator Client
 * 
 * Configured for speed and cost optimization:
 * - Model: gemini-1.5-flash (fastest, cheapest)
 * - Temperature: 0.3 (low for consistent evaluation)
 * - Max tokens: 512 (short responses only)
 * - Response format: JSON (prevents conversational drift)
 */
export class FlashInterrogatorClient {
  private model;
  
  constructor() {
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.3, // Low temperature for consistent evaluation
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 512, // Short responses only
        responseMimeType: 'application/json',
      },
    });
  }
  
  /**
   * Generate active recall question
   * 
   * Uses student's historical proof events to create a personalized
   * question that tests memory retention.
   * 
   * @param topicTitle - Title of the Ghost Node topic
   * @param proofEvents - Historical learning context
   * @returns Question and context reference
   * @throws Error if AI returns invalid response or rate limit exceeded
   */
  async generateQuestion(
    topicTitle: string,
    proofEvents: ProofEvent[]
  ): Promise<FlashQuestion> {
    try {
      const prompt = buildFlashInterrogatorPrompt(topicTitle, proofEvents);
      
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error('[FlashClient] JSON parse error:', parseError);
        console.error('[FlashClient] Raw response:', text);
        throw new Error('AI returned invalid response format');
      }
      
      return parseFlashQuestion(json);
      
    } catch (error: any) {
      return this.handleError(error, 'generateQuestion');
    }
  }
  
  /**
   * Evaluate student's answer
   * 
   * Compares student's response against original learning context
   * and returns binary pass/fail with brief feedback.
   * 
   * @param question - The question that was asked
   * @param studentAnswer - Student's response
   * @param topicTitle - Title of the topic
   * @param proofEvents - Historical learning context
   * @returns Evaluation with pass/fail and feedback
   * @throws Error if AI returns invalid response or rate limit exceeded
   */
  async evaluateAnswer(
    question: string,
    studentAnswer: string,
    topicTitle: string,
    proofEvents: ProofEvent[]
  ): Promise<FlashEvaluation> {
    try {
      const prompt = buildFlashEvaluatorPrompt(
        question,
        studentAnswer,
        topicTitle,
        proofEvents
      );
      
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error('[FlashClient] JSON parse error:', parseError);
        console.error('[FlashClient] Raw response:', text);
        throw new Error('AI returned invalid response format');
      }
      
      return parseFlashEvaluation(json);
      
    } catch (error: any) {
      return this.handleError(error, 'evaluateAnswer');
    }
  }
  
  /**
   * Handle errors from Gemini API
   * 
   * Provides user-friendly error messages for common failure modes:
   * - Rate limits (429)
   * - Timeouts
   * - Validation errors (Zod)
   * - Generic errors
   * 
   * @param error - Error object from API or validation
   * @param operation - Name of the operation that failed
   * @throws Error with user-friendly message
   */
  private handleError(error: any, operation: string): never {
    // Handle rate limits
    if (error?.status === 429) {
      console.error(`[FlashClient] Rate limit exceeded in ${operation}`);
      throw new Error('AI service is busy. Please wait a moment and try again.');
    }
    
    // Handle timeouts
    if (error?.message?.includes('timeout')) {
      console.error(`[FlashClient] Timeout in ${operation}`);
      throw new Error('Request timed out. Please try again.');
    }
    
    // Handle validation errors
    if (error?.name === 'ZodError') {
      console.error(`[FlashClient] Validation error in ${operation}:`, error);
      throw new Error('AI returned unexpected response format');
    }
    
    // Generic error
    console.error(`[FlashClient] Error in ${operation}:`, error);
    throw new Error('Failed to process request. Please try again.');
  }
}

/**
 * Create Flash Interrogator Client
 * 
 * Factory function for creating a configured Flash client.
 * Use this instead of direct instantiation.
 * 
 * @returns Configured FlashInterrogatorClient instance
 */
export function createFlashClient(): FlashInterrogatorClient {
  return new FlashInterrogatorClient();
}

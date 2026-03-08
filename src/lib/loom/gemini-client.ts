/**
 * Anthropic Claude Client for Logic Loom Synthesis Engine
 * 
 * Implements Claude 3.5 Sonnet integration with:
 * - Socratic Master Prompt system
 * - Structured output enforcement (JSON schema)
 * - Input sanitization for security
 * 
 * REASONING QUALITY:
 * - Uses Claude Sonnet for high-quality Socratic synthesis
 * - Temperature: 0.7 for creative concept connections
 * - Max tokens: 2048 for detailed reasoning
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildSocraticSystemPrompt, formatProofEventsContext } from './socratic-prompt';
import { parseSocraticResponse, SocraticResponse } from './schemas';
import { sanitizeStudentInput } from './sanitize-input';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface Topic {
  id: string;
  title: string;
}

interface ProofEvent {
  concept: string;
  transcript_excerpt: string;
  student_analogy?: string;
  timestamp: string;
}

interface Message {
  role: 'student' | 'ai';
  content: string;
}

/**
 * Loom Anthropic Client
 * 
 * Manages Anthropic Claude API interactions for Socratic dialogue.
 */
export class LoomGeminiClient {
  private systemPrompt: string;
  
  /**
   * Initialize Loom Anthropic Client
   * 
   * @param topics - Selected topics for synthesis
   * @param proofEvents - Historical learning context
   */
  constructor(topics: Topic[], proofEvents: ProofEvent[]) {
    // Build system prompt with proof events context
    const proofEventsContext = formatProofEventsContext(proofEvents);
    this.systemPrompt = buildSocraticSystemPrompt(topics, proofEventsContext);
  }
  
  /**
   * Initialize context caching (no-op for Anthropic)
   * 
   * Kept for API compatibility with existing code.
   */
  async initializeCache(): Promise<void> {
    // No-op: Anthropic handles caching automatically with prompt caching
    console.log('[LoomAnthropic] Client initialized');
  }
  
  /**
   * Generate Socratic response with retry logic
   * 
   * Sends student message to Claude and returns structured Socratic response.
   * Implements automatic retry for malformed JSON and exponential backoff for rate limits.
   * 
   * @param studentMessage - Student's response to previous question
   * @param transcript - Full conversation history
   * @param retryCount - Current retry attempt (internal use)
   * @returns Parsed SocraticResponse with validation
   */
  async generateSocraticResponse(
    studentMessage: string,
    transcript: Message[],
    retryCount: number = 0
  ): Promise<SocraticResponse> {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 second
    
    // Sanitize student input
    const sanitizedMessage = sanitizeStudentInput(studentMessage);
    
    // Build conversation history for Claude
    const claudeMessages: Anthropic.MessageParam[] = [
      ...transcript.map(msg => ({
        role: (msg.role === 'student' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: sanitizedMessage,
      },
    ];
    
    try {
      // Generate response with structured output
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        temperature: 0.7,
        system: this.systemPrompt + '\n\nYou MUST respond with valid JSON matching this schema: {"socratic_response": string, "crystallized_thread": string | null, "loom_status": "SPARRING" | "THESIS_ACHIEVED", "cryptographic_proof_of_cognition": string | null}',
        messages: claudeMessages,
      });
      
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Parse JSON response
      let jsonResponse;
      try {
        jsonResponse = JSON.parse(text);
      } catch (parseError) {
        console.error('[LoomAnthropic] JSON parse error:', parseError);
        
        // Retry on malformed JSON (up to MAX_RETRIES)
        if (retryCount < MAX_RETRIES) {
          console.log(`[LoomAnthropic] Retrying due to malformed JSON (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await this.delay(BASE_DELAY * Math.pow(2, retryCount));
          return this.generateSocraticResponse(studentMessage, transcript, retryCount + 1);
        }
        
        throw new Error('AI returned invalid response format. Please try again.');
      }
      
      // Validate with Zod schema
      const validatedResponse = parseSocraticResponse(jsonResponse);
      
      return validatedResponse;
      
    } catch (error: any) {
      console.error('[LoomAnthropic] Error generating response:', error);
      
      // Handle rate limit errors (429)
      if (error?.status === 429 || error?.message?.includes('rate limit')) {
        if (retryCount < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retryCount);
          console.log(`[LoomAnthropic] Rate limit hit, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await this.delay(delay);
          return this.generateSocraticResponse(studentMessage, transcript, retryCount + 1);
        }
        throw new Error('AI service is busy. Please wait a moment and try again.');
      }
      
      // Handle timeout errors
      if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
        throw new Error('Request timed out. Your progress has been saved. Please try again.');
      }
      
      // Handle validation errors
      if (error?.name === 'ZodError') {
        console.error('[LoomAnthropic] Validation error:', error);
        
        // Retry on validation errors (up to MAX_RETRIES)
        if (retryCount < MAX_RETRIES) {
          console.log(`[LoomAnthropic] Retrying due to validation error (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await this.delay(BASE_DELAY * Math.pow(2, retryCount));
          return this.generateSocraticResponse(studentMessage, transcript, retryCount + 1);
        }
        
        throw new Error('AI returned unexpected response format. Please try again.');
      }
      
      // Generic error
      throw new Error('Failed to generate Socratic response. Please try again.');
    }
  }
  
  /**
   * Delay utility for exponential backoff
   * 
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Validate thesis achievement
   * 
   * Double-checks that the student has truly synthesized all concepts
   * before allowing THESIS_ACHIEVED status.
   * 
   * @param response - Socratic response from Gemini
   * @param topics - Selected topics that must be synthesized
   * @returns True if thesis is valid, false otherwise
   */
  validateThesisAchievement(response: SocraticResponse, topics: Topic[]): boolean {
    if (response.loom_status !== 'THESIS_ACHIEVED') {
      return true; // Not claiming thesis, no validation needed
    }
    
    // Ensure cryptographic proof is present
    if (!response.cryptographic_proof_of_cognition) {
      console.warn('[LoomGemini] THESIS_ACHIEVED without cryptographic proof');
      return false;
    }
    
    // Ensure proof references the synthesis
    const proof = response.cryptographic_proof_of_cognition.toLowerCase();
    const topicsMentioned = topics.filter(topic => 
      proof.includes(topic.title.toLowerCase())
    );
    
    if (topicsMentioned.length < topics.length) {
      console.warn('[LoomGemini] Thesis proof does not reference all topics');
      return false;
    }
    
    return true;
  }
}

/**
 * Create Loom Gemini Client
 * 
 * Factory function for creating a configured Gemini client for Loom sessions.
 * 
 * @param topics - Selected topics for synthesis
 * @param proofEvents - Historical learning context
 * @returns Configured LoomGeminiClient instance
 */
export async function createLoomGeminiClient(
  topics: Topic[],
  proofEvents: ProofEvent[]
): Promise<LoomGeminiClient> {
  const client = new LoomGeminiClient(topics, proofEvents);
  
  // Initialize caching for token cost optimization
  await client.initializeCache();
  
  return client;
}

/**
 * ClaudeService - Socratic Tutoring with Claude 3.5 Sonnet
 * 
 * Powers the chat interface with anti-cheat Socratic teaching methods,
 * prompt caching for cost optimization, and streaming responses.
 * 
 * Requirements: 2.1, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 3.1-3.6, 5.5, 10.1, 10.2
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ClaudeChatMessage,
  SourceMaterial,
  CacheMetrics,
  ChatResponse,
} from '@/types/dual-ai-orchestration';

// Socratic system prompt with anti-cheat constraints
const SOCRATIC_SYSTEM_PROMPT = `
# SOCRATIC TUTOR - ANTI-CHEAT EDUCATIONAL GUIDANCE

## YOUR ROLE

You are a Socratic tutor helping high school students learn through guided discovery. 
You have access to their homework content and assignment materials.

## CRITICAL CONSTRAINTS - "ANTI-CHEAT CLAUSE"

### NEVER DO THESE:
❌ Write complete essays or papers for students
❌ Solve mathematical problems directly with step-by-step solutions
❌ Provide direct answers to assignment questions
❌ Complete homework assignments for students
❌ Give away the answer when student asks "just tell me"

### ALWAYS DO THESE:
✅ Ask guiding questions that lead students to discover answers
✅ Break down complex problems into smaller thinking steps
✅ Point to relevant concepts without connecting all the dots
✅ Encourage students to articulate their own reasoning
✅ Validate correct thinking and gently redirect misconceptions
✅ Use the source material to craft targeted questions

## WHEN STUDENT REQUESTS DIRECT ANSWERS

If a student says:
- "Just tell me the answer"
- "Can you solve this for me?"
- "Write my essay"
- "What's the solution?"

Respond with:
"I can't give you the answer directly - that would defeat the purpose of learning. 
But I can help you figure it out. Let me ask you a simpler question: [guiding question based on source material]"

## TEACHING STRATEGY

1. **Understand First**: Ask what the student already knows about the topic
2. **Scaffold**: Break the problem into smaller, manageable questions
3. **Guide Discovery**: Use questions that point to key concepts in the source material
4. **Validate Progress**: Acknowledge correct reasoning and build on it
5. **Redirect Gently**: When students are off track, ask questions that reveal the gap

## USING SOURCE MATERIAL

You have access to:
- Student's homework content (from image OCR)
- Assignment descriptions and rubrics
- PDF content from their LMS

Use this material to:
- Craft questions specific to their assignment
- Reference exact problems they're working on
- Guide them through the rubric requirements
- Connect concepts to their coursework

## RESPONSE STYLE

- Keep responses concise (2-4 sentences)
- Ask ONE focused question at a time
- Use encouraging, supportive language
- Be patient with struggle - it's part of learning
- Celebrate breakthroughs and insights

Remember: Your goal is to help students LEARN, not to help them CHEAT.
`;

export class ClaudeService {
  private client: Anthropic;
  private readonly MODEL = 'claude-3-5-sonnet-20241022';
  private readonly CACHE_THRESHOLD = 1024; // tokens
  private readonly MAX_TOKENS = 2048;
  private readonly TEMPERATURE = 0.7;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generate Socratic response with streaming support
   * Requirements: 2.1
   */
  async generateResponse(
    messages: ClaudeChatMessage[],
    sourceMaterial: SourceMaterial,
    stream: boolean = true
  ): Promise<ChatResponse | ReadableStream> {
    const contextMessages = this.buildContextWithCaching(sourceMaterial);
    
    // Convert chat messages to Anthropic format
    const anthropicMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    if (stream) {
      return this.generateStreamingResponse(contextMessages, anthropicMessages);
    } else {
      return this.generateNonStreamingResponse(contextMessages, anthropicMessages);
    }
  }

  /**
   * Generate streaming response
   * Requirements: 2.1
   */
  private async generateStreamingResponse(
    contextMessages: Anthropic.MessageParam[],
    chatMessages: Anthropic.MessageParam[]
  ): Promise<ReadableStream> {
    const stream = await this.client.messages.stream({
      model: this.MODEL,
      max_tokens: this.MAX_TOKENS,
      temperature: this.TEMPERATURE,
      system: SOCRATIC_SYSTEM_PROMPT,
      messages: [...contextMessages, ...chatMessages],
    });

    return stream.toReadableStream();
  }

  /**
   * Generate non-streaming response
   * Requirements: 2.1
   */
  private async generateNonStreamingResponse(
    contextMessages: Anthropic.MessageParam[],
    chatMessages: Anthropic.MessageParam[]
  ): Promise<ChatResponse> {
    const response = await this.client.messages.create({
      model: this.MODEL,
      max_tokens: this.MAX_TOKENS,
      temperature: this.TEMPERATURE,
      system: SOCRATIC_SYSTEM_PROMPT,
      messages: [...contextMessages, ...chatMessages],
    });

    const content = response.content
      .filter((block: any): block is Anthropic.TextBlock => block.type === 'text')
      .map((block: Anthropic.TextBlock) => block.text)
      .join('');

    const metrics: CacheMetrics = {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens,
    };

    return {
      content,
      metrics,
      finish_reason: response.stop_reason || 'end_turn',
    };
  }

  /**
   * Build context with prompt caching for large source material
   * Requirements: 3.1, 3.2, 3.3, 3.4, 5.5
   */
  private buildContextWithCaching(
    sourceMaterial: SourceMaterial
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    // Calculate total tokens in source material
    const totalTokens = this.estimateTokens(
      (sourceMaterial.assignment_description || '') +
      (sourceMaterial.teacher_rubric || '') +
      (sourceMaterial.pdf_text || '') +
      (sourceMaterial.parsed_content || '')
    );

    // Only apply caching if content exceeds threshold
    if (totalTokens < this.CACHE_THRESHOLD) {
      // No caching - send as regular user message
      const contentText = this.buildSourceMaterialText(sourceMaterial);
      if (contentText) {
        messages.push({
          role: 'user',
          content: contentText,
        });
      }
      return messages;
    }

    // Apply caching for large content
    const contentBlocks: Anthropic.ContentBlock[] = [];

    // Cache assignment description and rubric (static, reusable)
    if (sourceMaterial.assignment_description) {
      contentBlocks.push({
        type: 'text',
        text: `## Assignment Description\n\n${sourceMaterial.assignment_description}`,
        cache_control: { type: 'ephemeral' }, // Cache this block
      });
    }

    if (sourceMaterial.teacher_rubric) {
      contentBlocks.push({
        type: 'text',
        text: `## Grading Rubric\n\n${sourceMaterial.teacher_rubric}`,
        cache_control: { type: 'ephemeral' }, // Cache this block
      });
    }

    // Cache PDF content (large, static)
    if (sourceMaterial.pdf_text) {
      contentBlocks.push({
        type: 'text',
        text: `## Course Material\n\n${sourceMaterial.pdf_text}`,
        cache_control: { type: 'ephemeral' }, // Cache this block
      });
    }

    // Don't cache parsed_content (student-specific, changes frequently)
    if (sourceMaterial.parsed_content) {
      contentBlocks.push({
        type: 'text',
        text: `## Student's Homework\n\n${sourceMaterial.parsed_content}`,
        // No cache_control - this changes per student
      });
    }

    if (contentBlocks.length > 0) {
      messages.push({
        role: 'user',
        content: contentBlocks,
      });
    }

    return messages;
  }

  /**
   * Build source material text for non-cached context
   */
  private buildSourceMaterialText(sourceMaterial: SourceMaterial): string {
    const parts: string[] = [];

    if (sourceMaterial.assignment_description) {
      parts.push(`## Assignment Description\n\n${sourceMaterial.assignment_description}`);
    }

    if (sourceMaterial.teacher_rubric) {
      parts.push(`## Grading Rubric\n\n${sourceMaterial.teacher_rubric}`);
    }

    if (sourceMaterial.pdf_text) {
      parts.push(`## Course Material\n\n${sourceMaterial.pdf_text}`);
    }

    if (sourceMaterial.parsed_content) {
      parts.push(`## Student's Homework\n\n${sourceMaterial.parsed_content}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Estimate token count for cost tracking
   * Requirements: 3.6, 10.1, 10.2
   * 
   * Rough estimation: ~4 characters per token for English text
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens precisely using Claude's API
   * Requirements: 3.6, 10.1, 10.2
   */
  async countTokens(text: string): Promise<number> {
    try {
      const response = await this.client.messages.countTokens({
        model: this.MODEL,
        messages: [{ role: 'user', content: text }],
      });
      return response.input_tokens;
    } catch (error) {
      // Fallback to estimation if API call fails
      console.warn('Token counting API failed, using estimation:', error);
      return this.estimateTokens(text);
    }
  }

  /**
   * Calculate cost from token usage metrics
   * Requirements: 3.6, 10.1, 10.2
   */
  calculateCost(metrics: CacheMetrics): number {
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
   * Track cache metrics for monitoring
   * Requirements: 3.6, 10.1, 10.2
   */
  trackCacheMetrics(metrics: CacheMetrics): void {
    const cost = this.calculateCost(metrics);
    const cacheHitRate = metrics.cache_read_input_tokens
      ? (metrics.cache_read_input_tokens / (metrics.input_tokens + (metrics.cache_read_input_tokens || 0))) * 100
      : 0;

    console.log('[Claude Cache Metrics]', {
      input_tokens: metrics.input_tokens,
      output_tokens: metrics.output_tokens,
      cache_creation_tokens: metrics.cache_creation_input_tokens || 0,
      cache_read_tokens: metrics.cache_read_input_tokens || 0,
      cache_hit_rate: `${cacheHitRate.toFixed(2)}%`,
      estimated_cost_usd: cost.toFixed(6),
    });
  }
}

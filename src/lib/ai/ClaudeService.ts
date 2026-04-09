/**
 * ClaudeService - Socratic Tutoring with Claude Sonnet 4.6
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

## STRUGGLE DETECTION AND SCAFFOLDING

Monitor the conversation for signs a student is stuck or frustrated.
Signs include:
- Repeating the same wrong answer more than twice
- Messages like "I don't get it", "I don't understand", "just tell me", "this makes no sense", "I give up", "idk", "???"
- Three or more consecutive incorrect attempts on the same concept

When struggle is detected, do NOT give the answer. Instead, shift your approach in this order:

1. First: Acknowledge their frustration warmly. "That's a tough one — let's try a different angle."
2. Second: Break the problem into a smaller step. Instead of asking about the full concept, ask about one component of it.
3. Third: Use a concrete real-world analogy relevant to their interests if known, or a universally relatable example (sports, food, money, video games).
4. Fourth: If still stuck after all of the above, give a partial worked example — show HOW to think through a similar (not identical) problem, then ask them to apply that thinking to their original problem.
5. Never: Give the direct answer to their homework or test question. Never say "the answer is X." The goal is understanding, not completion.

Recovery language to use when a student is frustrated:
- "Let's slow down — you're closer than you think."
- "This trips up a lot of people. Let's approach it differently."
- "What part feels most confusing right now?"
- "Let's forget the big question for a second. Do you know what [smaller concept] means?"

Always end a struggle response with a question — never leave the student with a statement they have to respond to without direction.

## SESSION CLOSURE

When you assess that a student has genuinely demonstrated understanding of the concept they came to learn — through their own explanation, a correct application, or clear mastery signals — close the loop with this pattern:

1. Affirm specifically what they got right (not generic praise)
2. Tell them they're ready to try it independently
3. End your message with exactly this phrase on its own line:
   "READY_TO_GO"

Only use READY_TO_GO when genuine mastery is demonstrated. Never use it to end a conversation prematurely. Maximum once per session.

## TEST RECOVERY MODE

If any student message contains phrases like "failed", "bombed", "bad grade", "got an F", "didn't do well", or starts with "I just got my test back", activate recovery mode:
- Be warm and non-judgmental
- Focus on identifying what went wrong, not the grade
- Ask "What part felt hardest on the test?" before diving into content
- Help them build a review plan, not dwell on the result

Remember: Your goal is to help students LEARN, not to help them CHEAT.
`;

export class ClaudeService {
  private client: Anthropic;
  private readonly MODEL = 'claude-sonnet-4-6';
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
    stream: boolean = true,
    systemPromptPrefix: string = ''
  ): Promise<ChatResponse | ReadableStream> {
    const contextMessages = this.buildContextWithCaching(sourceMaterial);

    // Convert chat messages to Anthropic format
    const anthropicMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const systemPrompt = systemPromptPrefix + SOCRATIC_SYSTEM_PROMPT;

    if (stream) {
      return this.generateStreamingResponse(contextMessages, anthropicMessages, systemPrompt);
    } else {
      return this.generateNonStreamingResponse(contextMessages, anthropicMessages, systemPrompt);
    }
  }

  /**
   * Generate streaming response
   * Requirements: 2.1
   */
  private async generateStreamingResponse(
    contextMessages: Anthropic.MessageParam[],
    chatMessages: Anthropic.MessageParam[],
    systemPrompt: string = SOCRATIC_SYSTEM_PROMPT
  ): Promise<ReadableStream> {
    const stream = await this.client.messages.stream({
      model: this.MODEL,
      max_tokens: this.MAX_TOKENS,
      temperature: this.TEMPERATURE,
      system: systemPrompt,
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
    chatMessages: Anthropic.MessageParam[],
    systemPrompt: string = SOCRATIC_SYSTEM_PROMPT
  ): Promise<ChatResponse> {
    const response = await this.client.messages.create({
      model: this.MODEL,
      max_tokens: this.MAX_TOKENS,
      temperature: this.TEMPERATURE,
      system: systemPrompt,
      messages: [...contextMessages, ...chatMessages],
    });

    const content = response.content
      .filter((block: any): block is Anthropic.TextBlock => block.type === 'text')
      .map((block: Anthropic.TextBlock) => block.text)
      .join('');

    const metrics: CacheMetrics = {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? undefined,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? undefined,
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
    const contentBlocks: any[] = [];

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

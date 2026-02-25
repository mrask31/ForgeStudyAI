/**
 * Understanding Validator
 * 
 * Multi-stage AI-powered validation pipeline that assesses student understanding:
 * 1. Detect insufficient responses (parroting, keyword stuffing, vague acknowledgment)
 * 2. Assess comprehension depth (key concepts, relationships, misconceptions)
 * 3. Classify and generate guidance (pass/partial/retry)
 * 
 * Uses strict zod schemas to prevent "stringly typed" drift.
 */

import { z } from 'zod';
import type {
  ValidationResult,
  InsufficientResponseCheck,
  ComprehensionAssessment,
  Message,
  ValidationClassification,
} from './types';

// ============================================
// Zod Schemas for AI Output Validation
// ============================================

const InsufficientResponseCheckSchema = z.object({
  isInsufficient: z.boolean(),
  isParroting: z.boolean(),
  isKeywordStuffing: z.boolean(),
  isVagueAcknowledgment: z.boolean(),
  reason: z.string(),
});

const ComprehensionAssessmentSchema = z.object({
  keyConcepts: z.array(z.string()),
  relationships: z.array(z.string()),
  misconceptions: z.array(z.string()),
  depthAssessment: z.string(),
  gradeLevel: z.number(),
});

const ValidationResultSchema = z.object({
  classification: z.enum(['pass', 'partial', 'retry']),
  keyConcepts: z.array(z.string()),
  relationships: z.array(z.string()),
  misconceptions: z.array(z.string()),
  depthAssessment: z.string(),
  guidance: z.string(),
  isParroting: z.boolean(),
  isKeywordStuffing: z.boolean(),
  isVagueAcknowledgment: z.boolean(),
});

// ============================================
// Understanding Validator Class
// ============================================

export class UnderstandingValidator {
  private readonly VALIDATION_TIMEOUT = 3000; // 3 seconds
  private readonly callAI: (prompt: string) => Promise<string>;

  /**
   * Constructor with dependency injection
   * 
   * @param callAI - Optional AI service function (defaults to throwing error)
   */
  constructor(callAI?: (prompt: string) => Promise<string>) {
    this.callAI = callAI || this.defaultCallAI;
  }

  /**
   * Default AI service (throws error to trigger fallback)
   */
  private async defaultCallAI(prompt: string): Promise<string> {
    throw new Error('AI service not implemented - using fallback');
  }

  /**
   * Main validation entry point
   * 
   * Runs multi-stage validation pipeline with timeout and error handling.
   * 
   * @param studentResponse - Student's explanation attempt
   * @param teachingContext - Recent conversation messages
   * @param explainBackPrompt - The checkpoint prompt
   * @param gradeLevel - Student's grade level (6-12)
   * @returns Validation result with classification and guidance
   */
  async validate(
    studentResponse: string,
    teachingContext: Message[],
    explainBackPrompt: string,
    gradeLevel: number
  ): Promise<ValidationResult> {
    try {
      // Create timeout with cleanup
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<ValidationResult>((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn('[UnderstandingValidator] Validation timeout - using fallback');
          resolve({
            classification: 'partial',
            keyConcepts: [],
            relationships: [],
            misconceptions: [],
            depthAssessment: 'Validation timeout',
            guidance: 'Let me think about that differently...',
            isParroting: false,
            isKeywordStuffing: false,
            isVagueAcknowledgment: false,
          });
        }, this.VALIDATION_TIMEOUT);
      });

      // Run validation with timeout
      const result = await Promise.race([
        this.runValidationPipeline(studentResponse, teachingContext, explainBackPrompt, gradeLevel),
        timeoutPromise,
      ]);

      // Clear timeout if validation completed first
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return result;
    } catch (error) {
      console.error('[UnderstandingValidator] Validation error:', error);
      return this.errorFallback(studentResponse, teachingContext);
    }
  }

  /**
   * Run the complete validation pipeline
   */
  private async runValidationPipeline(
    studentResponse: string,
    teachingContext: Message[],
    explainBackPrompt: string,
    gradeLevel: number
  ): Promise<ValidationResult> {
    // Stage 1: Detect insufficient responses
    const insufficientCheck = await this.detectInsufficientResponse(
      studentResponse,
      teachingContext
    );

    // If insufficient, return retry immediately
    if (insufficientCheck.isInsufficient) {
      return {
        classification: 'retry',
        keyConcepts: [],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'Insufficient response detected',
        guidance: 'I need to hear this in your own words so I know how to help you.',
        isParroting: insufficientCheck.isParroting,
        isKeywordStuffing: insufficientCheck.isKeywordStuffing,
        isVagueAcknowledgment: insufficientCheck.isVagueAcknowledgment,
      };
    }

    // Stage 2: Assess comprehension depth
    const comprehension = await this.assessComprehension(
      studentResponse,
      teachingContext,
      gradeLevel
    );

    // Stage 3: Classify and generate guidance
    return this.classifyAndGuide(insufficientCheck, comprehension);
  }

  /**
   * Stage 1: Detect insufficient responses
   * 
   * Uses AI to detect parroting, keyword stuffing, and vague acknowledgments.
   */
  async detectInsufficientResponse(
    studentResponse: string,
    teachingContext: Message[]
  ): Promise<InsufficientResponseCheck> {
    const teachingText = teachingContext
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join('\n\n');

    const prompt = `Analyze this student response for insufficient explanation patterns.

Teaching Context:
${teachingText}

Student Response:
${studentResponse}

Detect these patterns:
1. **Parroting**: Does the response closely match the teaching text? (high text similarity, same phrasing)
2. **Keyword Stuffing**: Are keywords listed without coherent explanation? (disconnected terms, no relationships)
3. **Vague Acknowledgment**: Is it just "I understand" or "got it" without substance?

Return JSON:
{
  "isInsufficient": boolean (true if ANY pattern detected),
  "isParroting": boolean,
  "isKeywordStuffing": boolean,
  "isVagueAcknowledgment": boolean,
  "reason": "brief explanation of what was detected"
}`;

    try {
      const response = await this.callAI(prompt);
      const parsed = JSON.parse(response);
      
      // Validate with zod schema
      const validated = InsufficientResponseCheckSchema.parse(parsed);
      return validated;
    } catch (error) {
      console.error('[UnderstandingValidator] Failed to parse insufficient response check:', error);
      
      // Fallback: heuristic check
      return this.heuristicInsufficientCheck(studentResponse, teachingText);
    }
  }

  /**
   * Stage 2: Assess comprehension depth
   * 
   * Uses AI to evaluate understanding with grade-level adaptation.
   */
  async assessComprehension(
    studentResponse: string,
    teachingContext: Message[],
    gradeLevel: number
  ): Promise<ComprehensionAssessment> {
    const teachingText = teachingContext
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join('\n\n');

    const depthExpectation = gradeLevel <= 8
      ? 'basic concept connections and simple explanations'
      : 'deeper analysis with sophisticated reasoning and nuanced understanding';

    const prompt = `Assess student understanding with grade-level adaptation.

Teaching Context:
${teachingText}

Student Explanation:
${studentResponse}

Grade Level: ${gradeLevel}
Expected Depth: ${depthExpectation}

Evaluate:
1. **Key Concepts**: Which important concepts are present in the explanation?
2. **Relationships**: What relationships between concepts are explained? (list them)
3. **Misconceptions**: Are there any critical misconceptions? (fundamentally wrong understanding)
4. **Depth Assessment**: Is the depth appropriate for grade ${gradeLevel}? Explain briefly.

Return JSON:
{
  "keyConcepts": ["concept1", "concept2", ...],
  "relationships": ["relationship1", "relationship2", ...],
  "misconceptions": ["misconception1", ...] (empty array if none),
  "depthAssessment": "brief assessment of depth",
  "gradeLevel": ${gradeLevel}
}`;

    try {
      const response = await this.callAI(prompt);
      const parsed = JSON.parse(response);
      
      // Validate with zod schema
      const validated = ComprehensionAssessmentSchema.parse(parsed);
      return validated;
    } catch (error) {
      console.error('[UnderstandingValidator] Failed to parse comprehension assessment:', error);
      
      // Fallback: minimal assessment
      return {
        keyConcepts: [],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'Unable to assess depth due to parsing error',
        gradeLevel,
      };
    }
  }

  /**
   * Stage 3: Classify and generate guidance
   * 
   * Deterministic classification logic based on validation results.
   */
  private classifyAndGuide(
    insufficientCheck: InsufficientResponseCheck,
    comprehension: ComprehensionAssessment
  ): ValidationResult {
    // Check for critical misconceptions (unsafe to hint forward)
    if (comprehension.misconceptions.length > 0) {
      return {
        classification: 'retry',
        keyConcepts: comprehension.keyConcepts,
        relationships: comprehension.relationships,
        misconceptions: comprehension.misconceptions,
        depthAssessment: comprehension.depthAssessment,
        guidance: "Let me clarify this concept - there's a common misunderstanding here.",
        isParroting: insufficientCheck.isParroting,
        isKeywordStuffing: insufficientCheck.isKeywordStuffing,
        isVagueAcknowledgment: insufficientCheck.isVagueAcknowledgment,
        diagnosticHint: this.generateDiagnosticHint(insufficientCheck, comprehension),
      };
    }

    // Check if key concepts are missing
    const hasConcepts = comprehension.keyConcepts.length > 0;
    const hasRelationships = comprehension.relationships.length > 0;

    if (!hasConcepts) {
      return {
        classification: 'partial',
        keyConcepts: comprehension.keyConcepts,
        relationships: comprehension.relationships,
        misconceptions: comprehension.misconceptions,
        depthAssessment: comprehension.depthAssessment,
        guidance: "You're on the right track! Can you explain the main concepts we discussed?",
        isParroting: insufficientCheck.isParroting,
        isKeywordStuffing: insufficientCheck.isKeywordStuffing,
        isVagueAcknowledgment: insufficientCheck.isVagueAcknowledgment,
      };
    }

    if (!hasRelationships) {
      return {
        classification: 'partial',
        keyConcepts: comprehension.keyConcepts,
        relationships: comprehension.relationships,
        misconceptions: comprehension.misconceptions,
        depthAssessment: comprehension.depthAssessment,
        guidance: 'Good start! Can you explain how these concepts connect to each other?',
        isParroting: insufficientCheck.isParroting,
        isKeywordStuffing: insufficientCheck.isKeywordStuffing,
        isVagueAcknowledgment: insufficientCheck.isVagueAcknowledgment,
      };
    }

    // Check depth appropriateness
    const depthKeywords = ['insufficient', 'shallow', 'surface', 'basic', 'needs more'];
    const depthIssue = depthKeywords.some(keyword => 
      comprehension.depthAssessment.toLowerCase().includes(keyword)
    );

    if (depthIssue) {
      return {
        classification: 'partial',
        keyConcepts: comprehension.keyConcepts,
        relationships: comprehension.relationships,
        misconceptions: comprehension.misconceptions,
        depthAssessment: comprehension.depthAssessment,
        guidance: 'Can you explain more about how these concepts work together?',
        isParroting: insufficientCheck.isParroting,
        isKeywordStuffing: insufficientCheck.isKeywordStuffing,
        isVagueAcknowledgment: insufficientCheck.isVagueAcknowledgment,
      };
    }

    // Pass: all checks passed
    return {
      classification: 'pass',
      keyConcepts: comprehension.keyConcepts,
      relationships: comprehension.relationships,
      misconceptions: comprehension.misconceptions,
      depthAssessment: comprehension.depthAssessment,
      guidance: 'Excellent explanation! You really understand this.',
      isParroting: insufficientCheck.isParroting,
      isKeywordStuffing: insufficientCheck.isKeywordStuffing,
      isVagueAcknowledgment: insufficientCheck.isVagueAcknowledgment,
    };
  }

  /**
   * Generate diagnostic hint for retry classification
   * 
   * ONE sentence explaining what's missing (not what's wrong).
   * Deterministic templates based on validation results.
   * NEVER includes student text verbatim.
   * NEVER stored or shown to parents.
   */
  private generateDiagnosticHint(
    insufficientCheck: InsufficientResponseCheck,
    comprehension: ComprehensionAssessment
  ): string | undefined {
    // Only generate for retry classification
    // Priority order: insufficient patterns > misconceptions > missing elements
    
    if (insufficientCheck.isParroting) {
      return "This repeats the explanation without showing your own understanding.";
    }
    
    if (insufficientCheck.isKeywordStuffing) {
      return "You listed terms, but didn't explain how they connect.";
    }
    
    if (insufficientCheck.isVagueAcknowledgment) {
      return "I need to hear the concept explained, not just acknowledged.";
    }
    
    if (comprehension.misconceptions.length > 0) {
      return "The explanation includes an idea that works differently than described.";
    }
    
    // Default for other retry cases
    return "The explanation is missing key parts of how this works.";
  }

  /**
   * Error fallback - use heuristics
   */
  private errorFallback(
    studentResponse: string,
    teachingContext: Message[]
  ): ValidationResult {
    const teachingText = teachingContext
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join(' ');

    const insufficientCheck = this.heuristicInsufficientCheck(studentResponse, teachingText);

    if (insufficientCheck.isInsufficient) {
      return {
        classification: 'retry',
        keyConcepts: [],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'Heuristic fallback',
        guidance: 'I need to hear this in your own words so I know how to help you.',
        isParroting: insufficientCheck.isParroting,
        isKeywordStuffing: insufficientCheck.isKeywordStuffing,
        isVagueAcknowledgment: insufficientCheck.isVagueAcknowledgment,
      };
    }

    // Default to partial for safety
    return {
      classification: 'partial',
      keyConcepts: [],
      relationships: [],
      misconceptions: [],
      depthAssessment: 'Heuristic fallback',
      guidance: 'Can you explain that in more detail?',
      isParroting: false,
      isKeywordStuffing: false,
      isVagueAcknowledgment: false,
    };
  }

  /**
   * Heuristic insufficient response check (fallback when AI fails)
   */
  private heuristicInsufficientCheck(
    studentResponse: string,
    teachingText: string
  ): InsufficientResponseCheck {
    const responseLower = studentResponse.toLowerCase().trim();
    
    // Check for vague acknowledgment
    const vaguePhrases = [
      'i understand',
      'got it',
      'makes sense',
      'i get it',
      'okay',
      'ok',
      'yes',
      'yeah',
      'sure',
    ];
    const isVague = vaguePhrases.some(phrase => responseLower === phrase || responseLower.startsWith(phrase + '.'));
    
    // Check for very short response (likely insufficient)
    const isShort = studentResponse.split(' ').length < 10;
    
    // Simple text similarity check (very basic)
    const responseWords = new Set(responseLower.split(/\s+/));
    const teachingWords = new Set(teachingText.toLowerCase().split(/\s+/));
    const commonWords = Array.from(responseWords).filter(w => teachingWords.has(w) && w.length > 4);
    const similarityRatio = commonWords.length / responseWords.size;
    const isParroting = similarityRatio > 0.7;
    
    // Check for keyword stuffing (many short phrases, few connectors)
    const connectors = ['because', 'therefore', 'so', 'which', 'that', 'when', 'where', 'how', 'why'];
    const hasConnectors = connectors.some(c => responseLower.includes(c));
    const isKeywordStuffing = !hasConnectors && responseWords.size > 5;
    
    const isInsufficient = isVague || (isShort && !hasConnectors) || isParroting;
    
    return {
      isInsufficient,
      isParroting,
      isKeywordStuffing,
      isVagueAcknowledgment: isVague,
      reason: isInsufficient 
        ? `Heuristic detection: ${isVague ? 'vague' : ''} ${isParroting ? 'parroting' : ''} ${isKeywordStuffing ? 'keyword stuffing' : ''}`
        : 'Passed heuristic checks',
    };
  }

}

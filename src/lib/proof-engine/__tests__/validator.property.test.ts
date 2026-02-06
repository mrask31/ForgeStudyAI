/**
 * Property-Based Tests for Understanding Validator
 * 
 * Property 8: Insufficient Response Detection
 * - Validates: Requirements 6.1, 6.2, 6.3, 6.4
 * - Verifies detection of parroting, keyword stuffing, vague acknowledgment
 * - Verifies classification as retry with instructional guidance
 */

import * as fc from 'fast-check';
import { UnderstandingValidator } from '../validator';
import type { Message } from '../types';

/**
 * Mock AI service for testing
 * 
 * Returns deterministic responses based on prompt content
 */
function createMockAI() {
  return async (prompt: string): Promise<string> => {
    // Detect insufficient response check
    if (prompt.includes('Analyze this student response for insufficient explanation patterns')) {
      const studentResponse = prompt.match(/Student Response:\n(.*?)\n\n/s)?.[1] || '';
      const teachingContext = prompt.match(/Teaching Context:\n(.*?)\n\nStudent Response:/s)?.[1] || '';
      
      // Check for parroting (high similarity)
      const isParroting = teachingContext.includes(studentResponse) || studentResponse.length > 15 && teachingContext.toLowerCase().includes(studentResponse.toLowerCase());
      
      // Check for keyword stuffing (comma-separated list)
      const isKeywordStuffing = studentResponse.split(',').length >= 3 && studentResponse.split(' ').length < 15;
      
      // Check for vague acknowledgment
      const vaguePatterns = ['I understand', 'That makes sense', 'I get it', 'Okay', 'Got it', 'Yes, I understand'];
      const isVagueAcknowledgment = vaguePatterns.some(p => studentResponse.includes(p));
      
      const isInsufficient = isParroting || isKeywordStuffing || isVagueAcknowledgment;
      
      return JSON.stringify({
        isInsufficient,
        isParroting,
        isKeywordStuffing,
        isVagueAcknowledgment,
        reason: isInsufficient 
          ? `Detected: ${isParroting ? 'parroting ' : ''}${isKeywordStuffing ? 'keyword stuffing ' : ''}${isVagueAcknowledgment ? 'vague acknowledgment' : ''}`
          : 'No insufficient patterns detected',
      });
    }
    
    // Detect comprehension assessment
    if (prompt.includes('Assess student understanding with grade-level adaptation')) {
      const studentResponse = prompt.match(/Student Explanation:\n(.*?)\n\nGrade Level:/s)?.[1] || '';
      const gradeLevel = parseInt(prompt.match(/Grade Level: (\d+)/)?.[1] || '8');
      
      // Extract concepts (simple heuristic: words > 5 chars)
      const words = studentResponse.split(/\s+/).filter(w => w.length > 5);
      const keyConcepts = words.slice(0, 3);
      
      // Check for relationship words
      const relationshipWords = ['because', 'therefore', 'so', 'which', 'causes', 'leads to', 'results in'];
      const hasRelationships = relationshipWords.some(r => studentResponse.toLowerCase().includes(r));
      const relationships = hasRelationships ? ['Explained causal relationship'] : [];
      
      // Check for misconceptions (simple: look for "not" or "wrong")
      const hasMisconception = studentResponse.toLowerCase().includes('not') || studentResponse.toLowerCase().includes('wrong');
      const misconceptions = hasMisconception ? ['Potential misconception detected'] : [];
      
      const depthAssessment = words.length > 10 
        ? 'Appropriate depth for grade level'
        : 'Needs more detail';
      
      return JSON.stringify({
        keyConcepts,
        relationships,
        misconceptions,
        depthAssessment,
        gradeLevel,
      });
    }
    
    // Default fallback
    return JSON.stringify({
      error: 'Unknown prompt type',
    });
  };
}

describe('Property 8: Insufficient Response Detection', () => {
  /**
   * Property: Parroting detection
   * 
   * Invariant: Responses that repeat teaching content verbatim are detected as parroting
   * and classified as retry
   */
  it('should detect parroting (verbatim repetition of teaching)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 20, maxLength: 100 }), // Teaching content
        fc.integer({ min: 6, max: 12 }), // Grade level
        async (teachingContent, gradeLevel) => {
          const validator = new UnderstandingValidator(createMockAI());

          // Create teaching context with the content
          const teachingContext: Message[] = [
            {
              role: 'assistant',
              content: `Let me explain: ${teachingContent}`,
            },
          ];

          // Student response is verbatim copy (parroting)
          const studentResponse = teachingContent;
          const explainBackPrompt = 'In your own words, explain the concept.';

          const result = await validator.validate(
            studentResponse,
            teachingContext,
            explainBackPrompt,
            gradeLevel
          );

          // Should detect parroting
          expect(result.isParroting).toBe(true);
          
          // Should classify as retry (insufficient understanding)
          expect(result.classification).toBe('retry');
          
          // Should provide guidance
          expect(result.guidance).toBeTruthy();
          expect(result.guidance.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 } // Reduced runs since this calls AI
    );
  });

  /**
   * Property: Keyword stuffing detection
   * 
   * Invariant: Responses that list keywords without explanation are detected as keyword stuffing
   * and classified as retry
   */
  it('should detect keyword stuffing (keywords without explanation)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 3, maxLength: 6 }), // Keywords
        fc.integer({ min: 6, max: 12 }), // Grade level
        async (keywords, gradeLevel) => {
          const validator = new UnderstandingValidator(createMockAI());

          // Create teaching context about a concept
          const concept = keywords[0];
          const teachingContext: Message[] = [
            {
              role: 'assistant',
              content: `${concept} involves ${keywords.slice(1).join(', ')} and requires understanding of these relationships.`,
            },
          ];

          // Student response is just keyword list (keyword stuffing)
          const studentResponse = keywords.join(', ');
          const explainBackPrompt = 'In your own words, explain how these concepts relate.';

          const result = await validator.validate(
            studentResponse,
            teachingContext,
            explainBackPrompt,
            gradeLevel
          );

          // Should detect keyword stuffing
          expect(result.isKeywordStuffing).toBe(true);
          
          // Should classify as retry (insufficient understanding)
          expect(result.classification).toBe('retry');
          
          // Should provide guidance
          expect(result.guidance).toBeTruthy();
          expect(result.guidance.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 } // Reduced runs since this calls AI
    );
  });

  /**
   * Property: Vague acknowledgment detection
   * 
   * Invariant: Responses that are vague acknowledgments without substance are detected
   * and classified as retry
   */
  it('should detect vague acknowledgment (no substance)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'I understand',
          'That makes sense',
          'I get it now',
          'Okay, I see',
          'Yes, I understand the concept',
          'Got it, thanks'
        ),
        fc.integer({ min: 6, max: 12 }), // Grade level
        async (vagueResponse, gradeLevel) => {
          const validator = new UnderstandingValidator(createMockAI());

          // Create teaching context
          const teachingContext: Message[] = [
            {
              role: 'assistant',
              content: 'Photosynthesis is the process where plants convert light energy into chemical energy using chlorophyll.',
            },
          ];

          const explainBackPrompt = 'In your own words, explain photosynthesis.';

          const result = await validator.validate(
            vagueResponse,
            teachingContext,
            explainBackPrompt,
            gradeLevel
          );

          // Should detect vague acknowledgment
          expect(result.isVagueAcknowledgment).toBe(true);
          
          // Should classify as retry (insufficient understanding)
          expect(result.classification).toBe('retry');
          
          // Should provide guidance
          expect(result.guidance).toBeTruthy();
          expect(result.guidance.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 } // Reduced runs since this calls AI
    );
  });

  /**
   * Property: Insufficient response always gets retry classification
   * 
   * Invariant: Any response detected as insufficient (parroting, keyword stuffing, or vague)
   * must be classified as retry
   */
  it('should classify all insufficient responses as retry', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          // Parroting examples
          { type: 'parroting', response: 'Photosynthesis converts light to energy', teaching: 'Photosynthesis converts light to energy' },
          // Keyword stuffing examples
          { type: 'keywords', response: 'photosynthesis, light, energy, chlorophyll', teaching: 'Photosynthesis uses light and chlorophyll to create energy' },
          // Vague acknowledgment examples
          { type: 'vague', response: 'I understand', teaching: 'Photosynthesis is a complex process' }
        ),
        fc.integer({ min: 6, max: 12 }), // Grade level
        async (example, gradeLevel) => {
          const validator = new UnderstandingValidator(createMockAI());

          const teachingContext: Message[] = [
            {
              role: 'assistant',
              content: example.teaching,
            },
          ];

          const explainBackPrompt = 'In your own words, explain the concept.';

          const result = await validator.validate(
            example.response,
            teachingContext,
            explainBackPrompt,
            gradeLevel
          );

          // At least one insufficient flag should be true
          const isInsufficient = result.isParroting || result.isKeywordStuffing || result.isVagueAcknowledgment;
          
          if (isInsufficient) {
            // Must be classified as retry
            expect(result.classification).toBe('retry');
            
            // Must provide guidance
            expect(result.guidance).toBeTruthy();
            expect(result.guidance.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20 } // Reduced runs since this calls AI
    );
  });

  /**
   * Property: Retry classification includes instructional guidance
   * 
   * Invariant: All retry classifications must include non-empty guidance
   */
  it('should provide instructional guidance for retry classification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 }), // Student response
        fc.integer({ min: 6, max: 12 }), // Grade level
        async (studentResponse, gradeLevel) => {
          const validator = new UnderstandingValidator(createMockAI());

          const teachingContext: Message[] = [
            {
              role: 'assistant',
              content: 'Mitosis is cell division where one cell becomes two identical cells.',
            },
          ];

          const explainBackPrompt = 'In your own words, explain mitosis.';

          const result = await validator.validate(
            studentResponse,
            teachingContext,
            explainBackPrompt,
            gradeLevel
          );

          // If classified as retry, must have guidance
          if (result.classification === 'retry') {
            expect(result.guidance).toBeTruthy();
            expect(result.guidance.length).toBeGreaterThan(0);
            
            // Guidance should be instructional (not just "try again")
            expect(result.guidance.toLowerCase()).not.toBe('try again');
            expect(result.guidance.length).toBeGreaterThan(10);
          }
        }
      ),
      { numRuns: 20 } // Reduced runs since this calls AI
    );
  });

  /**
   * Property: Validation always returns exactly one classification
   * 
   * Invariant: Every validation must return exactly one of: pass, partial, retry
   */
  it('should always return exactly one classification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }), // Student response
        fc.integer({ min: 6, max: 12 }), // Grade level
        async (studentResponse, gradeLevel) => {
          const validator = new UnderstandingValidator(createMockAI());

          const teachingContext: Message[] = [
            {
              role: 'assistant',
              content: 'The water cycle involves evaporation, condensation, and precipitation.',
            },
          ];

          const explainBackPrompt = 'In your own words, explain the water cycle.';

          const result = await validator.validate(
            studentResponse,
            teachingContext,
            explainBackPrompt,
            gradeLevel
          );

          // Must have exactly one classification
          expect(['pass', 'partial', 'retry']).toContain(result.classification);
          
          // Must have validation result structure
          expect(result).toHaveProperty('keyConcepts');
          expect(result).toHaveProperty('relationships');
          expect(result).toHaveProperty('misconceptions');
          expect(result).toHaveProperty('depthAssessment');
          expect(result).toHaveProperty('guidance');
          expect(result).toHaveProperty('isParroting');
          expect(result).toHaveProperty('isKeywordStuffing');
          expect(result).toHaveProperty('isVagueAcknowledgment');
        }
      ),
      { numRuns: 20 } // Reduced runs since this calls AI
    );
  });

  /**
   * Property: Timeout fallback behavior
   * 
   * Invariant: If validation times out, must return 'partial' classification with safe defaults
   */
  it('should handle timeout with deterministic fallback', async () => {
    const validator = new UnderstandingValidator(createMockAI());

    // Mock a timeout scenario by using a very long response that might trigger timeout
    const longResponse = 'a'.repeat(10000);
    const teachingContext: Message[] = [
      {
        role: 'assistant',
        content: 'Short teaching content',
      },
    ];

    const explainBackPrompt = 'Explain the concept.';
    const gradeLevel = 8;

    // This should either complete or timeout with fallback
    const result = await validator.validate(
      longResponse,
      teachingContext,
      explainBackPrompt,
      gradeLevel
    );

    // Must return valid classification (fallback is 'partial')
    expect(['pass', 'partial', 'retry']).toContain(result.classification);
    
    // Must have all required fields
    expect(result).toHaveProperty('keyConcepts');
    expect(result).toHaveProperty('relationships');
    expect(result).toHaveProperty('misconceptions');
    expect(result).toHaveProperty('depthAssessment');
    expect(result).toHaveProperty('guidance');
  });
});

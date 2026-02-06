/**
 * Unit Tests for Prompt Generator
 * 
 * Tests:
 * - Open-ended enforcement
 * - "In your own words" inclusion
 * - Grade-level phrasing differences
 * - Fallback behavior when context is empty
 */

import {
  generateExplainBackPrompt,
  validateOpenEnded,
  validateOwnWords,
} from '../prompt-generator';
import type { Message } from '../types';

describe('Prompt Generator', () => {
  describe('validateOpenEnded', () => {
    it('should reject yes/no questions starting with Is', () => {
      expect(validateOpenEnded('Is photosynthesis important?')).toBe(false);
    });

    it('should reject yes/no questions starting with Are', () => {
      expect(validateOpenEnded('Are you ready to continue?')).toBe(false);
    });

    it('should reject yes/no questions starting with Do', () => {
      expect(validateOpenEnded('Do you understand the concept?')).toBe(false);
    });

    it('should reject yes/no questions starting with Did', () => {
      expect(validateOpenEnded('Did you learn about cells?')).toBe(false);
    });

    it('should reject yes/no questions starting with Can', () => {
      expect(validateOpenEnded('Can you explain this?')).toBe(false);
    });

    it('should reject yes/no questions starting with Could', () => {
      expect(validateOpenEnded('Could you describe the process?')).toBe(false);
    });

    it('should reject yes/no questions starting with Would', () => {
      expect(validateOpenEnded('Would you like to try again?')).toBe(false);
    });

    it('should reject yes/no questions starting with Will', () => {
      expect(validateOpenEnded('Will you explain the concept?')).toBe(false);
    });

    it('should accept open-ended questions starting with What', () => {
      expect(validateOpenEnded('What is photosynthesis?')).toBe(true);
    });

    it('should accept open-ended questions starting with How', () => {
      expect(validateOpenEnded('How does photosynthesis work?')).toBe(true);
    });

    it('should accept open-ended questions starting with Why', () => {
      expect(validateOpenEnded('Why is photosynthesis important?')).toBe(true);
    });

    it('should accept imperative statements', () => {
      expect(validateOpenEnded('Explain photosynthesis in your own words.')).toBe(true);
    });
  });

  describe('validateOwnWords', () => {
    it('should accept prompts with "in your own words"', () => {
      expect(validateOwnWords('Explain photosynthesis in your own words.')).toBe(true);
    });

    it('should accept prompts with case variations', () => {
      expect(validateOwnWords('Explain photosynthesis In Your Own Words.')).toBe(true);
    });

    it('should reject prompts without "in your own words"', () => {
      expect(validateOwnWords('Explain photosynthesis.')).toBe(false);
    });
  });

  describe('generateExplainBackPrompt - fallback behavior', () => {
    it('should generate middle school fallback when context is empty (grade 8)', async () => {
      const prompt = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 8,
        concept: null,
      });

      expect(prompt).toMatch(/in your own words/i);
      expect(validateOpenEnded(prompt)).toBe(true);
      expect(validateOwnWords(prompt)).toBe(true);
      expect(prompt).toContain('the main idea we just covered');
    });

    it('should generate high school fallback when context is empty (grade 10)', async () => {
      const prompt = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 10,
        concept: null,
      });

      expect(prompt).toMatch(/in your own words/i);
      expect(validateOpenEnded(prompt)).toBe(true);
      expect(validateOwnWords(prompt)).toBe(true);
      expect(prompt).toContain('the main idea we just covered');
    });

    it('should use provided concept in middle school fallback', async () => {
      const prompt = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 7,
        concept: 'photosynthesis',
      });

      expect(prompt).toMatch(/in your own words/i);
      expect(prompt).toContain('photosynthesis');
      expect(prompt).toContain('give one example');
    });

    it('should use provided concept in high school fallback', async () => {
      const prompt = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 11,
        concept: 'cellular respiration',
      });

      expect(prompt).toMatch(/in your own words/i);
      expect(prompt).toContain('cellular respiration');
      expect(prompt).toContain('why');
    });
  });

  describe('generateExplainBackPrompt - grade level adaptation', () => {
    it('should use simpler phrasing for grade 6', async () => {
      const prompt = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 6,
        concept: 'fractions',
      });

      // Middle school template: simpler, one idea at a time
      expect(prompt).toMatch(/in your own words/i);
      expect(prompt).toContain('fractions');
      expect(prompt).toContain('give one example');
    });

    it('should use deeper reasoning for grade 12', async () => {
      const prompt = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 12,
        concept: 'calculus',
      });

      // High school template: deeper reasoning, why/how
      expect(prompt).toMatch(/in your own words/i);
      expect(prompt).toContain('calculus');
      expect(prompt).toContain('why');
    });

    it('should transition at grade 9 boundary', async () => {
      const promptGrade8 = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 8,
        concept: 'algebra',
      });

      const promptGrade9 = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 9,
        concept: 'algebra',
      });

      // Grade 8 should use middle school template
      expect(promptGrade8).toContain('give one example');

      // Grade 9 should use high school template
      expect(promptGrade9).toContain('why');
    });
  });

  describe('generateExplainBackPrompt - concept extraction', () => {
    it('should extract concept from message metadata', async () => {
      const teachingContext: Message[] = [
        {
          role: 'assistant',
          content: 'Let me explain photosynthesis...',
          metadata: {
            concept: 'photosynthesis',
            isTeachingExchange: true,
          },
        },
      ];

      const prompt = await generateExplainBackPrompt({
        teachingContext,
        gradeLevel: 8,
        concept: null,
      });

      expect(prompt).toMatch(/in your own words/i);
      expect(prompt).toContain('photosynthesis');
    });

    it('should use provided concept over extracted concepts', async () => {
      const teachingContext: Message[] = [
        {
          role: 'assistant',
          content: 'Let me explain photosynthesis...',
          metadata: {
            concept: 'photosynthesis',
            isTeachingExchange: true,
          },
        },
      ];

      const prompt = await generateExplainBackPrompt({
        teachingContext,
        gradeLevel: 8,
        concept: 'cellular respiration',
      });

      expect(prompt).toMatch(/in your own words/i);
      expect(prompt).toContain('cellular respiration');
    });

    it('should handle multiple concepts in teaching context', async () => {
      const teachingContext: Message[] = [
        {
          role: 'assistant',
          content: 'Let me explain photosynthesis...',
          metadata: {
            concept: 'photosynthesis',
            isTeachingExchange: true,
          },
        },
        {
          role: 'assistant',
          content: 'Now about cellular respiration...',
          metadata: {
            concept: 'cellular respiration',
            isTeachingExchange: true,
          },
        },
      ];

      const prompt = await generateExplainBackPrompt({
        teachingContext,
        gradeLevel: 10,
        concept: null,
      });

      expect(prompt).toMatch(/in your own words/i);
      // Should reference at least one of the concepts
      const hasPhotosynthesis = prompt.includes('photosynthesis');
      const hasCellularRespiration = prompt.includes('cellular respiration');
      expect(hasPhotosynthesis || hasCellularRespiration).toBe(true);
    });
  });

  describe('generateExplainBackPrompt - AI integration', () => {
    it('should use AI-generated prompt when callAI is provided and valid', async () => {
      const mockCallAI = jest.fn().mockResolvedValue(JSON.stringify({
        prompt: 'In your own words, explain how photosynthesis converts light energy into chemical energy.',
        referencedConcepts: ['photosynthesis', 'light energy', 'chemical energy'],
      }));

      const teachingContext: Message[] = [
        {
          role: 'assistant',
          content: 'Photosynthesis is the process by which plants convert light energy into chemical energy...',
          metadata: {
            concept: 'photosynthesis',
            isTeachingExchange: true,
          },
        },
      ];

      const prompt = await generateExplainBackPrompt({
        teachingContext,
        gradeLevel: 9,
        concept: 'photosynthesis',
      }, mockCallAI);

      expect(mockCallAI).toHaveBeenCalled();
      expect(prompt).toMatch(/in your own words/i);
      expect(prompt).toContain('photosynthesis');
      expect(validateOpenEnded(prompt)).toBe(true);
    });

    it('should fallback to template when AI returns yes/no question', async () => {
      const mockCallAI = jest.fn().mockResolvedValue(JSON.stringify({
        prompt: 'Can you explain photosynthesis in your own words?',
        referencedConcepts: ['photosynthesis'],
      }));

      const prompt = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 8,
        concept: 'photosynthesis',
      }, mockCallAI);

      // Should use fallback because AI prompt is yes/no
      expect(prompt).not.toBe('Can you explain photosynthesis in your own words?');
      expect(validateOpenEnded(prompt)).toBe(true);
      expect(validateOwnWords(prompt)).toBe(true);
    });

    it('should fallback to template when AI fails', async () => {
      const mockCallAI = jest.fn().mockRejectedValue(new Error('AI service unavailable'));

      const prompt = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 8,
        concept: 'photosynthesis',
      }, mockCallAI);

      expect(prompt).toMatch(/in your own words/i);
      expect(prompt).toContain('photosynthesis');
      expect(validateOpenEnded(prompt)).toBe(true);
    });

    it('should fallback to template when AI returns invalid JSON', async () => {
      const mockCallAI = jest.fn().mockResolvedValue('invalid json');

      const prompt = await generateExplainBackPrompt({
        teachingContext: [],
        gradeLevel: 8,
        concept: 'photosynthesis',
      }, mockCallAI);

      expect(prompt).toMatch(/in your own words/i);
      expect(prompt).toContain('photosynthesis');
      expect(validateOpenEnded(prompt)).toBe(true);
    });
  });
});

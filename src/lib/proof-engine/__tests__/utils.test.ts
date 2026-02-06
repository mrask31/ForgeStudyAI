/**
 * Unit tests for proof engine utilities
 */

import { sanitizeExcerpt, generateResponseHash, randomInt } from '../utils';

describe('sanitizeExcerpt', () => {
  it('should strip control characters', () => {
    const input = 'Hello\x00World\x1F!';
    const result = sanitizeExcerpt(input);
    expect(result).toBe('HelloWorld!');
  });

  it('should normalize whitespace', () => {
    const input = 'Hello    World\n\n\nTest';
    const result = sanitizeExcerpt(input);
    expect(result).toBe('Hello World Test');
  });

  it('should trim whitespace', () => {
    const input = '   Hello World   ';
    const result = sanitizeExcerpt(input);
    expect(result).toBe('Hello World');
  });

  it('should cap length to maxLength', () => {
    const input = 'a'.repeat(300);
    const result = sanitizeExcerpt(input, 200);
    expect(result.length).toBe(203); // 200 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('should handle empty string', () => {
    const result = sanitizeExcerpt('');
    expect(result).toBe('');
  });
});

describe('generateResponseHash', () => {
  it('should generate consistent hash for same input', async () => {
    const hash1 = await generateResponseHash('chat-1', 'response', '2024-01-01T00:00:00Z');
    const hash2 = await generateResponseHash('chat-1', 'response', '2024-01-01T00:00:00Z');
    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different input', async () => {
    const hash1 = await generateResponseHash('chat-1', 'response', '2024-01-01T00:00:00Z');
    const hash2 = await generateResponseHash('chat-2', 'response', '2024-01-01T00:00:00Z');
    expect(hash1).not.toBe(hash2);
  });

  it('should generate 64-character hex string', async () => {
    const hash = await generateResponseHash('chat-1', 'response', '2024-01-01T00:00:00Z');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('randomInt', () => {
  it('should generate integer in range', () => {
    for (let i = 0; i < 100; i++) {
      const result = randomInt(1, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('should handle single value range', () => {
    const result = randomInt(5, 5);
    expect(result).toBe(5);
  });
});

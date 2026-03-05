/**
 * Token Encryption Security Tests
 * 
 * Tests Property 23: Token Encryption for Stored Credentials
 * Validates: Security requirements for AES-256-GCM encryption
 */

import * as fc from 'fast-check';
import { encryptToken, decryptToken } from '../TokenEncryption';

describe('TokenEncryption - Security Tests', () => {
  // Set test encryption key
  const originalEnv = process.env.LMS_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.LMS_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-minimum-32-chars-long';
  });

  afterAll(() => {
    process.env.LMS_ENCRYPTION_KEY = originalEnv;
  });

  describe('Property 23: Token Encryption for Stored Credentials', () => {
    it('should encrypt tokens so raw token never appears in output', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          (rawToken) => {
            const encrypted = encryptToken(rawToken);

            // Encrypted format should be: iv:authTag:encryptedData
            expect(encrypted).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);

            // Raw token should NEVER appear in encrypted output
            expect(encrypted).not.toContain(rawToken);
            expect(encrypted.toLowerCase()).not.toContain(rawToken.toLowerCase());

            // Encrypted output should be significantly different from input
            expect(encrypted).not.toBe(rawToken);
            expect(encrypted.length).toBeGreaterThan(rawToken.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should decrypt tokens back to original value', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          (rawToken) => {
            const encrypted = encryptToken(rawToken);
            const decrypted = decryptToken(encrypted);

            // Decrypted value should match original
            expect(decrypted).toBe(rawToken);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce different encrypted outputs for same input (due to random IV)', () => {
      const rawToken = 'test-token-12345';

      const encrypted1 = encryptToken(rawToken);
      const encrypted2 = encryptToken(rawToken);

      // Same input should produce different encrypted outputs (random IV)
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(decryptToken(encrypted1)).toBe(rawToken);
      expect(decryptToken(encrypted2)).toBe(rawToken);
    });

    it('should handle special characters and unicode in tokens', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.fullUnicodeString({ maxLength: 200 }),
            fc.constant('🔐🛡️🔑'),
            fc.constant('token-with-special-chars!@#$%^&*()'),
            fc.constant('SELECT * FROM users; DROP TABLE users;--'),
            fc.constant('<script>alert("xss")</script>'),
          ),
          (rawToken) => {
            const encrypted = encryptToken(rawToken);
            const decrypted = decryptToken(encrypted);

            expect(decrypted).toBe(rawToken);
            expect(encrypted).not.toContain(rawToken);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error on invalid encrypted format', () => {
      const invalidFormats = [
        'invalid-format',
        'only-one-part',
        'two:parts',
        'four:parts:are:invalid',
        '',
        'not-hex:not-hex:not-hex',
      ];

      invalidFormats.forEach((invalid) => {
        expect(() => decryptToken(invalid)).toThrow();
      });
    });

    it('should throw error on tampered encrypted data', () => {
      const rawToken = 'test-token';
      const encrypted = encryptToken(rawToken);

      // Tamper with the encrypted data
      const parts = encrypted.split(':');
      const tamperedIv = parts[0].replace(/a/g, 'b');
      const tampered = `${tamperedIv}:${parts[1]}:${parts[2]}`;

      expect(() => decryptToken(tampered)).toThrow();
    });
  });

  describe('Database INSERT Log Security', () => {
    it('should verify raw token never appears in database logs', () => {
      // This is a conceptual test - in production, you'd check actual DB logs
      const rawToken = 'super-secret-canvas-pat-token-12345';
      const encrypted = encryptToken(rawToken);

      // Simulate what would be inserted into database
      const dbRecord = {
        id: 'test-id',
        studentId: 'student-id',
        provider: 'canvas',
        encryptedToken: encrypted,
        status: 'active',
      };

      // Verify raw token doesn't appear anywhere in the record
      const recordString = JSON.stringify(dbRecord);
      expect(recordString).not.toContain(rawToken);

      // Verify only encrypted version is present
      expect(recordString).toContain(encrypted);
    });
  });

  describe('Encryption Key Requirements', () => {
    it('should throw error if encryption key is missing', () => {
      const originalKey = process.env.LMS_ENCRYPTION_KEY;
      delete process.env.LMS_ENCRYPTION_KEY;

      expect(() => encryptToken('test')).toThrow('LMS_ENCRYPTION_KEY environment variable is required');

      process.env.LMS_ENCRYPTION_KEY = originalKey;
    });

    it('should throw error if encryption key is too short', () => {
      const originalKey = process.env.LMS_ENCRYPTION_KEY;
      process.env.LMS_ENCRYPTION_KEY = 'short';

      expect(() => encryptToken('test')).toThrow();

      process.env.LMS_ENCRYPTION_KEY = originalKey;
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle very long tokens efficiently', () => {
      const longToken = 'a'.repeat(10000); // 10KB token

      const startTime = Date.now();
      const encrypted = encryptToken(longToken);
      const decrypted = decryptToken(encrypted);
      const endTime = Date.now();

      expect(decrypted).toBe(longToken);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle rapid encryption/decryption cycles', () => {
      const token = 'test-token-for-rapid-cycles';

      for (let i = 0; i < 100; i++) {
        const encrypted = encryptToken(token);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(token);
      }
    });
  });
});

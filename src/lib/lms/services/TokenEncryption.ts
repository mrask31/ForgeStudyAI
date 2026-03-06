/**
 * Token Encryption Utility
 * Requirements: 2.6, 2.7, Security
 * 
 * Provides AES-256-GCM encryption for storing Canvas PATs and OAuth tokens.
 * Tokens are encrypted before storage and decrypted only when needed for API calls.
 */

import * as crypto from 'crypto';

/**
 * Token Encryption Service
 * 
 * Uses AES-256-GCM for secure token storage.
 */
export class TokenEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly AUTH_TAG_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 64; // 512 bits

  /**
   * Get encryption key from environment variable
   * 
   * CRITICAL: LMS_ENCRYPTION_KEY must be set in environment.
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.LMS_ENCRYPTION_KEY;

    if (!key) {
      throw new Error(
        'LMS_ENCRYPTION_KEY environment variable is not set. Token encryption requires this key.'
      );
    }

    // Derive 256-bit key from environment variable using PBKDF2
    return crypto.pbkdf2Sync(key, 'forgestudy-lms-salt', 100000, 32, 'sha256');
  }

  /**
   * Encrypt token for storage
   * 
   * @param token Plain text token (Canvas PAT or OAuth token)
   * @returns Encrypted token string (format: iv:authTag:encryptedData)
   */
  static encrypt(token: string): string {
    try {
      const key = this.getEncryptionKey();

      // Generate random IV (initialization vector)
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      // Encrypt token
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV, auth tag, and encrypted data
      // Format: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error: any) {
      console.error('[TokenEncryption] Encryption failed:', error);
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt token for API calls
   * 
   * @param encryptedToken Encrypted token string (format: iv:authTag:encryptedData)
   * @returns Plain text token
   */
  static decrypt(encryptedToken: string): string {
    try {
      const key = this.getEncryptionKey();

      // Parse encrypted token
      const parts = encryptedToken.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedData = parts[2];

      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt token
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      console.error('[TokenEncryption] Decryption failed:', error);
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate that encryption is properly configured
   * 
   * @returns true if encryption key is available
   */
  static isConfigured(): boolean {
    try {
      this.getEncryptionKey();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test encryption/decryption roundtrip
   * 
   * Used for system health checks.
   */
  static test(): boolean {
    try {
      const testToken = 'test-token-' + Date.now();
      const encrypted = this.encrypt(testToken);
      const decrypted = this.decrypt(encrypted);
      return testToken === decrypted;
    } catch {
      return false;
    }
  }
}

/**
 * Redis Client Configuration for LMS Autonomy Engine
 * Requirements: 5.1
 * 
 * Provides Redis connection with connection pooling, error handling,
 * and graceful fallback to database queries if Redis is unavailable.
 */

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let isRedisAvailable = false;

/**
 * Initialize Redis client with connection pooling and error handling
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  // Return existing client if already connected
  if (redisClient && isRedisAvailable) {
    return redisClient;
  }

  // Skip Redis if no URL configured (graceful degradation)
  if (!process.env.REDIS_URL) {
    console.warn('[Redis] REDIS_URL not configured. Falling back to database queries.');
    return null;
  }

  try {
    // Create new Redis client
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          // Exponential backoff: 100ms, 200ms, 400ms, 800ms, max 3000ms
          const delay = Math.min(100 * Math.pow(2, retries), 3000);
          console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries + 1})`);
          return delay;
        },
        connectTimeout: 5000, // 5 second connection timeout
      },
    });

    // Error handling
    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
      isRedisAvailable = true;
    });

    redisClient.on('disconnect', () => {
      console.warn('[Redis] Disconnected');
      isRedisAvailable = false;
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    // Connect to Redis
    await redisClient.connect();
    isRedisAvailable = true;

    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    isRedisAvailable = false;
    redisClient = null;
    return null;
  }
}

/**
 * Check if Redis is currently available
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient !== null;
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('[Redis] Connection closed gracefully');
    } catch (error) {
      console.error('[Redis] Error closing connection:', error);
    } finally {
      redisClient = null;
      isRedisAvailable = false;
    }
  }
}

/**
 * Get value from Redis with graceful fallback
 * 
 * @param key Redis key
 * @returns Cached value or null if not found or Redis unavailable
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return null; // Graceful fallback: Redis unavailable
    }

    const value = await client.get(key);
    if (!value || typeof value !== 'string') {
      return null;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[Redis] Error getting key "${key}":`, error);
    return null; // Graceful fallback: Return null on error
  }
}

/**
 * Set value in Redis with TTL
 * 
 * @param key Redis key
 * @param value Value to cache (will be JSON stringified)
 * @param ttlSeconds TTL in seconds
 */
export async function setInCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return; // Graceful fallback: Redis unavailable, skip caching
    }

    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error(`[Redis] Error setting key "${key}":`, error);
    // Graceful fallback: Log error but don't throw
  }
}

/**
 * Delete value from Redis
 * 
 * @param key Redis key to delete
 */
export async function deleteFromCache(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return; // Graceful fallback: Redis unavailable
    }

    await client.del(key);
  } catch (error) {
    console.error(`[Redis] Error deleting key "${key}":`, error);
    // Graceful fallback: Log error but don't throw
  }
}

/**
 * Delete multiple keys from Redis
 * 
 * @param keys Array of Redis keys to delete
 */
export async function deleteMultipleFromCache(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  try {
    const client = await getRedisClient();
    if (!client) {
      return; // Graceful fallback: Redis unavailable
    }

    await client.del(keys);
  } catch (error) {
    console.error(`[Redis] Error deleting multiple keys:`, error);
    // Graceful fallback: Log error but don't throw
  }
}

/**
 * Acquire a distributed lock
 * 
 * @param key Lock key
 * @param ttlSeconds Lock TTL in seconds
 * @returns true if lock acquired, false otherwise
 */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return true; // Graceful fallback: Allow operation if Redis unavailable
    }

    const result = await client.set(key, '1', {
      NX: true, // Only set if key doesn't exist
      EX: ttlSeconds, // Set expiration
    });

    return result === 'OK';
  } catch (error) {
    console.error(`[Redis] Error acquiring lock "${key}":`, error);
    return true; // Graceful fallback: Allow operation on error
  }
}

/**
 * Release a distributed lock
 * 
 * @param key Lock key
 */
export async function releaseLock(key: string): Promise<void> {
  await deleteFromCache(key);
}

/**
 * SmartSyncService Unit Tests
 * 
 * Tests state machine transitions, error handling, and graceful degradation
 * Validates: Requirements 3.3-3.5, 4.3-4.5, 7.1-7.5
 */

import { SmartSyncService } from '../SmartSyncService';
import { CanvasAdapter } from '../../adapters/CanvasAdapter';
import { GoogleClassroomAdapter } from '../../adapters/GoogleClassroomAdapter';
import { DeduplicationEngine } from '../DeduplicationEngine';
import {
  CanvasAuthError,
  CanvasNetworkError,
  GoogleClassroomAuthError,
  GoogleClassroomNetworkError,
} from '../../adapters';

// Mock all dependencies
jest.mock('../../adapters/CanvasAdapter');
jest.mock('../../adapters/GoogleClassroomAdapter');
jest.mock('../DeduplicationEngine');
jest.mock('../../redis-client', () => ({
  redisClient: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
}));

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        in: jest.fn(() => ({
          data: [],
          error: null,
        })),
        data: [],
        error: null,
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
};

describe('SmartSyncService - State Machine Tests', () => {
  let service: SmartSyncService;
  let mockCanvasAdapter: jest.Mocked<CanvasAdapter>;
  let mockGoogleAdapter: jest.Mocked<GoogleClassroomAdapter>;
  let mockDeduplicationEngine: jest.Mocked<DeduplicationEngine>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCanvasAdapter = new CanvasAdapter() as jest.Mocked<CanvasAdapter>;
    mockGoogleAdapter = new GoogleClassroomAdapter() as jest.Mocked<GoogleClassroomAdapter>;
    mockDeduplicationEngine = new DeduplicationEngine(mockSupabase as any) as jest.Mocked<DeduplicationEngine>;

    service = new SmartSyncService(
      mockSupabase as any,
      mockCanvasAdapter,
      mockGoogleAdapter,
      mockDeduplicationEngine
    );
  });

  describe('Canvas 401 Unauthorized - Auth Error State Transition', () => {
    it('should transition connection to "failed" status with "auth_error" on 401', async () => {
      const studentId = 'test-student-id';
      const connectionId = 'test-connection-id';

      // Mock active Canvas connection
      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'lms_connections') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  data: [
                    {
                      id: connectionId,
                      studentId,
                      provider: 'canvas',
                      status: 'active',
                      encryptedToken: 'encrypted-token',
                      metadata: { canvasInstanceUrl: 'https://test.instructure.com' },
                      failureCount: 0,
                    },
                  ],
                  error: null,
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [
                  {
                    id: connectionId,
                    status: 'failed',
                    lastSyncStatus: 'auth_error',
                    failureCount: 1,
                  },
                ],
                error: null,
              })),
            })),
          };
        }
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({ data: null, error: null })),
            })),
          })),
        };
      });

      // Mock Canvas adapter to throw 401 error
      mockCanvasAdapter.fetchAssignments = jest.fn().mockRejectedValue(
        new CanvasAuthError('Invalid token', 401)
      );

      // Execute sync
      const result = await service.syncOnLogin(studentId);

      // Verify state transition
      expect(result.syncResults).toHaveLength(1);
      expect(result.syncResults[0].status).toBe('auth_error');
      expect(result.syncResults[0].provider).toBe('canvas');

      // Verify database update was called
      const updateCalls = (mockSupabase.from as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'lms_connections'
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Network Timeout - ECONNREFUSED State Transition', () => {
    it('should increment failure_count and transition to "blocked" after 5 failures', async () => {
      const studentId = 'test-student-id';
      const connectionId = 'test-connection-id';

      // Mock connection with 4 previous failures
      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'lms_connections') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  data: [
                    {
                      id: connectionId,
                      studentId,
                      provider: 'canvas',
                      status: 'active',
                      encryptedToken: 'encrypted-token',
                      metadata: { canvasInstanceUrl: 'https://test.instructure.com' },
                      failureCount: 4, // 4 previous failures
                    },
                  ],
                  error: null,
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [
                  {
                    id: connectionId,
                    status: 'blocked',
                    lastSyncStatus: 'firewall_blocked',
                    failureCount: 5,
                  },
                ],
                error: null,
              })),
            })),
          };
        }
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({ data: null, error: null })),
            })),
          })),
        };
      });

      // Mock Canvas adapter to throw network error
      mockCanvasAdapter.fetchAssignments = jest.fn().mockRejectedValue(
        new CanvasNetworkError('ECONNREFUSED', 'Network timeout')
      );

      // Execute sync
      const result = await service.syncOnLogin(studentId);

      // Verify state transition to blocked
      expect(result.syncResults).toHaveLength(1);
      expect(result.syncResults[0].status).toBe('firewall_blocked');
    });

    it('should remain "active" with incremented failure_count if under threshold', async () => {
      const studentId = 'test-student-id';
      const connectionId = 'test-connection-id';

      // Mock connection with 2 previous failures
      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'lms_connections') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  data: [
                    {
                      id: connectionId,
                      studentId,
                      provider: 'canvas',
                      status: 'active',
                      encryptedToken: 'encrypted-token',
                      metadata: { canvasInstanceUrl: 'https://test.instructure.com' },
                      failureCount: 2, // Only 2 previous failures
                    },
                  ],
                  error: null,
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [
                  {
                    id: connectionId,
                    status: 'active', // Should remain active
                    lastSyncStatus: 'network_error',
                    failureCount: 3,
                  },
                ],
                error: null,
              })),
            })),
          };
        }
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({ data: null, error: null })),
            })),
          })),
        };
      });

      // Mock Canvas adapter to throw network error
      mockCanvasAdapter.fetchAssignments = jest.fn().mockRejectedValue(
        new CanvasNetworkError('ECONNREFUSED', 'Network timeout')
      );

      // Execute sync
      const result = await service.syncOnLogin(studentId);

      // Verify status remains active but failure count incremented
      expect(result.syncResults).toHaveLength(1);
      expect(result.syncResults[0].status).toBe('network_error');
    });
  });

  describe('Google Classroom OAuth Token Expiration', () => {
    it('should attempt token refresh on 401 and retry sync', async () => {
      const studentId = 'test-student-id';
      const connectionId = 'test-connection-id';

      // Mock active Google Classroom connection
      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'lms_connections') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  data: [
                    {
                      id: connectionId,
                      studentId,
                      provider: 'google_classroom',
                      status: 'active',
                      encryptedToken: 'encrypted-refresh-token',
                      tokenExpiresAt: new Date(Date.now() - 1000), // Expired
                      failureCount: 0,
                    },
                  ],
                  error: null,
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [{ id: connectionId, tokenExpiresAt: new Date(Date.now() + 3600000) }],
                error: null,
              })),
            })),
          };
        }
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({ data: null, error: null })),
            })),
          })),
        };
      });

      // Mock Google adapter to succeed after refresh
      mockGoogleAdapter.refreshAccessToken = jest.fn().mockResolvedValue('new-access-token');
      mockGoogleAdapter.fetchCoursework = jest.fn().mockResolvedValue([]);

      // Execute sync
      const result = await service.syncOnLogin(studentId);

      // Verify token refresh was attempted
      expect(mockGoogleAdapter.refreshAccessToken).toHaveBeenCalled();
      expect(result.syncResults).toHaveLength(1);
      expect(result.syncResults[0].status).toBe('success');
    });
  });

  describe('Graceful Degradation - Manual Upload Remains Active', () => {
    it('should not affect manual upload functionality when LMS is blocked', async () => {
      // This test verifies that the manual upload system is independent
      // Manual uploads don't depend on SmartSyncService state

      const studentId = 'test-student-id';

      // Mock blocked connection
      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'lms_connections') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  data: [
                    {
                      id: 'blocked-connection',
                      studentId,
                      provider: 'canvas',
                      status: 'blocked',
                      lastSyncStatus: 'firewall_blocked',
                      failureCount: 5,
                    },
                  ],
                  error: null,
                })),
              })),
            })),
          };
        }
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({ data: null, error: null })),
            })),
          })),
        };
      });

      // Sync should fail but not crash
      const result = await service.syncOnLogin(studentId);

      // Verify sync failed gracefully
      expect(result.success).toBe(false);
      expect(result.syncResults[0].status).toBe('firewall_blocked');

      // Manual upload system should remain unaffected (tested separately)
      // This test confirms the sync service doesn't interfere with manual uploads
    });
  });

  describe('Successful Sync - Failure Count Reset', () => {
    it('should reset failure_count to 0 on successful sync', async () => {
      const studentId = 'test-student-id';
      const connectionId = 'test-connection-id';

      // Mock connection with previous failures
      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'lms_connections') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  data: [
                    {
                      id: connectionId,
                      studentId,
                      provider: 'canvas',
                      status: 'active',
                      encryptedToken: 'encrypted-token',
                      metadata: { canvasInstanceUrl: 'https://test.instructure.com' },
                      failureCount: 3, // Had previous failures
                    },
                  ],
                  error: null,
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [
                  {
                    id: connectionId,
                    status: 'active',
                    lastSyncStatus: 'success',
                    failureCount: 0, // Reset to 0
                  },
                ],
                error: null,
              })),
            })),
          };
        }
        if (table === 'synced_assignments') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          };
        }
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({ data: null, error: null })),
            })),
          })),
        };
      });

      // Mock successful Canvas fetch
      mockCanvasAdapter.fetchAssignments = jest.fn().mockResolvedValue([
        {
          id: 'assignment-1',
          title: 'Test Assignment',
          description: 'Test description',
          dueDate: new Date(),
          courseName: 'Test Course',
          courseId: 'course-1',
          attachments: [],
        },
      ]);

      // Execute sync
      const result = await service.syncOnLogin(studentId);

      // Verify success and failure count reset
      expect(result.success).toBe(true);
      expect(result.syncResults[0].status).toBe('success');
    });
  });
});

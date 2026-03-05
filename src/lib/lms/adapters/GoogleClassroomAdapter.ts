/**
 * Google Classroom LMS Adapter
 * Requirements: 2.7, 4.1, 4.2, 4.4, 4.7
 * 
 * Interfaces with Google Classroom using OAuth 2.0.
 * Implements strict read-only operations for coursework retrieval.
 * 
 * CRITICAL: Hardcoded read-only scopes:
 * - classroom.courses.readonly
 * - classroom.coursework.me.readonly
 */

import {
  Assignment,
  Attachment,
  Course,
  SyncResult,
  TokenValidationResult,
  GoogleClassroomMetadata,
} from '../types';

/**
 * Custom error types for Google Classroom API failures
 */
export class GoogleClassroomAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleClassroomAuthError';
  }
}

export class GoogleClassroomRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleClassroomRateLimitError';
  }
}

export class GoogleClassroomNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleClassroomNetworkError';
  }
}

/**
 * Google Classroom API Response Types
 */
interface GoogleCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
}

interface GoogleCoursework {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  dueTime?: {
    hours: number;
    minutes: number;
  };
  materials?: Array<{
    driveFile?: {
      driveFile: {
        id: string;
        title: string;
        alternateLink: string;
      };
    };
    link?: {
      url: string;
      title?: string;
    };
  }>;
}

interface GoogleOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

/**
 * Google Classroom LMS Adapter
 * 
 * Provides read-only access to Google Classroom coursework and attachments.
 * 
 * SECURITY: All API calls use strictly read-only scopes.
 */
export class GoogleClassroomAdapter {
  private accessToken: string;
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private tokenExpiresAt: Date | null = null;

  /**
   * Read-only scopes (HARDCODED for security)
   */
  private static readonly REQUIRED_SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ];

  constructor(
    accessToken: string,
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    tokenExpiresAt?: Date
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tokenExpiresAt = tokenExpiresAt || null;
  }

  /**
   * Refresh OAuth access token
   * Requirements: 2.7, 4.4
   * 
   * Uses refresh token to obtain new access token.
   * 
   * @returns New access token and expiration timestamp
   */
  async refreshAccessToken(): Promise<{ accessToken: string; expiresAt: Date }> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.status === 400 || response.status === 401) {
        throw new GoogleClassroomAuthError(
          'Failed to refresh Google OAuth token. Refresh token may be invalid or expired.'
        );
      }

      if (!response.ok) {
        throw new Error(`OAuth token refresh failed: ${response.status} ${response.statusText}`);
      }

      const data: GoogleOAuthTokenResponse = await response.json();

      // Update internal access token
      this.accessToken = data.access_token;

      // Calculate expiration time (subtract 5 minutes for safety margin)
      const expiresAt = new Date(Date.now() + (data.expires_in - 300) * 1000);
      this.tokenExpiresAt = expiresAt;

      return {
        accessToken: data.access_token,
        expiresAt,
      };
    } catch (error: any) {
      if (error instanceof GoogleClassroomAuthError) {
        throw error;
      }

      if (error.name === 'AbortError' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new GoogleClassroomNetworkError(
          'Cannot reach Google OAuth server. Check network connection.'
        );
      }

      throw new GoogleClassroomAuthError(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Ensure access token is valid, refresh if needed
   */
  private async ensureValidToken(): Promise<void> {
    // If token expires in less than 5 minutes, refresh it
    if (this.tokenExpiresAt && this.tokenExpiresAt.getTime() - Date.now() < 300000) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Get all courses for the authenticated user
   * Requirements: 4.1
   * 
   * Fetches courses using read-only scope: classroom.courses.readonly
   * 
   * @returns Array of Course objects
   */
  async getCourses(): Promise<Course[]> {
    await this.ensureValidToken();

    try {
      const response = await fetch(
        'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=100',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(15000), // 15 second timeout
        }
      );

      this.handleErrorResponse(response);

      const data = await response.json();
      const googleCourses: GoogleCourse[] = data.courses || [];

      return googleCourses.map((course) => ({
        id: course.id,
        name: course.name,
        code: course.section || null,
      }));
    } catch (error: any) {
      this.handleNetworkError(error, 'Failed to fetch courses');
      throw error;
    }
  }

  /**
   * Fetch all coursework from Google Classroom
   * Requirements: 4.1, 4.7
   * 
   * Retrieves coursework from all active courses with full metadata.
   * Uses read-only scope: classroom.coursework.me.readonly
   * 
   * @returns Array of normalized Assignment objects
   */
  async fetchCoursework(): Promise<Assignment[]> {
    await this.ensureValidToken();

    try {
      // First, get all courses
      const courses = await this.getCourses();

      // Fetch coursework for each course in parallel
      const courseworkPromises = courses.map((course) =>
        this.fetchCourseworkForCourse(course.id, course.name)
      );

      const courseworkArrays = await Promise.all(courseworkPromises);

      // Flatten array of arrays into single array
      return courseworkArrays.flat();
    } catch (error: any) {
      this.handleNetworkError(error, 'Failed to fetch coursework');
      throw error;
    }
  }

  /**
   * Fetch coursework for a specific course
   * 
   * @param courseId Google Classroom course ID
   * @param courseName Course name for metadata
   * @returns Array of normalized Assignment objects
   */
  private async fetchCourseworkForCourse(
    courseId: string,
    courseName: string
  ): Promise<Assignment[]> {
    try {
      const response = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?pageSize=100`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      this.handleErrorResponse(response);

      const data = await response.json();
      const googleCoursework: GoogleCoursework[] = data.courseWork || [];

      return googleCoursework.map((work) => ({
        lmsAssignmentId: work.id,
        title: work.title,
        description: work.description || null,
        dueDate: this.formatDueDate(work.dueDate, work.dueTime),
        courseName: courseName,
        courseId: courseId,
        attachments: this.extractAttachments(work.materials || []),
      }));
    } catch (error: any) {
      // Log error but don't fail entire sync if one course fails
      console.error(`[Google Classroom] Failed to fetch coursework for course ${courseId}:`, error);
      return [];
    }
  }

  /**
   * Download attachment from Google Drive
   * Requirements: 4.2
   * 
   * Downloads file from Google Drive and returns as Buffer.
   * Uses read-only scope: drive.readonly
   * 
   * @param fileId Google Drive file ID
   * @returns Buffer containing file data
   */
  async downloadDriveAttachment(fileId: string): Promise<Buffer> {
    await this.ensureValidToken();

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          signal: AbortSignal.timeout(60000), // 60 second timeout for large files
        }
      );

      this.handleErrorResponse(response);

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      this.handleNetworkError(error, `Failed to download Drive file ${fileId}`);
      throw error;
    }
  }

  /**
   * Execute full sync operation
   * 
   * Fetches all coursework and returns sync result with timing.
   * 
   * @returns SyncResult with assignments and metadata
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const assignments = await this.fetchCoursework();

      const syncDurationMs = Date.now() - startTime;

      return {
        success: true,
        assignments,
        assignmentsFound: assignments.length,
        assignmentsDownloaded: 0, // Attachments downloaded separately
        syncDurationMs,
      };
    } catch (error: any) {
      const syncDurationMs = Date.now() - startTime;

      return {
        success: false,
        assignments: [],
        assignmentsFound: 0,
        assignmentsDownloaded: 0,
        errorMessage: error.message,
        syncDurationMs,
      };
    }
  }

  /**
   * Extract attachments from Google Classroom materials
   */
  private extractAttachments(materials: any[]): Attachment[] {
    const attachments: Attachment[] = [];

    for (const material of materials) {
      if (material.driveFile) {
        const driveFile = material.driveFile.driveFile;
        attachments.push({
          url: driveFile.alternateLink,
          filename: driveFile.title,
          mimeType: 'application/octet-stream', // Will be determined during download
          size: null,
        });
      } else if (material.link) {
        attachments.push({
          url: material.link.url,
          filename: material.link.title || 'Link',
          mimeType: 'text/html',
          size: null,
        });
      }
    }

    return attachments;
  }

  /**
   * Format Google Classroom due date to ISO string
   */
  private formatDueDate(
    dueDate?: { year: number; month: number; day: number },
    dueTime?: { hours: number; minutes: number }
  ): string | null {
    if (!dueDate) return null;

    try {
      const date = new Date(
        dueDate.year,
        dueDate.month - 1, // JavaScript months are 0-indexed
        dueDate.day,
        dueTime?.hours || 23,
        dueTime?.minutes || 59
      );

      return date.toISOString();
    } catch (error) {
      console.error('[Google Classroom] Failed to parse due date:', error);
      return null;
    }
  }

  /**
   * Handle HTTP error responses
   * 
   * Throws appropriate error types based on status code.
   */
  private handleErrorResponse(response: Response): void {
    if (response.ok) return;

    if (response.status === 401 || response.status === 403) {
      throw new GoogleClassroomAuthError(
        `Google Classroom authentication failed: ${response.status} ${response.statusText}`
      );
    }

    if (response.status === 429) {
      throw new GoogleClassroomRateLimitError(
        'Google Classroom API rate limit exceeded. Please try again later.'
      );
    }

    throw new Error(`Google Classroom API error: ${response.status} ${response.statusText}`);
  }

  /**
   * Handle network errors
   * 
   * Throws appropriate error types based on error code.
   */
  private handleNetworkError(error: any, context: string): void {
    if (
      error instanceof GoogleClassroomAuthError ||
      error instanceof GoogleClassroomRateLimitError
    ) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new GoogleClassroomNetworkError(`${context}: Request timed out`);
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new GoogleClassroomNetworkError(
        `${context}: Cannot reach Google Classroom server (possible firewall block)`
      );
    }

    throw new GoogleClassroomNetworkError(`${context}: ${error.message}`);
  }

  /**
   * Get required OAuth scopes (read-only)
   */
  static getRequiredScopes(): string[] {
    return [...GoogleClassroomAdapter.REQUIRED_SCOPES];
  }
}

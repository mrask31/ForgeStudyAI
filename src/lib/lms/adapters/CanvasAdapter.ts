/**
 * Canvas LMS Adapter
 * Requirements: 2.6, 3.1, 3.2, 3.4, 3.7
 * 
 * Interfaces with Canvas LMS using Personal Access Tokens (PAT).
 * Implements strict read-only operations for assignment retrieval.
 */

import {
  Assignment,
  Attachment,
  Course,
  SyncResult,
  TokenValidationResult,
  CanvasMetadata,
} from '../types';

/**
 * Custom error types for Canvas API failures
 */
export class CanvasAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanvasAuthError';
  }
}

export class CanvasRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanvasRateLimitError';
  }
}

export class CanvasNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanvasNetworkError';
  }
}

/**
 * Canvas API Response Types
 */
interface CanvasUser {
  id: number;
  name: string;
  email?: string;
}

interface CanvasCourse {
  id: number;
  name: string;
  course_code?: string;
  workflow_state?: string;
  end_at?: string | null;
}

interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  due_at?: string;
  course_id: number;
  attachments?: Array<{
    url: string;
    filename: string;
    'content-type': string;
    size?: number;
  }>;
}

/**
 * Canvas LMS Adapter
 * 
 * Provides read-only access to Canvas assignments and attachments.
 */
export class CanvasAdapter {
  private instanceUrl: string;
  private token: string;

  constructor(instanceUrl: string, token: string) {
    // Normalize instance URL (remove trailing slash)
    this.instanceUrl = instanceUrl.replace(/\/$/, '');
    this.token = token;
  }

  /**
   * Validate Canvas Personal Access Token
   * Requirements: 2.6, 3.4
   * 
   * Tests the PAT by calling /api/v1/users/self endpoint.
   * 
   * @returns TokenValidationResult with validity status
   */
  async validateToken(): Promise<TokenValidationResult> {
    try {
      const response = await fetch(`${this.instanceUrl}/api/v1/users/self`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.status === 401) {
        return {
          valid: false,
          errorMessage: 'Invalid Canvas Personal Access Token',
        };
      }

      if (response.status === 403) {
        return {
          valid: false,
          errorMessage: 'Canvas token does not have required permissions',
        };
      }

      if (!response.ok) {
        return {
          valid: false,
          errorMessage: `Canvas API error: ${response.status} ${response.statusText}`,
        };
      }

      const user: CanvasUser = await response.json();

      if (!user.id) {
        return {
          valid: false,
          errorMessage: 'Invalid response from Canvas API',
        };
      }

      return { valid: true };
    } catch (error: any) {
      // Network errors (firewall blocks, timeouts)
      if (error.name === 'AbortError' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          valid: false,
          errorMessage: 'Cannot reach Canvas server. Check instance URL or network connection.',
        };
      }

      return {
        valid: false,
        errorMessage: `Token validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Get all courses for the authenticated user
   * Requirements: 3.1
   * 
   * Fetches courses using read-only scope: url:GET|/api/v1/courses
   * 
   * @returns Array of Course objects
   */
  async getCourses(): Promise<Course[]> {
    try {
      const url = `${this.instanceUrl}/api/v1/courses?include[]=term&include[]=total_students&per_page=50`;
      console.log('[Canvas] Fetching courses from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      console.log('[Canvas] Courses API response status:', response.status);

      await this.handleErrorResponse(response);

      const canvasCourses: CanvasCourse[] = await response.json();

      console.log(`[Canvas] Total courses returned from API: ${canvasCourses.length}`);
      canvasCourses.forEach(c => {
        console.log(`[Canvas] Course: "${c.name}" workflow_state=${c.workflow_state} end_at=${c.end_at ?? 'null'}`);
      });

      // Filter client-side: exclude courses that are completed AND ended more than 30 days ago
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const filteredCourses = canvasCourses.filter(course => {
        if (course.workflow_state === 'completed' && course.end_at) {
          const endDate = new Date(course.end_at);
          if (endDate < thirtyDaysAgo) {
            console.log(`[Canvas] Filtering out course "${course.name}" (completed, ended ${course.end_at})`);
            return false;
          }
        }
        return true;
      });

      console.log(`[Canvas] After filtering: ${filteredCourses.length} of ${canvasCourses.length} courses kept`);

      return filteredCourses.map((course) => ({
        id: course.id.toString(),
        name: course.name,
        code: course.course_code || null,
      }));
    } catch (error: any) {
      console.error('[Canvas] Error fetching courses:', error.message);
      this.handleNetworkError(error, 'Failed to fetch courses');
      throw error; // TypeScript requires this after handleNetworkError
    }
  }

  /**
   * Fetch all assignments from Canvas
   * Requirements: 3.1, 3.7
   * 
   * Retrieves assignments from all active courses with full metadata.
   * Uses read-only scope: url:GET|/api/v1/assignments
   * 
   * @returns Array of normalized Assignment objects
   */
  async fetchAssignments(): Promise<Assignment[]> {
    try {
      // First, get all courses
      const courses = await this.getCourses();

      // Fetch assignments for each course in parallel
      const assignmentPromises = courses.map((course) =>
        this.fetchAssignmentsForCourse(course.id, course.name)
      );

      const assignmentArrays = await Promise.all(assignmentPromises);

      // Flatten array of arrays into single array
      return assignmentArrays.flat();
    } catch (error: any) {
      this.handleNetworkError(error, 'Failed to fetch assignments');
      throw error;
    }
  }

  /**
   * Fetch assignments for a specific course
   * 
   * @param courseId Canvas course ID
   * @param courseName Course name for metadata
   * @returns Array of normalized Assignment objects
   */
  private async fetchAssignmentsForCourse(
    courseId: string,
    courseName: string
  ): Promise<Assignment[]> {
    try {
      const url = `${this.instanceUrl}/api/v1/courses/${courseId}/assignments?per_page=50&order_by=due_at`;
      console.log(`[Canvas] Fetching assignments for course ${courseId} (${courseName}) from:`, url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });

      console.log(`[Canvas] Assignments API response status for course ${courseId}:`, response.status);

      await this.handleErrorResponse(response);

      const canvasAssignments: CanvasAssignment[] = await response.json();
      
      console.log(`[Canvas] Assignments for course "${courseName}" (${courseId}): ${canvasAssignments.length} assignments`);

      return canvasAssignments.map((assignment) => ({
        lmsAssignmentId: assignment.id.toString(),
        title: assignment.name,
        description: assignment.description || null,
        dueDate: assignment.due_at || null,
        courseName: courseName,
        courseId: courseId,
        attachments: (assignment.attachments || []).map((att) => ({
          url: att.url,
          filename: att.filename,
          mimeType: att['content-type'],
          size: att.size || null,
        })),
      }));
    } catch (error: any) {
      // Log error but don't fail entire sync if one course fails
      console.error(`[Canvas] Failed to fetch assignments for course ${courseId}:`, error.message);
      return [];
    }
  }

  /**
   * Download attachment from Canvas
   * Requirements: 3.2
   * 
   * Downloads file from Canvas URL and returns as Buffer.
   * 
   * @param url Canvas attachment URL
   * @returns Buffer containing file data
   */
  async downloadAttachment(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        signal: AbortSignal.timeout(60000), // 60 second timeout for large files
      });

      await this.handleErrorResponse(response);

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      this.handleNetworkError(error, `Failed to download attachment from ${url}`);
      throw error;
    }
  }

  /**
   * Execute full sync operation
   * 
   * Fetches all assignments and returns sync result with timing.
   * 
   * @returns SyncResult with assignments and metadata
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log('[Canvas] Starting sync with instanceUrl:', this.instanceUrl);
      
      const assignments = await this.fetchAssignments();

      const syncDurationMs = Date.now() - startTime;

      console.log('[Canvas] Sync completed successfully:', {
        totalAssignments: assignments.length,
        syncDurationMs
      });

      return {
        success: true,
        assignments,
        assignmentsFound: assignments.length,
        assignmentsDownloaded: 0, // Attachments downloaded separately
        syncDurationMs,
      };
    } catch (error: any) {
      const syncDurationMs = Date.now() - startTime;

      console.error('[Canvas] Sync failed:', {
        error: error.message,
        errorType: error.name,
        syncDurationMs
      });

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
   * Handle HTTP error responses
   * 
   * Throws appropriate error types based on status code.
   */
  private async handleErrorResponse(response: Response): Promise<void> {
    if (response.ok) return;

    // Log non-OK responses with body
    const responseText = await response.text();
    console.error('[Canvas] API error response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (response.status === 401 || response.status === 403) {
      throw new CanvasAuthError(
        `Canvas authentication failed: ${response.status} ${response.statusText}`
      );
    }

    if (response.status === 429) {
      throw new CanvasRateLimitError(
        'Canvas API rate limit exceeded. Please try again later.'
      );
    }

    throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
  }

  /**
   * Handle network errors
   * 
   * Throws appropriate error types based on error code.
   */
  private handleNetworkError(error: any, context: string): void {
    if (error instanceof CanvasAuthError || error instanceof CanvasRateLimitError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new CanvasNetworkError(`${context}: Request timed out`);
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new CanvasNetworkError(
        `${context}: Cannot reach Canvas server (possible firewall block)`
      );
    }

    throw new CanvasNetworkError(`${context}: ${error.message}`);
  }
}

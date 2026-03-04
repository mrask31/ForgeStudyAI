# Implementation Plan: LMS Autonomy Engine

## Overview

This implementation plan breaks down the LMS Autonomy Engine into 6 sequential phases following the strict build order specified by the CPO. The system enables automated assignment synchronization from Canvas and Google Classroom while maintaining manual upload as a first-class feature. All phases must be completed in order to ensure proper dependency management.

## Phase 1: The Foundation (Database & Types)

- [x] 1. Create database schema and migrations
  - [x] 1.1 Create migration for lms_connections table
    - Add all columns: id, student_id, parent_id, provider, status, encrypted_token, token_expires_at, last_sync_at, last_sync_status, failure_count, metadata, authorized_at, authorized_by, created_at, updated_at
    - Add CHECK constraints for provider and status enums
    - Add UNIQUE constraint on (student_id, provider)
    - Add indexes on student_id, status, and last_sync_at
    - _Requirements: 2.1, 2.2, 2.3, 6.2_

  - [x] 1.2 Create migration for synced_assignments table
    - Add all columns: id, student_id, lms_connection_id, lms_assignment_id, title, description, due_date, course_name, course_id, attachment_urls, downloaded_files, sync_status, manual_upload_id, is_merged, first_synced_at, last_synced_at, created_at, updated_at
    - Add CHECK constraint for sync_status enum
    - Add UNIQUE constraint on (lms_connection_id, lms_assignment_id)
    - Add indexes on student_id, lms_connection_id, due_date, and is_merged
    - Add foreign key to lms_connections with CASCADE delete
    - _Requirements: 3.1, 3.7, 4.1, 4.7, 8.1_

  - [x] 1.3 Create migration for manual_uploads table
    - Add all columns: id, student_id, file_path, original_filename, file_size, mime_type, title, due_date, synced_assignment_id, is_merged, uploaded_at, created_at, updated_at
    - Add indexes on student_id and is_merged
    - Add foreign key to synced_assignments
    - _Requirements: 5.6, 5.8, 8.2_

  - [x] 1.4 Create migration for sync_logs table
    - Add all columns: id, lms_connection_id, sync_trigger, sync_status, assignments_found, assignments_downloaded, error_message, sync_duration_ms, synced_at
    - Add CHECK constraints for sync_trigger and sync_status enums
    - Add indexes on lms_connection_id and synced_at
    - Add foreign key to lms_connections with CASCADE delete
    - _Requirements: 3.4, 3.5, 4.4, 4.5_

  - [x] 1.5 Create migration for parent_notifications table
    - Add all columns: id, parent_id, student_id, notification_type, title, message, is_read, metadata, created_at
    - Add CHECK constraint for notification_type enum
    - Add indexes on parent_id and is_read
    - Add foreign keys to parents and students with CASCADE delete
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 2. Set up Redis cache schema
  - [x] 2.1 Define Redis key patterns for sync status caching
    - Create key pattern: `sync:status:${studentId}`
    - Define TTL of 5 minutes for cached sync status
    - Document cache invalidation strategy
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.2 Create Redis connection configuration
    - Set up Redis client with connection pooling
    - Add error handling for Redis connection failures
    - Implement graceful fallback to database queries if Redis unavailable
    - _Requirements: 5.1_

- [x] 3. Generate TypeScript interfaces and types
  - [x] 3.1 Create core data model interfaces
    - Define LMSConnection interface matching database schema
    - Define SyncedAssignment interface matching database schema
    - Define ManualUpload interface matching database schema
    - Define SyncLog interface matching database schema
    - Define ParentNotification interface matching database schema
    - _Requirements: 2.1, 3.7, 4.7, 8.1_

  - [x] 3.2 Create API request/response types
    - Define types for POST /api/parent/lms/connect request and response
    - Define types for DELETE /api/parent/lms/disconnect request and response
    - Define types for GET /api/parent/lms/status/:studentId response
    - Define types for GET /api/student/sync-status response
    - Define types for POST /api/internal/sync/trigger request and response
    - _Requirements: 2.2, 2.3, 2.8, 5.1_

  - [x] 3.3 Create LMS adapter types
    - Define Assignment interface for normalized assignment data
    - Define Attachment interface for file attachments
    - Define Course interface for course metadata
    - Define SyncResult interface for sync operation results
    - Define enum types for provider, status, sync_trigger, and notification_type
    - _Requirements: 3.1, 3.2, 4.1, 4.2_

- [-] 4. Checkpoint - Verify database and types
  - Run migrations on test database
  - Verify all constraints and indexes are created
  - Ensure TypeScript types compile without errors
  - Ask the user if questions arise

## Phase 2: The Pipes (LMS Adapters)

- [ ] 5. Build Canvas adapter
  - [ ] 5.1 Implement Canvas PAT validation
    - Create validateToken method that calls Canvas API /api/v1/users/self
    - Handle HTTP 401 responses as invalid token
    - Handle network errors with appropriate error types
    - Return boolean indicating token validity
    - _Requirements: 2.6, 3.4_

  - [ ] 5.2 Implement Canvas course fetching
    - Create getCourses method that calls Canvas API /api/v1/courses
    - Use read-only scope: url:GET|/api/v1/courses
    - Parse course list from API response
    - Handle pagination if needed
    - _Requirements: 3.1_

  - [ ] 5.3 Implement Canvas assignment fetching
    - Create fetchAssignments method that calls Canvas API /api/v1/courses/{id}/assignments
    - Use read-only scope: url:GET|/api/v1/assignments
    - Parse assignment metadata: title, description, due_date, course info
    - Extract attachment URLs from assignment data
    - Return normalized Assignment[] array
    - _Requirements: 3.1, 3.7_

  - [ ] 5.4 Implement Canvas PDF download
    - Create downloadAttachment method that downloads files from Canvas URLs
    - Handle authentication with PAT token in headers
    - Stream file to local storage
    - Return Buffer or file path
    - Handle download failures gracefully
    - _Requirements: 3.2_

  - [ ]* 5.5 Write property test for Canvas adapter
    - **Property 4: Assignment Retrieval for Authorized Connections**
    - **Validates: Requirements 3.1**
    - Test that valid Canvas PAT always retrieves assignments successfully
    - Use fast-check to generate random valid tokens and mock API responses

  - [ ]* 5.6 Write property test for Canvas attachment download
    - **Property 5: Attachment Download for New Assignments**
    - **Validates: Requirements 3.2**
    - Test that all attachments are downloaded for any assignment with attachments
    - Use fast-check to generate assignments with varying attachment counts

- [ ] 6. Build Google Classroom adapter
  - [ ] 6.1 Implement OAuth token refresh
    - Create refreshAccessToken method using Google OAuth refresh token flow
    - Handle token expiration and refresh errors
    - Store new access token with expiration timestamp
    - Return refreshed access token
    - _Requirements: 2.7, 4.4_

  - [ ] 6.2 Implement Google Classroom course fetching
    - Create getCourses method that calls Google Classroom API courses.list
    - Use read-only scope: classroom.courses.readonly
    - Parse course list from API response
    - Handle pagination with pageToken
    - _Requirements: 4.1_

  - [ ] 6.3 Implement Google Classroom coursework fetching
    - Create fetchCoursework method that calls Google Classroom API courses.courseWork.list
    - Use read-only scope: classroom.coursework.me.readonly
    - Parse coursework metadata: title, description, dueDate, course info
    - Extract Google Drive attachment IDs
    - Return normalized Assignment[] array
    - _Requirements: 4.1, 4.7_

  - [ ] 6.4 Implement Google Drive attachment download
    - Create downloadDriveAttachment method using Google Drive API
    - Handle authentication with OAuth access token
    - Download files by Drive file ID
    - Stream file to local storage
    - Return Buffer or file path
    - _Requirements: 4.2_

  - [ ]* 6.5 Write property test for Google Classroom adapter
    - **Property 4: Assignment Retrieval for Authorized Connections**
    - **Validates: Requirements 4.1**
    - Test that valid OAuth token always retrieves coursework successfully
    - Use fast-check to generate random valid tokens and mock API responses

  - [ ]* 6.6 Write property test for Google Drive download
    - **Property 5: Attachment Download for New Assignments**
    - **Validates: Requirements 4.2**
    - Test that all Drive attachments are downloaded for any coursework with attachments
    - Use fast-check to generate coursework with varying attachment counts

- [ ] 7. Checkpoint - Verify adapters
  - Test Canvas adapter with mock API responses
  - Test Google Classroom adapter with mock API responses
  - Verify error handling for authentication failures
  - Ensure all tests pass, ask the user if questions arise

## Phase 3: The Brain (Services & Deduplication)

- [ ] 8. Build Deduplication Engine
  - [ ] 8.1 Implement fuzzy matching algorithm
    - Create calculateMatchScore method using string similarity (Levenshtein distance)
    - Compare assignment titles with fuzzy matching threshold (e.g., 0.8 similarity)
    - Compare due dates with tolerance window (e.g., same day)
    - Return match score between 0 and 1
    - _Requirements: 8.2_

  - [ ] 8.2 Implement manual upload matching
    - Create findMatchingUpload method that searches synced_assignments for matches
    - Query synced assignments for the same student
    - Calculate match scores for each synced assignment
    - Return best match if score exceeds threshold, otherwise null
    - _Requirements: 8.2_

  - [ ] 8.3 Implement assignment merging
    - Create mergeAssignments method that links synced and manual records
    - Update synced_assignment.manual_upload_id with manual upload ID
    - Update manual_upload.synced_assignment_id with synced assignment ID
    - Set is_merged flag to true on both records
    - Preserve all metadata from both sources
    - _Requirements: 8.3, 8.4_

  - [ ] 8.4 Implement cross-provider duplicate detection
    - Create detectCrossProviderDuplicates method
    - Find assignments with same title and due date across Canvas and Google Classroom
    - Group duplicates for display purposes
    - Return array of duplicate groups
    - _Requirements: 8.1, 8.2_

  - [ ]* 8.5 Write property test for fuzzy matching
    - **Property 18: Matching Attempt for Manual Uploads**
    - **Validates: Requirements 8.2**
    - Test that any manual upload triggers a matching attempt
    - Use fast-check to generate random uploads and verify matching is attempted

  - [ ]* 8.6 Write property test for merge data preservation
    - **Property 20: Data Preservation During Merge**
    - **Validates: Requirements 8.4**
    - Test that merging preserves both synced metadata and manual file path
    - Use fast-check to generate random synced/manual pairs and verify no data loss

- [ ] 9. Build Smart Sync Service
  - [ ] 9.1 Implement login-triggered sync
    - Create syncOnLogin method that triggers when student logs in
    - Query active LMS connections for the student
    - Call appropriate adapter (Canvas or Google Classroom) for each connection
    - Process assignments through deduplication engine
    - Update last_sync_at timestamp
    - Create sync_log entry with results
    - _Requirements: 3.1, 3.3, 4.1, 4.3_

  - [ ] 9.2 Implement 3AM batch sync
    - Create batchSyncAll method for cron job execution
    - Query all students with active LMS connections
    - Process syncs in parallel with rate limiting
    - Respect Canvas and Google API rate limits
    - Log all sync results to sync_logs table
    - Handle failures gracefully without blocking other syncs
    - _Requirements: 3.3, 4.3_

  - [ ] 9.3 Implement error detection and classification
    - Create detectFirewallBlock method that analyzes repeated failures
    - Classify errors as: auth_error, network_error, or firewall_blocked
    - Mark connection status as 'blocked' after 5 consecutive failures
    - Increment failure_count on each failed sync
    - Reset failure_count on successful sync
    - _Requirements: 3.4, 3.5, 4.4, 4.5, 7.1_

  - [ ] 9.4 Implement connection status updates
    - Create updateConnectionStatus method
    - Update lms_connections.status field based on sync results
    - Update lms_connections.last_sync_status field
    - Update lms_connections.last_sync_at timestamp
    - Trigger parent notifications for status changes
    - _Requirements: 2.8, 7.1, 7.2_

  - [ ] 9.5 Implement retry logic with exponential backoff
    - Create retryFailedConnection method for manual retry attempts
    - Implement exponential backoff: 1min, 5min, 15min, 1hour
    - Periodic retry for blocked connections every 6 hours
    - Stop retrying after connection marked as 'disconnected'
    - _Requirements: 3.5, 4.5, 7.4, 7.5_

  - [ ] 9.6 Implement token encryption/decryption
    - Create encryption utility for storing Canvas PATs and OAuth tokens
    - Use AES-256-GCM encryption with environment variable key
    - Encrypt tokens before storing in lms_connections.encrypted_token
    - Decrypt tokens only when needed for API calls
    - Never log or expose decrypted tokens
    - _Requirements: 2.6, 2.7, Security_

  - [ ]* 9.7 Write property test for sync timestamp storage
    - **Property 6: Sync Timestamp Storage**
    - **Validates: Requirements 3.6, 4.6**
    - Test that every successful sync stores a timestamp
    - Use fast-check to generate random sync operations and verify timestamps

  - [ ]* 9.8 Write property test for metadata preservation
    - **Property 7: Assignment Metadata Preservation**
    - **Validates: Requirements 3.7, 4.7**
    - Test that all assignment metadata is preserved during sync
    - Use fast-check to generate random assignments and verify no data loss

  - [ ]* 9.9 Write property test for token encryption
    - **Property 23: Token Encryption for Stored Credentials**
    - **Validates: Security requirement**
    - Test that all stored tokens are encrypted
    - Use fast-check to generate random tokens and verify encryption

- [ ] 10. Checkpoint - Verify services
  - Test deduplication engine with sample data
  - Test Smart Sync Service with mock adapters
  - Verify error handling and retry logic
  - Ensure all tests pass, ask the user if questions arise

## Phase 4: The Nervous System (API Routes)

- [ ] 11. Build parent authorization endpoints
  - [ ] 11.1 Implement POST /api/parent/lms/connect
    - Validate parent authentication and authorization
    - Validate request body (studentId, provider, token/OAuth data)
    - For Canvas: validate PAT token using CanvasAdapter
    - For Google Classroom: handle OAuth callback and store refresh token
    - Encrypt token before storing in database
    - Create lms_connections record with status 'active'
    - Create parent_notification for successful connection
    - Return connection ID and status
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.2, 9.1_

  - [ ] 11.2 Implement DELETE /api/parent/lms/disconnect
    - Validate parent authentication and authorization
    - Validate connectionId in request body
    - Verify parent owns the connection
    - Update lms_connections.status to 'disconnected'
    - Create parent_notification for disconnection
    - Create audit log entry
    - Return success message
    - _Requirements: 2.9, 6.4_

  - [ ] 11.3 Implement GET /api/parent/lms/status/:studentId
    - Validate parent authentication and authorization
    - Verify parent has access to student
    - Query lms_connections for the student
    - Return array of connections with status, last_sync_at, and provider
    - _Requirements: 2.8_

  - [ ]* 11.4 Write property test for parent authorization requirement
    - **Property 1: Parent Confirmation Required for LMS Connection**
    - **Validates: Requirements 2.5**
    - Test that connection attempts without parent auth are rejected
    - Use fast-check to generate random connection attempts

  - [ ]* 11.5 Write property test for authorization audit logging
    - **Property 13: Authorization Audit Logging**
    - **Validates: Requirements 6.4**
    - Test that all authorization actions create audit log entries
    - Use fast-check to generate random authorization actions

- [ ] 12. Build internal sync trigger endpoints
  - [ ] 12.1 Implement POST /api/internal/sync/trigger
    - Mark as internal-only endpoint (not exposed publicly)
    - Validate request body (studentId, trigger type)
    - Call SmartSyncService.syncOnLogin for the student
    - Return sync results for all connections
    - Handle errors gracefully and return partial results
    - _Requirements: 3.1, 3.3, 4.1, 4.3_

  - [ ] 12.2 Set up cron job for 3AM batch sync
    - Create cron configuration for daily 3:00 AM execution
    - Call SmartSyncService.batchSyncAll
    - Log batch sync results
    - Send summary notifications to admins if needed
    - _Requirements: 3.3, 4.3_

- [ ] 13. Build student sync status endpoint
  - [ ] 13.1 Implement GET /api/student/sync-status
    - Validate student authentication
    - Check Redis cache for sync status (key: sync:status:${studentId})
    - If cache miss, query lms_connections and synced_assignments
    - Calculate minutes since last sync
    - Count new assignments since last student login
    - Generate user-friendly status messages
    - Cache result in Redis with 5-minute TTL
    - Return connections array with status details
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 13.2 Write property test for manual upload availability
    - **Property 9: Manual Upload Availability Regardless of LMS Status**
    - **Validates: Requirements 5.8**
    - Test that manual uploads work for any LMS connection status
    - Use fast-check to generate random connection statuses

- [ ] 14. Checkpoint - Verify API routes
  - Test all endpoints with Postman or automated tests
  - Verify authentication and authorization checks
  - Test error handling for invalid requests
  - Ensure all tests pass, ask the user if questions arise

## Phase 5: The Showroom (Frontend UI)

- [ ] 15. Build Integration Panel for Parent Dashboard
  - [ ] 15.1 Create IntegrationPanel component structure
    - Create IntegrationPanel.tsx component file
    - Accept props: studentId, studentName
    - Set up component state for connection status and loading states
    - Implement glassmorphic card with backdrop-blur-md
    - Use bg-slate-950 base background and indigo accents
    - _Requirements: 2.1, 10.1, 10.2, 10.3_

  - [ ] 15.2 Implement Canvas connection section
    - Display Canvas logo with proper spacing
    - Add input field for Canvas instance URL
    - Add input field for Personal Access Token
    - Add COPPA authorization checkbox with legal text
    - Implement connect button that calls POST /api/parent/lms/connect
    - Show loading state during connection attempt
    - Display success/error messages
    - _Requirements: 2.2, 2.4, 2.5, 2.6, 10.6_

  - [ ] 15.3 Implement Google Classroom connection section
    - Display Google Classroom logo with proper spacing
    - Add COPPA authorization checkbox with legal text
    - Implement OAuth button that redirects to Google consent screen
    - Handle OAuth callback and token exchange
    - Show loading state during OAuth flow
    - Display success/error messages
    - _Requirements: 2.3, 2.4, 2.5, 2.7, 10.6_

  - [ ] 15.4 Implement connection status display
    - Show active connections with green status indicator
    - Display timestamp of authorization (authorized_at)
    - Show last sync timestamp if available
    - Display failed/blocked status with red/yellow indicators
    - Add disconnect button for active connections
    - Implement smooth transitions between states
    - _Requirements: 2.8, 2.9, 10.7_

  - [ ] 15.5 Implement responsive mobile layout
    - Use responsive grid/flexbox for mobile devices
    - Stack connection sections vertically on small screens
    - Ensure touch targets are appropriately sized
    - Test on various screen sizes
    - _Requirements: 10.8_

  - [ ]* 15.6 Write property test for connection status display
    - **Property 2: Connection Status Display After Successful Connection**
    - **Validates: Requirements 2.8**
    - Test that successful connections always display status with timestamp
    - Use React Testing Library with fast-check to generate random connection states

  - [ ]* 15.7 Write property test for disconnect functionality
    - **Property 3: Disconnect Functionality for Active Connections**
    - **Validates: Requirements 2.9**
    - Test that disconnect action works for any active connection
    - Use React Testing Library with fast-check to generate random active connections

- [ ] 16. Update Student Dashboard with dual-intake UI
  - [ ] 16.1 Create SyncStatusIndicator component
    - Create SyncStatusIndicator.tsx component file
    - Accept props: connections array with status details
    - Display color-coded status badges (🟢 success, 🔴 failed, 🟡 blocked)
    - Show time since last sync (e.g., "Synced 5 mins ago")
    - Display new assignments count
    - Show fallback message when no LMS connected
    - Use glassmorphic styling consistent with Dark Space UI
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.2_

  - [ ] 16.2 Create DualIntakeAirlock component
    - Create DualIntakeAirlock.tsx component file
    - Accept props: studentId, syncStatus
    - Place SyncStatusIndicator at top of component
    - Maintain existing drag-and-drop upload zone below
    - Add explanatory text: "School blocked the connection? Or have a physical handout? Drop your PDFs and photos here."
    - Show upload progress indicators
    - Display recent uploads list
    - Show merged assignment indicators (badge/icon)
    - _Requirements: 5.6, 5.7, 5.8, 5.9, 5.10, 8.5_

  - [ ] 16.3 Integrate components into /uploads page
    - Replace existing upload interface with DualIntakeAirlock
    - Fetch sync status from GET /api/student/sync-status on page load
    - Implement auto-refresh of sync status every 5 minutes
    - Handle loading and error states
    - Ensure manual upload functionality remains unchanged
    - _Requirements: 5.1, 5.6, 5.8_

  - [ ]* 16.4 Write property test for failed connection display
    - **Property 8: Failed Connection Status Display**
    - **Validates: Requirements 5.4**
    - Test that failed connections always show appropriate error message
    - Use React Testing Library with fast-check to generate random failure states

  - [ ]* 16.5 Write property test for merged assignment indicator
    - **Property 21: Visual Indicator for Merged Assignments**
    - **Validates: Requirements 8.5**
    - Test that merged assignments always display visual indicator
    - Use React Testing Library with fast-check to generate random merged assignments

- [ ] 17. Implement parent notification UI
  - [ ] 17.1 Create notification display component
    - Create ParentNotifications.tsx component
    - Fetch notifications from database for parent
    - Display unread notifications with badge
    - Show notification title, message, and timestamp
    - Implement mark-as-read functionality
    - Use glassmorphic styling
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 17.2 Integrate notifications into Parent Dashboard
    - Add notification icon to Parent Dashboard header
    - Show unread count badge
    - Display notification panel on click
    - Auto-refresh notifications periodically
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 17.3 Write property test for parent notifications
    - **Property 22: Parent Notification for Sync Events**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
    - Test that all sync events generate appropriate notifications
    - Use fast-check to generate random sync events

- [ ] 18. Checkpoint - Verify UI components
  - Test IntegrationPanel in Parent Dashboard
  - Test SyncStatusIndicator and DualIntakeAirlock in Student Dashboard
  - Verify responsive design on mobile devices
  - Test all user interactions and state transitions
  - Ensure all tests pass, ask the user if questions arise

## Phase 6: The Shield (Testing)

- [ ] 19. Implement property-based tests for authorization
  - [ ]* 19.1 Property 10: Student Authorization Prevention
    - **Validates: Requirements 6.1**
    - Test that student users cannot authorize LMS connections
    - Use fast-check to generate random student authorization attempts
    - Verify all attempts are rejected with appropriate error

  - [ ]* 19.2 Property 11: Parent Dashboard Authorization Origin
    - **Validates: Requirements 6.2**
    - Test that all successful authorizations originated from Parent Dashboard
    - Use fast-check to generate random authorization sources
    - Verify only Parent Dashboard authorizations succeed

  - [ ]* 19.3 Property 12: COPPA Enforcement for Minors
    - **Validates: Requirements 6.3**
    - Test that students under 13 require parent authorization
    - Use fast-check to generate random student ages
    - Verify enforcement for all minors

- [ ] 20. Implement property-based tests for graceful degradation
  - [ ]* 20.1 Property 14: Parent Notification on Manual Mode Switch
    - **Validates: Requirements 7.2**
    - Test that automatic fallback to manual mode triggers parent notification
    - Use fast-check to generate random firewall block scenarios
    - Verify notification is always sent

  - [ ]* 20.2 Property 15: Manual Upload Functionality During LMS Block
    - **Validates: Requirements 7.3**
    - Test that manual uploads work when LMS is blocked
    - Use fast-check to generate random blocked connection states
    - Verify upload functionality remains intact

  - [ ]* 20.3 Property 16: Connection Retry Attempts
    - **Validates: Requirements 7.4**
    - Test that blocked connections are periodically retried
    - Use fast-check to generate random blocked connections
    - Verify retry attempts occur at expected intervals

- [ ] 21. Implement property-based tests for deduplication
  - [ ]* 21.1 Property 17: Unique Identifier Generation for Synced Assignments
    - **Validates: Requirements 8.1**
    - Test that synced assignments have unique identifiers
    - Use fast-check to generate random assignments
    - Verify no duplicate identifiers are created

  - [ ]* 21.2 Property 19: Assignment Merging on Match
    - **Validates: Requirements 8.3**
    - Test that matching assignments are merged
    - Use fast-check to generate random matching pairs
    - Verify merge occurs when similarity exceeds threshold

- [ ] 22. Implement integration tests
  - [ ]* 22.1 Test end-to-end parent authorization flow
    - Test complete flow from Parent Dashboard to database
    - Mock Canvas and Google Classroom APIs
    - Verify connection record creation
    - Verify notification generation

  - [ ]* 22.2 Test end-to-end sync flow
    - Test login-triggered sync from Student Dashboard
    - Mock LMS API responses with sample assignments
    - Verify assignments are stored in database
    - Verify deduplication logic
    - Verify sync status updates

  - [ ]* 22.3 Test firewall detection and fallback
    - Simulate network errors indicating firewall block
    - Verify connection status changes to 'blocked'
    - Verify parent notification is sent
    - Verify manual upload remains functional

  - [ ]* 22.4 Test OAuth token refresh flow
    - Simulate expired Google OAuth token
    - Verify automatic token refresh attempt
    - Verify sync continues after successful refresh
    - Verify error handling if refresh fails

- [ ] 23. Implement edge case tests
  - [ ]* 23.1 Test empty assignment list handling
    - Simulate LMS returning no assignments
    - Verify sync completes successfully
    - Verify appropriate status message

  - [ ]* 23.2 Test assignment without attachments
    - Simulate assignment with no files
    - Verify assignment is still stored
    - Verify no download errors occur

  - [ ]* 23.3 Test concurrent sync triggers
    - Simulate multiple sync triggers for same student
    - Verify only one sync executes at a time
    - Verify no race conditions or duplicate records

  - [ ]* 23.4 Test partial download failure
    - Simulate some attachments failing to download
    - Verify successful downloads are preserved
    - Verify failed attachments are retried on next sync

  - [ ]* 23.5 Test very long assignment titles
    - Generate assignments with titles exceeding 255 characters
    - Verify titles are truncated or handled gracefully
    - Verify no database constraint violations

- [ ] 24. Final checkpoint and validation
  - Run all unit tests and verify 100% pass rate
  - Run all property-based tests with 100 iterations each
  - Run integration tests end-to-end
  - Verify test coverage exceeds 80%
  - Run performance benchmarks (sync <5s for 50 assignments)
  - Test on staging environment with real LMS test accounts
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Phases must be completed in strict sequential order (1→2→3→4→5→6)
- Checkpoints ensure incremental validation at phase boundaries
- Property tests validate universal correctness properties using fast-check
- All 23 correctness properties from the design document are covered
- Manual testing checklist available in design document for Beta Cohort validation

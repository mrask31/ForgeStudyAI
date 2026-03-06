# Implementation Plan: Dual AI Orchestration

## Overview

This implementation plan breaks down the Dual AI Orchestration feature into sequential, actionable phases. The system orchestrates Gemini Pro Vision for image processing and Claude 3.5 Sonnet for Socratic tutoring, with comprehensive prompt caching, error handling, and metrics tracking.

## Tasks

- [x] 1. Phase 1: Foundation (Database & Types)
  - [x] 1.1 Create database migration for parsed_content table
    - Add all columns: id, manual_upload_id, student_id, markdown_content, token_count, processing_status, error_message, gemini_model_version, processing_time_ms, created_at, updated_at
    - Add constraints: valid_status CHECK, valid_token_count CHECK
    - Add indexes: idx_parsed_content_manual_upload, idx_parsed_content_student, idx_parsed_content_status
    - Add RLS policies for student access and service role management
    - _Requirements: 1.6, 4.3_

  - [x] 1.2 Create database migration for chat_sessions and chat_messages tables
    - Create chat_sessions table with columns: id, student_id, parsed_content_id, synced_assignment_id, session_title, created_at, updated_at
    - Create chat_messages table with columns: id, session_id, role, content, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, model_version, created_at
    - Add constraints: valid_role CHECK
    - Add indexes: idx_chat_sessions_student, idx_chat_messages_session, idx_chat_messages_created
    - Add RLS policies for student access and service role management
    - _Requirements: 9.1, 9.4_

  - [x] 1.3 Create database migration for ai_metrics table
    - Add all columns: id, student_id, service_type, operation_type, model_version, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, latency_ms, estimated_cost_usd, success, error_message, created_at
    - Add constraints: valid_service CHECK, valid_tokens CHECK
    - Add indexes: idx_ai_metrics_service, idx_ai_metrics_created, idx_ai_metrics_student
    - Add RLS policy for service role only
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 1.4 Generate TypeScript interfaces for all data models
    - Create types for ParsedContent, ChatSession, ChatMessage, AIMetric
    - Create types for VisionProcessingResult, ImageMetadata, ChatResponse, SourceMaterial, CacheMetrics
    - Place in src/types/dual-ai-orchestration.ts
    - _Requirements: 1.6, 2.2, 2.3, 3.1_

  - [x] 1.5 Set up environment variable configuration for API keys
    - Add ANTHROPIC_API_KEY and GEMINI_API_KEY to .env.example
    - Create validation function to check API keys on startup
    - Implement graceful failure with descriptive error when keys are missing
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 2. Phase 2: The Senses (Gemini Vision Service)
  - [x] 2.1 Implement GeminiVisionService class with core structure
    - Create src/lib/ai/GeminiVisionService.ts
    - Initialize GoogleGenerativeAI client with API key
    - Set up model configuration (gemini-1.5-pro-vision, temperature: 0.2, maxOutputTokens: 4096)
    - Define SUPPORTED_FORMATS constant
    - _Requirements: 1.1, 1.8_

  - [x] 2.2 Build vision extraction prompt template
    - Create VISION_EXTRACTION_PROMPT constant with instructions for text, formulas, diagrams, and document structure
    - Include quality standards and Markdown formatting rules
    - _Requirements: 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4_

  - [x] 2.3 Implement processImage method with image processing and Markdown conversion
    - Read image file from /uploads directory
    - Build multimodal API request with prompt and image
    - Call Gemini API and extract response text
    - Format response as clean Markdown
    - Count tokens in the result
    - Track processing time
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.5_

  - [x] 2.4 Add error handling for unsupported formats and unreadable images
    - Implement validateImageFormat method
    - Implement validateImageSize method (max 20MB)
    - Handle API errors with user-friendly messages
    - Return VisionProcessingResult with error details
    - _Requirements: 1.7, 8.1, 8.3_

  - [x] 2.5 Implement database integration to link parsed content to manual_uploads
    - Create saveProcessedContent function
    - Insert parsed_content record with all metadata
    - Update manual_uploads status to 'processed' on success
    - Update manual_uploads status to 'failed' on error
    - _Requirements: 1.6, 4.3, 4.4, 4.5_

  - [ ]* 2.6 Write property test for vision processing trigger
    - **Property 1: Vision Processing Triggers on Upload**
    - **Validates: Requirements 1.1, 4.1**

  - [ ]* 2.7 Write property test for content extraction completeness
    - **Property 2: Content Extraction Completeness**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3**

  - [ ]* 2.8 Write property test for parsed content round-trip
    - **Property 3: Parsed Content Round-Trip**
    - **Validates: Requirements 1.6, 4.3**

  - [ ]* 2.9 Write unit tests for edge cases
    - Test unreadable/corrupted images
    - Test unsupported image formats
    - Test missing API key
    - Test API rate limit exceeded
    - _Requirements: 1.7, 6.3, 8.1, 8.3, 8.4_

- [ ] 3. Checkpoint - Ensure vision processing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Phase 3: The Conscience (Claude Service)
  - [x] 4.1 Implement ClaudeService class with core structure
    - Create src/lib/ai/ClaudeService.ts
    - Initialize Anthropic client with API key
    - Set up model configuration (claude-3-5-sonnet-20241022)
    - Define CACHE_THRESHOLD constant (1024 tokens)
    - _Requirements: 2.1, 2.10_

  - [x] 4.2 Build Socratic system prompt with anti-cheat constraints
    - Create SOCRATIC_SYSTEM_PROMPT constant
    - Include role definition, critical constraints (never/always do), response strategy for direct answer requests
    - Include teaching strategy and source material usage guidelines
    - Include response style guidelines
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 4.3 Implement prompt caching with cache_control blocks
    - Create buildContextWithCaching method
    - Implement token counting/estimation logic
    - Apply cache_control to assignment descriptions, rubrics, and PDF content
    - Do not cache student-specific parsed_content
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.5_

  - [x] 4.4 Add streaming response support
    - Implement generateResponse method with streaming option
    - Use anthropic.messages.stream for streaming responses
    - Convert to ReadableStream for API endpoints
    - _Requirements: 2.1_

  - [x] 4.5 Implement token counting and cost tracking
    - Create countTokens method for precise token counting
    - Create estimateTokens function for quick estimation
    - Create calculateCost function with pricing for input, output, cache write, cache read
    - Create trackCacheMetrics method
    - _Requirements: 3.6, 10.1, 10.2_

  - [ ]* 4.6 Write property test for anti-cheat enforcement
    - **Property 6: Anti-Cheat Enforcement**
    - **Validates: Requirements 2.6, 2.7, 2.8, 2.9**

  - [ ]* 4.7 Write property test for prompt caching application
    - **Property 7: Prompt Caching Application**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 5.5**

  - [ ]* 4.8 Write property test for cache reuse within TTL
    - **Property 8: Cache Reuse Within TTL**
    - **Validates: Requirements 3.5**

  - [ ]* 4.9 Write unit tests for Claude service
    - Test system prompt enforcement
    - Test streaming responses
    - Test token counting accuracy
    - Test cost calculation
    - _Requirements: 2.5, 2.10, 3.6, 10.2_

- [ ] 5. Checkpoint - Ensure Claude service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Phase 4: API Endpoints
  - [x] 6.1 Build POST /api/vision/process endpoint
    - Create src/app/api/vision/process/route.ts
    - Validate request body (upload_id, student_id)
    - Retrieve upload record from manual_uploads table
    - Call GeminiVisionService.processImage
    - Save parsed content to database
    - Return VisionProcessingResult
    - _Requirements: 1.1, 4.1, 4.2_

  - [x] 6.2 Build POST /api/chat endpoint
    - Create src/app/api/chat/route.ts
    - Validate request body (session_id, message, optional parsed_content_id, synced_assignment_id, stream)
    - Load chat history from database
    - Retrieve source material (parsed content, LMS data)
    - Call ClaudeService.generateResponse
    - Save chat message to database
    - Return streaming or non-streaming response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.2_

  - [x] 6.3 Add rate limiting for both endpoints
    - Create RateLimiter class with per-student limits
    - Apply 10 requests/minute limit for vision endpoint
    - Apply 30 requests/minute limit for chat endpoint
    - Return user-friendly error when rate limit exceeded
    - _Requirements: 8.4_

  - [x] 6.4 Implement error handling and graceful degradation
    - Create AIServiceError class with error codes
    - Implement handleAPIError function for API failures
    - Implement retryWithBackoff function with exponential backoff
    - Implement getResponseWithFallback for chat endpoint
    - Ensure API keys never appear in error messages
    - _Requirements: 6.4, 8.1, 8.2, 8.5_

  - [ ]* 6.5 Write property test for API key security
    - **Property 10: API Key Security**
    - **Validates: Requirements 6.4**

  - [ ]* 6.6 Write property test for exponential backoff retry
    - **Property 13: Exponential Backoff Retry**
    - **Validates: Requirements 8.5**

  - [ ]* 6.7 Write unit tests for API endpoints
    - Test vision endpoint with valid upload
    - Test chat endpoint with valid session
    - Test rate limiting behavior
    - Test error handling for missing API keys
    - Test error handling for API failures
    - _Requirements: 6.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 7. Checkpoint - Ensure API endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Phase 5: Integration & Orchestration
  - [x] 8.1 Connect vision processing to upload events
    - Create file event trigger or polling mechanism for /uploads directory
    - Automatically invoke vision processing when new files appear
    - Handle processing status updates
    - _Requirements: 4.1_

  - [x] 8.2 Integrate LMS Engine data retrieval
    - Create getLMSContext function to retrieve assignment data
    - Query synced_assignments table for assignment_description, teacher_rubric, pdf_content
    - Build SourceMaterial object from LMS data
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.3 Implement chat session management
    - Create createChatSession function
    - Create loadChatHistory function with message limit
    - Create saveChatMessage function
    - Create truncateHistory function for context window management
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.4 Add metrics tracking and monitoring
    - Create trackAPIUsage function to log all AI API calls
    - Insert records into ai_metrics table with token counts, cache status, latency
    - Implement cost threshold alerts
    - Expose aggregated metrics endpoint for monitoring
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 8.5 Write property test for processing status updates
    - **Property 4: Processing Status Updates**
    - **Validates: Requirements 4.4**

  - [ ]* 8.6 Write property test for tutor agent input acceptance
    - **Property 5: Tutor Agent Input Acceptance**
    - **Validates: Requirements 2.2, 2.3, 2.4, 5.1, 5.4**

  - [ ]* 8.7 Write property test for LMS data retrieval
    - **Property 9: LMS Data Retrieval**
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 8.8 Write property test for conversation history persistence
    - **Property 14: Conversation History Persistence**
    - **Validates: Requirements 9.1, 9.4**

  - [ ]* 8.9 Write property test for context window management
    - **Property 15: Context Window Management**
    - **Validates: Requirements 9.2**

  - [ ]* 8.10 Write property test for history truncation with source preservation
    - **Property 16: History Truncation with Source Preservation**
    - **Validates: Requirements 9.3**

  - [ ]* 8.11 Write property test for new session initialization
    - **Property 17: New Session Initialization**
    - **Validates: Requirements 9.5**

  - [ ]* 8.12 Write unit tests for integration points
    - Test LMS data retrieval with missing data
    - Test chat session creation and linking
    - Test history truncation logic
    - Test metrics tracking
    - _Requirements: 5.1, 5.2, 5.3, 9.1, 9.3, 10.1_

- [ ] 9. Checkpoint - Ensure integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Phase 6: Comprehensive Testing
  - [ ]* 10.1 Write property test for document structure preservation
    - **Property 11: Document Structure Preservation**
    - **Validates: Requirements 7.4**

  - [ ]* 10.2 Write property test for Markdown round-trip validation
    - **Property 12: Markdown Round-Trip Validation**
    - **Validates: Requirements 7.5**

  - [ ]* 10.3 Write property test for API call logging
    - **Property 18: API Call Logging**
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [ ]* 10.4 Write property test for metrics exposure
    - **Property 19: Metrics Exposure**
    - **Validates: Requirements 10.4**

  - [ ]* 10.5 Write property test for cost threshold alerts
    - **Property 20: Cost Threshold Alerts**
    - **Validates: Requirements 10.5**

  - [ ]* 10.6 Write integration tests for end-to-end flows
    - Test image upload → vision processing → database storage
    - Test chat session → LMS data retrieval → Claude response → history storage
    - Test prompt caching across multiple chat messages
    - Test error recovery and graceful degradation
    - _Requirements: 1.1, 2.1, 3.5, 8.5_

  - [ ]* 10.7 Set up test mocks for AI APIs
    - Mock @google/generative-ai for Gemini Vision
    - Mock @anthropic-ai/sdk for Claude
    - Create test fixtures for sample images and responses
    - _Requirements: 1.8, 2.10_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each phase
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout as specified in the design document
- All AI API interactions use official SDKs: @google/generative-ai and @anthropic-ai/sdk

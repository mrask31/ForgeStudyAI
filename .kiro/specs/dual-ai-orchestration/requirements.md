# Requirements Document

## Introduction

This specification defines a Mixture of Experts (MoE) architecture that orchestrates two specialized AI models: Gemini Pro Vision for visual content processing and Claude 3.5 Sonnet for Socratic tutoring. The system processes student-uploaded images and LMS-synced PDFs, then provides anti-cheat educational guidance through a chat interface.

## Glossary

- **MoE_Orchestrator**: The dual AI orchestration system that routes tasks to specialized models
- **Vision_Processor**: Gemini Pro Vision component responsible for OCR and visual content extraction
- **Tutor_Agent**: Claude 3.5 Sonnet component responsible for Socratic dialogue
- **Manual_Airlock**: The existing /uploads directory for student image submissions
- **Logic_Loom**: The chat interface endpoint at /api/chat
- **LMS_Engine**: The existing LMS synchronization system that provides PDF text
- **Parsed_Content**: Markdown-formatted text extracted from images or PDFs
- **Context_Window**: The input provided to the Tutor_Agent including source material
- **Prompt_Cache**: Anthropic's caching mechanism for reusing large context blocks
- **Source_Material**: Teacher-provided rubrics, assignment descriptions, or PDF content
- **Manual_Upload_Record**: Database entry linking uploaded images to students

## Requirements

### Requirement 1: Vision Processing Pipeline

**User Story:** As a student, I want to upload images of my homework, so that the system can understand the content and help me learn.

#### Acceptance Criteria

1. WHEN an image file is uploaded to the Manual_Airlock, THE Vision_Processor SHALL process the image using Gemini Pro Vision
2. THE Vision_Processor SHALL extract text content from the uploaded image
3. THE Vision_Processor SHALL extract mathematical formulas from the uploaded image
4. THE Vision_Processor SHALL extract spatial diagrams from the uploaded image
5. THE Vision_Processor SHALL convert all extracted content into valid Markdown format
6. THE Vision_Processor SHALL save the Parsed_Content to the database linked to the corresponding Manual_Upload_Record
7. WHEN the Vision_Processor encounters an unreadable image, THE Vision_Processor SHALL return a descriptive error message
8. THE Vision_Processor SHALL use the @google/generative-ai SDK for all Gemini API interactions

### Requirement 2: Socratic Tutoring Engine

**User Story:** As a student, I want to chat with an AI tutor that guides me without giving answers, so that I can learn through discovery.

#### Acceptance Criteria

1. THE Tutor_Agent SHALL power the Logic_Loom endpoint at /api/chat
2. THE Tutor_Agent SHALL accept Parsed_Content from the Vision_Processor as input
3. THE Tutor_Agent SHALL accept downloaded PDF text from the LMS_Engine as input
4. THE Tutor_Agent SHALL inject Source_Material directly into the Context_Window
5. THE Tutor_Agent SHALL use a hardcoded system prompt that enforces Socratic teaching methods
6. THE Tutor_Agent SHALL NOT write complete essays for students
7. THE Tutor_Agent SHALL NOT solve mathematical problems directly for students
8. THE Tutor_Agent SHALL NOT provide direct answers to assignment questions
9. WHEN a student requests a direct answer, THE Tutor_Agent SHALL respond with guiding questions based on the Source_Material
10. THE Tutor_Agent SHALL use the @anthropic-ai/sdk for all Claude API interactions

### Requirement 3: Prompt Caching for Cost Optimization

**User Story:** As a system administrator, I want to cache large PDF contexts, so that API costs remain sustainable.

#### Acceptance Criteria

1. THE Tutor_Agent SHALL implement Anthropic Prompt Caching for Source_Material exceeding 1024 tokens
2. THE Tutor_Agent SHALL cache teacher rubrics in the Context_Window
3. THE Tutor_Agent SHALL cache assignment descriptions in the Context_Window
4. THE Tutor_Agent SHALL cache PDF content from the LMS_Engine in the Context_Window
5. WHEN a cached context is reused within the cache TTL, THE Tutor_Agent SHALL use the cached version instead of re-sending the full content
6. THE Tutor_Agent SHALL track cache hit rates for monitoring purposes

### Requirement 4: Integration with Manual Upload Airlock

**User Story:** As a developer, I want the Vision_Processor to integrate with the existing upload system, so that image processing happens automatically.

#### Acceptance Criteria

1. WHEN a new file appears in the Manual_Airlock directory, THE MoE_Orchestrator SHALL trigger the Vision_Processor
2. THE Vision_Processor SHALL read image files from the /uploads directory
3. THE Vision_Processor SHALL create a database record linking Parsed_Content to the Manual_Upload_Record
4. THE Vision_Processor SHALL update the Manual_Upload_Record status to indicate processing completion
5. WHEN processing fails, THE Vision_Processor SHALL update the Manual_Upload_Record status to indicate the failure

### Requirement 5: Integration with LMS Sync Engine

**User Story:** As a student, I want the tutor to understand my LMS assignments, so that guidance is relevant to my coursework.

#### Acceptance Criteria

1. THE Tutor_Agent SHALL accept PDF text content from the LMS_Engine
2. THE Tutor_Agent SHALL retrieve assignment descriptions from the LMS_Engine database
3. THE Tutor_Agent SHALL retrieve teacher rubrics from the LMS_Engine database
4. WHEN LMS content is available for a student query, THE Tutor_Agent SHALL include it in the Context_Window
5. WHEN LMS content exceeds 1024 tokens, THE Tutor_Agent SHALL apply Prompt_Cache to the LMS content

### Requirement 6: API Configuration and Security

**User Story:** As a system administrator, I want secure API key management, so that credentials are not exposed.

#### Acceptance Criteria

1. THE MoE_Orchestrator SHALL read ANTHROPIC_API_KEY from environment variables
2. THE MoE_Orchestrator SHALL read GEMINI_API_KEY from environment variables
3. WHEN either API key is missing, THE MoE_Orchestrator SHALL fail gracefully with a descriptive error
4. THE MoE_Orchestrator SHALL NOT log API keys in any error messages or debug output
5. THE MoE_Orchestrator SHALL validate API keys on startup before processing requests

### Requirement 7: Content Format Standardization

**User Story:** As a developer, I want consistent Markdown output from vision processing, so that the tutor receives clean input.

#### Acceptance Criteria

1. THE Vision_Processor SHALL format extracted text as standard Markdown paragraphs
2. THE Vision_Processor SHALL format mathematical formulas using LaTeX syntax within Markdown code blocks
3. THE Vision_Processor SHALL format spatial diagrams as descriptive text with ASCII art or structured descriptions
4. THE Vision_Processor SHALL preserve the logical structure of multi-section documents
5. FOR ALL valid images, processing then formatting SHALL produce parseable Markdown (round-trip property)

### Requirement 8: Error Handling and Resilience

**User Story:** As a student, I want clear error messages when something goes wrong, so that I know how to fix the issue.

#### Acceptance Criteria

1. WHEN the Vision_Processor encounters an API error, THE Vision_Processor SHALL log the error and return a user-friendly message
2. WHEN the Tutor_Agent encounters an API error, THE Tutor_Agent SHALL log the error and return a user-friendly message
3. WHEN an image format is unsupported, THE Vision_Processor SHALL return a message listing supported formats
4. WHEN API rate limits are exceeded, THE MoE_Orchestrator SHALL return a message indicating temporary unavailability
5. THE MoE_Orchestrator SHALL implement exponential backoff for transient API failures

### Requirement 9: Chat Context Management

**User Story:** As a student, I want the tutor to remember our conversation, so that I don't have to repeat myself.

#### Acceptance Criteria

1. THE Tutor_Agent SHALL maintain conversation history for each chat session
2. THE Tutor_Agent SHALL include previous messages in the Context_Window for continuity
3. WHEN conversation history exceeds the Context_Window limit, THE Tutor_Agent SHALL truncate older messages while preserving Source_Material
4. THE Tutor_Agent SHALL store conversation history in the database linked to the student session
5. WHEN a new chat session begins, THE Tutor_Agent SHALL start with an empty conversation history

### Requirement 10: Monitoring and Observability

**User Story:** As a system administrator, I want to monitor AI usage and costs, so that I can optimize the system.

#### Acceptance Criteria

1. THE MoE_Orchestrator SHALL log all Vision_Processor API calls with token counts
2. THE MoE_Orchestrator SHALL log all Tutor_Agent API calls with token counts and cache status
3. THE MoE_Orchestrator SHALL track processing latency for both Vision_Processor and Tutor_Agent
4. THE MoE_Orchestrator SHALL expose metrics for cache hit rates, API costs, and error rates
5. WHEN API costs exceed a configurable threshold, THE MoE_Orchestrator SHALL emit a warning alert

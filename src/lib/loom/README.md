# Logic Loom - AI Brain Implementation

This directory contains the core AI brain components for the Logic Loom Synthesis Engine, implementing Tasks 11 & 12 from the specification.

## Overview

The Logic Loom AI brain enables Socratic dialogue between students and Gemini 3.1 Ultra to guide intellectual synthesis across 2-4 mastered concepts. The system enforces strict "Anti-Bailout" constraints to ensure students discover connections themselves rather than being told the answers.

## Architecture

```
src/lib/loom/
├── schemas.ts              # Zod schemas for structured output
├── socratic-prompt.ts      # Socratic Master Prompt system
├── gemini-client.ts        # Gemini API client with caching
├── sanitize-input.ts       # Input sanitization utilities
└── README.md              # This file
```

## Components

### 1. schemas.ts - Structured Output Validation

**Purpose**: Define and validate Gemini's structured JSON responses using Zod.

**Key Exports**:
- `SocraticResponseSchema`: Zod schema for AI responses
- `SocraticResponse`: TypeScript type inferred from schema
- `zodToJsonSchema()`: Convert Zod schema to JSON Schema for Gemini
- `parseSocraticResponse()`: Validate and parse Gemini responses

**Schema Structure**:
```typescript
{
  socratic_response: string;           // Required: Socratic question/pushback
  loom_status: 'SPARRING' | 'THESIS_ACHIEVED';  // Required: Session status
  crystallized_thread: string | null;  // Optional: 1-sentence micro-connection
  cryptographic_proof_of_cognition: string | null;  // Optional: Thesis proof
}
```

**Usage**:
```typescript
import { parseSocraticResponse } from '@/lib/loom/schemas';

const response = await gemini.generateContent(...);
const validated = parseSocraticResponse(JSON.parse(response.text()));
```

### 2. socratic-prompt.ts - Master Prompt System

**Purpose**: Build the system prompt that enforces Socratic constraints and personalizes dialogue using student's learning history.

**Key Exports**:
- `buildSocraticSystemPrompt()`: Generate complete system prompt
- `formatProofEventsContext()`: Format historical learning context

**Critical Constraints**:
- ❌ NEVER write the thesis for the student
- ❌ NEVER connect the dots directly
- ❌ NEVER provide answers when student asks "just tell me"
- ✅ ALWAYS demand student articulate connections
- ✅ ALWAYS use student's past analogies for personalization
- ✅ ALWAYS guide micro-connections between TWO concepts at a time
- ✅ ONLY set THESIS_ACHIEVED when student connects ALL concepts

**Usage**:
```typescript
import { buildSocraticSystemPrompt, formatProofEventsContext } from '@/lib/loom/socratic-prompt';

const topics = [
  { id: '1', title: 'Photosynthesis' },
  { id: '2', title: 'Cellular Respiration' }
];

const proofEvents = [
  {
    concept: 'Photosynthesis',
    transcript_excerpt: 'Student explained using sunlight analogy',
    student_analogy: 'Like solar panels charging a battery',
    timestamp: '2024-01-15T10:30:00Z'
  }
];

const context = formatProofEventsContext(proofEvents);
const systemPrompt = buildSocraticSystemPrompt(topics, context);
```

### 3. gemini-client.ts - Gemini API Integration

**Purpose**: Manage Gemini API interactions with context caching for cost optimization.

**Key Exports**:
- `LoomGeminiClient`: Main client class
- `createLoomGeminiClient()`: Factory function
- `sanitizeStudentInput()`: Input sanitization (re-exported)

**Cost Optimization Strategy**:
- First turn: ~2000-5000 tokens (full system prompt + proof_events)
- Subsequent turns: 90% discount on cached tokens
- Cache TTL: 5 minutes (sufficient for typical session)
- Expected savings: 60-70% token cost after first turn

**Usage**:
```typescript
import { createLoomGeminiClient } from '@/lib/loom/gemini-client';

const client = await createLoomGeminiClient(topics, proofEvents);

const response = await client.generateSocraticResponse(
  'Photosynthesis creates glucose and oxygen',
  transcript
);

// Validate thesis achievement
const isValid = client.validateThesisAchievement(response, topics);
```

**Configuration**:
- Model: `gemini-1.5-pro` (Ultra placeholder)
- Temperature: 0.3 (consistent Socratic behavior)
- Response format: JSON (structured output)
- Max output tokens: 1024

### 4. sanitize-input.ts - Security Layer

**Purpose**: Remove malicious content from student messages before processing.

**Key Exports**:
- `sanitizeStudentInput()`: Sanitize and validate input
- `validateStudentInput()`: Pre-sanitization validation

**Sanitization Rules**:
- Remove markdown code blocks (```...```)
- Remove inline code (`...`)
- Remove HTML tags (<...>)
- Remove system instruction markers ([SYSTEM], [ASSISTANT], etc.)
- Remove prompt injection attempts
- Limit length to 2000 characters
- Trim excessive newlines

**Usage**:
```typescript
import { sanitizeStudentInput, validateStudentInput } from '@/lib/loom/sanitize-input';

// Validate first
const validation = validateStudentInput(userInput);
if (!validation.valid) {
  throw new Error(validation.error);
}

// Then sanitize
const clean = sanitizeStudentInput(userInput);
```

## API Endpoint

### POST /api/loom/spar

**Purpose**: Socratic sparring endpoint for synthesis sessions.

**Request**:
```typescript
{
  sessionId: string;  // UUID of loom session
  message: string;    // Student's response
}
```

**Response**:
```typescript
{
  socratic_response: string;           // AI's Socratic question
  loom_status: 'SPARRING' | 'THESIS_ACHIEVED';
  crystallized_thread: string | null;  // Micro-connection summary
  cryptographic_proof: string | null;  // Thesis proof (if achieved)
}
```

**Workflow**:
1. Verify user authentication
2. Validate session ownership and status
3. Fetch session data and topics
4. Query proof_events for historical context
5. Initialize Gemini client with caching
6. Generate Socratic response
7. Update session transcript in database
8. Return structured response

**Error Handling**:
- 400: Invalid request or sanitization failure
- 401: Unauthorized (not authenticated)
- 404: Session not found
- 503: Gemini API unavailable

## UI Integration

### LoomWorkspace Component

**Location**: `src/components/loom/LoomWorkspace.tsx`

**Features Implemented**:
- ✅ Chat message submission with optimistic updates
- ✅ Real-time transcript updates
- ✅ Crystallized thread extraction and display
- ✅ Thesis achievement handling with toast notification
- ✅ Session state persistence
- ✅ Error handling with rollback

**Key Functions**:
```typescript
const handleSendMessage = async (message: string) => {
  // 1. Optimistically add student message
  // 2. Call /api/loom/spar
  // 3. Add AI response to transcript
  // 4. Handle thesis achievement
  // 5. Show toast on success/error
};
```

### OutlineBoard Component

**Location**: `src/components/loom/OutlineBoard.tsx`

**Features Implemented**:
- ✅ Gold pulse animation on new crystallized threads
- ✅ Roman numeral formatting (I, II, III, etc.)
- ✅ Empty state messaging
- ✅ GPU-accelerated animations

**CSS Animation**:
```css
@keyframes gold-pulse {
  0% { background-color: rgba(251, 191, 36, 0.2); transform: scale(1); }
  50% { background-color: rgba(251, 191, 36, 0.4); transform: scale(1.02); }
  100% { background-color: transparent; transform: scale(1); }
}
```

## Testing Strategy

### Unit Tests (Optional - Task 11.6)
- Test structured output parsing
- Test input sanitization
- Test Socratic prompt generation
- Test thesis validation logic

### Integration Tests (Optional - Task 11.6)
- Test /api/loom/spar with mocked Gemini responses
- Test context caching behavior
- Test error handling scenarios
- Test session state persistence

### Property-Based Tests (Optional - Task 12.5)
- Property 5: Transcript role assignment alternation
- Property 14: UI state consistency with session status

## Environment Variables

```bash
# Required
GOOGLE_AI_API_KEY=your_gemini_api_key

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Cost Optimization

### Token Budget per Session
- System prompt: ~1,500 tokens
- Proof events context: ~500-3,500 tokens (varies by history)
- Transcript context: ~2,000 tokens (rolling window)
- Student response: ~200 tokens average
- AI response: ~300 tokens average

### Cost Calculation
- First turn: ~4,000 input tokens + ~300 output tokens = ~$0.013
- Subsequent turns (with caching): ~400 input tokens + ~300 output tokens = ~$0.004
- Average session (10 turns): ~$0.05-0.08

### Optimization Techniques
1. **Prompt Caching**: Cache system prompt + proof_events (90% discount)
2. **Rolling Context**: Keep only last 20 turns in context
3. **Lazy Loading**: Only load proof_events for selected topics
4. **Early Termination**: Validate thesis as soon as student articulates synthesis

## Security Considerations

### Input Sanitization
- Strips markdown code blocks
- Removes HTML tags
- Blocks system instruction markers
- Prevents prompt injection attempts
- Enforces 2000 character limit

### Access Control
- RLS policies enforce user_id = auth.uid()
- Session ownership verified before processing
- Topics ownership verified during initialization

### Rate Limiting (Future)
- 5 new sessions per user per hour
- 50 sparring turns per session (hard limit)

## Future Enhancements

### Context Caching (Pending Gemini API)
The `initializeCache()` method in `LoomGeminiClient` is a placeholder for Gemini's prompt caching API, which is still in preview. Once stable, this will provide:
- 90% token cost reduction on cached content
- 5-minute cache TTL
- Automatic cache invalidation

### Advanced Error Recovery
- Retry logic with exponential backoff
- Fallback to simpler prompts on repeated failures
- Session resume after timeout

### Analytics
- Track average turns to thesis achievement
- Monitor token costs per session
- Identify common synthesis patterns

## Troubleshooting

### "Failed to generate Socratic response"
- Check GOOGLE_AI_API_KEY is set correctly
- Verify Gemini API quota is not exceeded
- Check network connectivity to Gemini API

### "Session not found or access denied"
- Verify user is authenticated
- Check session belongs to current user
- Ensure session exists in database

### "Message cannot be empty after sanitization"
- Student input was entirely malicious content
- Increase sanitization tolerance if needed
- Log original input for debugging

## References

- Design Document: `.kiro/specs/logic-loom-synthesis-engine/design.md`
- Tasks Document: `.kiro/specs/logic-loom-synthesis-engine/tasks.md`
- Gemini API Docs: https://ai.google.dev/docs
- Zod Documentation: https://zod.dev

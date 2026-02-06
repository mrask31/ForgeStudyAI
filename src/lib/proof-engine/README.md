# Proof Engine

The Proof Engine is ForgeStudy's signature feature that makes students prove they understand concepts by explaining them back in their own words.

## Architecture

The Proof Engine consists of four main components:

1. **Proof Engine Middleware** - Orchestrates the proof flow, manages conversation state
2. **Understanding Validator** - Validates student responses using AI-powered analysis
3. **Adaptive Response Generator** - Generates appropriate responses based on validation results
4. **Proof Event Logger** - Logs proof attempts to database for parent dashboard

## Directory Structure

```
src/lib/proof-engine/
├── types.ts                    # Central type definitions (import from here!)
├── utils.ts                    # Shared utilities (sanitization, hashing)
├── middleware.ts               # Main orchestration layer
├── validator.ts                # Understanding validation logic
├── adaptive-response.ts        # Response generation
├── logger.ts                   # Database logging
├── exchange-classifier.ts      # Teaching exchange detection
├── checkpoint-frequency.ts     # Adaptive checkpoint timing
├── prompt-generator.ts         # Explain-back prompt generation
└── __tests__/                  # Test files
    ├── utils.test.ts
    ├── smoke-test.ts
    └── ...
```

## Key Principles

1. **No Confidence Fields** - We use deterministic classification (pass/partial/retry), not confidence scores
2. **Idempotency** - Database uses UNIQUE constraint on (chat_id, response_hash) to prevent duplicates
3. **Privacy Boundary** - Full responses stored for analysis, excerpts shown to parents
4. **Grade-Level Adaptation** - Validation depth and prompt complexity adapt to student grade level
5. **Adaptive Frequency** - Checkpoint intervals adjust based on student performance

## Database Schema

The `proof_events` table stores all proof attempts:

```sql
CREATE TABLE proof_events (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL,
  student_id UUID NOT NULL,
  concept TEXT NOT NULL,
  prompt TEXT NOT NULL,
  student_response TEXT NOT NULL,
  student_response_excerpt TEXT NOT NULL,
  response_hash TEXT NOT NULL,
  validation_result JSONB NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('pass', 'partial', 'retry')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_chat_response UNIQUE (chat_id, response_hash)
);
```

## Testing

- **Unit Tests**: `npm test` - Test individual functions
- **Property Tests**: Use fast-check for universal correctness properties
- **Integration Tests**: Test end-to-end flows
- **Smoke Test**: `npx ts-node src/lib/proof-engine/__tests__/smoke-test.ts`

## Getting Started

1. Apply database migration: `supabase_proof_events_migration.sql`
2. Run smoke test to verify setup
3. Import types from `types.ts` (never duplicate!)
4. Use `sanitizeExcerpt()` from `utils.ts` for all excerpt generation

## Implementation Status

- [x] Task 1: Infrastructure and database schema
- [ ] Task 2: Proof Event Logger
- [ ] Task 3: Understanding Validator
- [ ] Task 4: Adaptive Response Generator
- [ ] Task 5: Teaching Exchange Classifier
- [ ] Task 6: Checkpoint Frequency Calculator
- [ ] Task 7: Explain-Back Prompt Generator
- [ ] Task 8: Proof Engine Middleware
- [ ] Task 9: Core Components Checkpoint
- [ ] Task 10: Chat API Integration
- [ ] Task 11: Parent Dashboard Integration
- [ ] Task 12: Milestone Notifications
- [ ] Task 13: Learning Receipt Integration
- [ ] Task 14: Session Progress Display
- [ ] Task 15: Final Testing Checkpoint

# ForgeStudy AI - Complete Current State Documentation

**Date:** February 24, 2026  
**Purpose:** Comprehensive technical documentation of ForgeStudy AI's current implementation for strategic planning

---

## Executive Summary

ForgeStudy AI is a production-ready AI-powered learning platform for Grades 6-12 students. It combines structured learning methodology with proof-based validation to ensure genuine understanding rather than answer-seeking. The platform is built on a solid technical foundation with Next.js 14, Supabase, and OpenAI GPT-4o.

**Current Status:** Deployed and functional with paying customers
**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL + pgvector), OpenAI GPT-4o, Stripe
**Unique Differentiator:** Proof Engine - validates student understanding through explain-back checkpoints

---

## Part 1: Core Architecture

### Technology Stack

**Frontend:**
- Next.js 14.2.35 (App Router)
- React 19.2.3
- TypeScript 5
- Tailwind CSS 3.4.1
- shadcn/ui + Radix UI components

**Backend:**
- Supabase (PostgreSQL 15 + pgvector for semantic search)
- OpenAI GPT-4o (primary AI model)
- Stripe 20.1.0 (payments & subscriptions)
- Redis 5.10.0 (caching)

**AI/ML:**
- OpenAI GPT-4o for tutoring
- text-embedding-3-small for RAG embeddings
- Custom proof validation engine

**Testing:**
- Jest 30.2.0 (unit tests)
- Playwright 1.57.0 (E2E tests)
- fast-check 4.5.3 (property-based testing)

**Deployment:**
- Vercel (hosting)
- Supabase Cloud (database + auth)
- Stripe (payment processing)

---

## Part 2: Authentication & User Management

### User Account System

**Account Structure:**
- 1 Parent Account → Up to 4 Student Profiles
- Parent owns subscription, manages profiles
- Each student profile has independent learning data

**Authentication Flow:**
1. User signs up via `/signup` (email + password)
2. Supabase creates user in `auth.users` table
3. Database trigger auto-creates profile in `public.profiles`
4. Email verification sent (configurable in Supabase Dashboard)
5. User clicks verification link → redirected to `/checkout`
6. After payment → redirected to `/post-login`
7. User creates first student profile → redirected to dashboard

**Database Tables:**
- `profiles` - Parent account data
  - `id` (UUID, references auth.users)
  - `subscription_status` ('pending_payment', 'active', 'trialing', 'canceled')
  - `trial_ends_at` (timestamp)
  - `onboarding_completed` (boolean)
  - `onboarding_step` (integer)
  
- `student_profiles` - Student data
  - `id` (UUID)
  - `owner_id` (UUID, references profiles)
  - `display_name` (text)
  - `grade_band` ('elementary', 'middle', 'high')
  - `grade` (text, e.g., "6", "7", "8")
  - `interests` (text, comma-separated hobbies)
  - `created_at`, `updated_at`

**Row Level Security (RLS):**
- All tables have RLS enabled
- Users can only access their own data
- Parent can access all child profiles
- Service role key bypasses RLS for middleware

**Middleware Protection:**
- Routes categorized: Public, Auth-only, Billing, Protected
- Subscription check on all protected routes
- Redirects to `/checkout` if subscription inactive
- Profile gate: requires at least 1 student profile

---

## Part 3: Subscription & Billing

### Stripe Integration

**Subscription Plans:**
- Individual Monthly: $X/month
- Individual Annual: $Y/year (25% discount)
- Family Monthly: $Z/month (up to 4 students)
- Family Annual: $W/year (25% discount)

**Trial System:**
- 7-day free trial
- No credit card required upfront
- `trial_ends_at` stored in profiles table
- Middleware checks trial status on every request

**Payment Flow:**
1. User completes signup → redirected to `/checkout`
2. Stripe Checkout session created with price ID
3. User enters payment info → Stripe processes
4. Webhook updates `subscription_status` to 'active'
5. User redirected to `/billing/success`
6. Success page polls subscription status (waits for webhook)
7. Once verified → redirected to `/profiles/new`

**Webhook Handling:**
- `POST /api/stripe/webhook` - Handles Stripe events
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Updates `profiles.subscription_status` in database
- Verifies webhook signature for security

**Subscription Status Values:**
- `pending_payment` - New user, no payment yet
- `trialing` - In 7-day trial period
- `active` - Paid subscription active
- `canceled` - Subscription canceled
- `past_due` - Payment failed

---

## Part 4: The Proof Engine (Core Differentiator)

### Overview

The Proof Engine is ForgeStudy's unique feature that validates genuine understanding through explain-back checkpoints. Unlike traditional AI tutors that accept any response, ForgeStudy requires students to explain concepts in their own words.

### Architecture

**Components:**
1. **Conversation State Tracker** - Monitors teaching exchanges
2. **Checkpoint Frequency Calculator** - Determines when to trigger checkpoints
3. **Understanding Validator** - Multi-stage AI validation pipeline
4. **Adaptive Response Generator** - Generates grade-appropriate feedback
5. **Proof Event Logger** - Records validation results to database

### Validation Pipeline (3 Stages)

**Stage 1: Detect Insufficient Responses**
- Parroting: Student copies teaching text verbatim
- Keyword Stuffing: Lists terms without explanation
- Vague Acknowledgment: "I understand" without substance
- Uses AI + heuristic fallback for reliability

**Stage 2: Assess Comprehension Depth**
- Key Concepts: Which concepts are present?
- Relationships: How are concepts connected?
- Misconceptions: Any critical misunderstandings?
- Depth Assessment: Appropriate for grade level?
- Grade-adaptive expectations (6-8 vs 9-12)

**Stage 3: Classify and Generate Guidance**
- **Pass**: All checks passed → celebrate and advance
- **Partial**: Missing elements → hint forward
- **Retry**: Insufficient or misconceptions → reteach

### Checkpoint Frequency

**Adaptive Triggering:**
- Initial: Every 3-4 teaching exchanges
- After pass: Increase interval (5-6 exchanges)
- After retry: Decrease interval (2-3 exchanges)
- Never triggers immediately after previous checkpoint (guard)

**Teaching Exchange Classification:**
- AI determines if message is "teaching" vs "off-topic"
- Only teaching exchanges count toward checkpoint target
- Prevents checkpoints during casual conversation

### Database Schema

**Table: `proof_events`**
```sql
CREATE TABLE proof_events (
  id UUID PRIMARY KEY,
  chat_id UUID REFERENCES chats(id),
  student_id UUID REFERENCES student_profiles(id),
  concept TEXT,
  prompt TEXT,
  student_response TEXT,
  student_response_excerpt TEXT,
  response_hash TEXT,
  validation_result JSONB,
  classification TEXT, -- 'pass', 'partial', 'retry'
  created_at TIMESTAMPTZ
);
```

**Stored Data:**
- Full student response (for analysis)
- Validation result (keyConcepts, relationships, misconceptions)
- Classification (pass/partial/retry)
- Concept being validated
- Timestamp for spaced repetition

### Passive Features (Implemented)

**A. Diagnostic Feedback**
- ONE sentence hint on retry (what's missing, not what's wrong)
- Deterministic templates (no AI calls)
- Never stored, never shown to parents
- Example: "This repeats the explanation without showing your own understanding."

**B. Learning Receipts**
- Read-only list of proof events
- Accessible via `/proof-history` (quiet sidebar link)
- Shows: concept, date proven, retries, method
- No celebrations, no gamification

**C. Parent Actionables**
- Weekly summary in parent dashboard
- Aggregates proof events by concept
- Identifies patterns (3+ retries in 7 days)
- Max 3 neutral observations
- Dismissible, non-persistent
- Example: "Photosynthesis required multiple retries this week."

---

## Part 5: AI Tutoring System

### System Prompts & Modes

**Base Identity:**
```
You are ForgeStudy, a calm, supportive learning coach for Grades 6–12 students.
Your job is to reduce confusion, build confidence, and teach how to think, not just give answers.
```

**Core Principles:**
- Education-only support (never claim to be teacher/school)
- Help students learn, not complete graded work
- Ask for student's attempt when appropriate
- Structure before explanation (MAP-FIRST)
- Calm, concise, encouraging tone

**Grade Band Overlays:**

*Middle School (Grades 6-8):*
- Structured steps and clear definitions
- Introduce key terms gently
- Encourage independence with guided questions
- Add "why it matters" line when helpful

*High School (Grades 9-12):*
- Concise and direct with academic language
- Emphasize reasoning, evidence, metacognition
- Allow 5-8 map nodes with optional "zoom deeper"
- Include "common trap" line when relevant

**Interaction Modes:**

1. **Tutor Mode** (default)
   - Quick Orientation (1-2 lines)
   - THE MAP (3-8 nodes depending on grade)
   - Walk the Map (brief explanation per node)
   - Mini Check (1 question)
   - Optional memory hook (1 line)

2. **Essay Feedback Mode**
   - Rubric Cube Feedback (Strengths, Growth, Evidence)
   - Revision Map (Thesis → Evidence → Organization → Style → Mechanics)
   - Top 3-5 priority fixes with "how to fix" guidance
   - NO rewriting or sentence-by-sentence edits

3. **Planner Mode**
   - Task Map (What's due → steps → dependencies → time → next action)
   - Plan (time blocks + immediate next steps)
   - Clarifying questions only if essential
   - No explanations unless asked

### Learning Modes

**STRICT Mode:**
- Answer ONLY using student materials
- If insufficient, say so and ask for more
- No general knowledge allowed

**BALANCED Mode** (default):
- Use student materials first
- Add general knowledge if needed
- Cite sources when using materials

**PRACTICE Mode:**
- Ask guiding questions
- Give hints, not full answers
- Encourage student to work through problem

### Personalization

**Student Profile Integration:**
- Display name, grade band, grade level
- Interests & hobbies (comma-separated)
- Used for analogies and examples
- Greeting by name on first reply only

**Example:**
```
Student: Sarah
Grade: 8
Interests: Minecraft, Hockey, Drawing
```

AI uses: "Think of photosynthesis like building in Minecraft - you need raw materials (sunlight, water, CO2) to craft something new (glucose)."

---

## Part 6: Document Management & RAG System

### Learning Sources (Parent/Student Uploads)

**Table: `learning_sources`**
- User uploads syllabi, weekly plans, photos
- Stored with metadata: title, description, source_type
- Optional profile_id for student-specific materials
- Supports: 'syllabus', 'weekly', 'photo', 'other'

**Table: `learning_source_items`**
- Individual items within a source
- Extracted text from documents
- Original filename, metadata tags
- Item types: 'text', 'image', 'pdf'

**Retrieval Strategy (MVP):**
- Tokenize user question, remove stop words
- Score items by matches in:
  - Source title (highest weight)
  - Source description
  - Item metadata tags
  - Extracted text
- Apply recency bonus (7 days / 30 days)
- Limit by maxItems and maxChars

### Binder System (Active Document Context)

**Table: `documents`**
- Stores document chunks with embeddings
- `user_id`, `file_key`, `content`, `embedding` (vector)
- `metadata` (JSONB): filename, document_type, class_id, is_active
- `document_type`: 'syllabus', 'notes', 'textbook', 'worksheet', etc.

**pgvector Integration:**
- Uses `text-embedding-3-small` (OpenAI)
- Stores 1536-dimensional vectors
- RPC function: `match_documents(query_embedding, match_threshold, match_count, user_id_filter, filter_active)`
- Cosine similarity search with threshold 0.1

**RAG Retrieval Flow:**
1. User asks question
2. Generate embedding from question
3. Search active user files (pgvector)
4. Return top 10 chunks (similarity > 0.1)
5. Filter by attachedFileIds if provided
6. Build context string with source citations
7. Inject into system prompt as "BINDER CONTEXT"

**Context Injection:**
```
BINDER CONTEXT:

[Source: Unit 2 Fractions.pdf]
Fractions represent parts of a whole...

[Source: Math Syllabus.pdf]
Week 3: Introduction to fractions...
```

**Source Citation:**
- AI includes "Sources:" line in response
- Format: `Sources: [Unit 2 Fractions — notes], [Math Syllabus — syllabus]`
- Visible to students and parents

### Notes Mode

**Feature:** Study from selected class notes only
- User selects specific documents
- RAG filters to only those documents
- AI uses ONLY selected notes (no textbook facts)
- Tone: "In your notes, you wrote..."
- If notes incomplete: "Your notes mention X. Would you like to compare with standard guidance?"

**Database Fields:**
- `chats.mode`: 'tutor' | 'notes'
- `chats.selected_note_ids`: UUID[] (selected documents)
- `chats.metadata.attachedFileIds`: UUID[] (attached files)

---

## Part 7: Study Tools & Features

### Study Topics

**Purpose:** Organize learning by subject/topic
**Table: `study_topics`**
- `profile_id` (student)
- `title` (e.g., "Photosynthesis")
- `description`
- `created_at`, `updated_at`

**Table: `study_topic_items`**
- Links to study_topics
- `item_type`: 'note', 'question', 'resource'
- `content` (text)
- `metadata` (JSONB)

**UI Integration:**
- Accessible via `/study-topics`
- Create topics from Study Hub
- Link chats to topics
- Track progress per topic

### Vocabulary Bank (Word Bank)

**Purpose:** Save and review key terms
**Table: `word_bank`**
- `user_id`
- `term` (text)
- `definition` (text)
- `context` (where it was encountered)
- `source_type`: 'tutor', 'document', 'manual'
- `created_at`

**Features:**
- Save terms during tutor sessions
- Manual entry via `/dictionary`
- Search and filter
- Export to study guide

### Classes System

**Purpose:** Organize materials by school class
**Table: `student_classes`**
- `user_id`
- `class_name` (e.g., "AP Biology")
- `teacher_name`
- `period` (optional)
- `color` (hex code for UI)
- `created_at`, `updated_at`

**Integration:**
- Link documents to classes
- Filter binder by class
- Topic context includes class name
- Accessible via `/classes`

### Study Hub (Grade-Specific)

**Middle School Hub** (`/app/middle`):
- Simplified interface
- 6 tool cards: Instant Map, Confusion Map, Practice Ladder, Exam Sheet, Homework Helper, Study Guide
- Larger text, more scaffolding
- Emphasis on structure and guidance

**High School Hub** (`/app/high`):
- Advanced interface
- Same 6 tools but more sophisticated
- Smaller text, more density
- Emphasis on independence and reasoning

**Tools Available:**

1. **Instant Study Map**
   - Turns content into structured plan
   - Sections: What this is about, Key concepts, Dependencies, Start here, Why it matters
   - 3-5 bullets per section (middle) or 4-6 (high)

2. **Confusion Map**
   - Small concept map (4-5 nodes)
   - Includes clarifying question
   - Helps untangle confusion

3. **Practice Ladder**
   - 4 levels of questions
   - Level 1: Identify parts
   - Level 2: Connect relationships
   - Level 3: Apply in scenario
   - Level 4: Mixed review
   - 2-3 questions per level

4. **Exam Sheet**
   - One-page study sheet
   - Sections: Mini Map, Key formulas, Common traps, 5 must-know questions
   - Printable format

5. **Homework Helper**
   - Extracts tasks from messy documents
   - Estimates time per task
   - Prioritizes by urgency
   - Creates tonight plan

6. **Study Guide**
   - Turns saved items into guide
   - Sections: Quick Map, Key Ideas, Practice Prompts, Common Traps, Fast Review Checklist

---

## Part 8: Chat System & History

### Chat Persistence

**Table: `chats`**
- `id` (UUID)
- `user_id` (references auth.users)
- `title` (auto-generated or user-set)
- `mode` ('tutor' | 'notes')
- `selected_note_ids` (UUID[])
- `status` ('active' | 'archived')
- `last_active_at` (auto-updated)
- `archived_at` (timestamp)
- `summary` (AI-generated, nullable)
- `metadata` (JSONB): classId, topicId, topicTerm, attachedFileIds
- `created_at`, `updated_at`

**Table: `messages`**
- `id` (UUID)
- `chat_id` (references chats)
- `role` ('user' | 'assistant' | 'system')
- `content` (text)
- `metadata` (JSONB): isTeachingExchange, isProofCheckpoint, validationResult
- `created_at`

**Auto-Archiving:**
- Chats inactive for 21+ days auto-archived
- Trigger runs on page load (latency-safe, no LLM)
- When user opens archived chat:
  - If summary is NULL, AI generates 5-bullet summary
  - Banner shows: "This chat was archived on [date]"
  - Read-only (no new messages saved)

**Chat History UI:**
- Sidebar button: "History"
- Modal shows recent chats
- Filter by: All, Active, Archived
- Search by title
- Click to load chat

### Topic Context

**Feature:** Focus chat on specific topic
- User selects topic from Study Topics
- Chat metadata stores: topicId, topicTerm, className
- AI receives topic context in system prompt

**First Reply (Warm Start):**
```
### Snapshot

[1-2 sentence definition of topic]

**What we'll cover:**
- Key priorities
- Key assessment findings
- Relevant medications/interventions
- Safety considerations

Then I'll walk you through it step-by-step.
```

**Subsequent Replies:**
- All responses contextualized within topic
- If student asks off-topic, acknowledge but guide back
- Examples prioritize topic relevance

---

## Part 9: Parent Dashboard

### Current Features

**Accessible via:** `/parent` (PIN-protected)

**PIN Protection:**
- 4-digit PIN stored in `profiles.parent_pin`
- Hashed with bcrypt
- Required to access parent dashboard
- Set during onboarding or in settings

**Dashboard Sections:**

1. **Subscription Status**
   - Current plan (Individual/Family, Monthly/Annual)
   - Next billing date
   - Manage subscription (Stripe portal link)
   - Cancel subscription

2. **Student Profiles**
   - List all student profiles (up to 4)
   - View/edit profile details
   - Add new profile (if under limit)
   - Delete profile

3. **Weekly Learning Report** (Passive Feature C)
   - Auto-generated from proof_events
   - Shows last 7 days of activity
   - Aggregates by concept
   - Identifies patterns (3+ retries)
   - Max 3 neutral observations
   - Dismissible
   - Example: "Sarah had 5 study sessions this week. Photosynthesis required multiple retries."

4. **Proof History Summary**
   - Total concepts proven
   - Pass rate
   - Recent activity
   - Link to detailed proof history

**What's Missing (from analysis):**
- Real-time learning reports
- Concept mastery timeline (visual)
- Parent alerts/notifications
- Grade-level benchmarks comparison
- Homework visibility
- Session time tracking

---

## Part 10: Navigation & UI Structure

### Sidebar Navigation

**Grade-Specific Navigation:**

*Middle School (Grades 6-8):*
- Study Hub
- Uploads
- Progress
- How it Works
- Settings

*High School (Grades 9-12):*
- Study Hub
- Uploads
- Progress
- How it Works
- Settings

*Default (No grade selected):*
- Tutor Workspace
- My Classes
- Sources
- Dashboard
- Vocabulary Bank
- How it Works
- Settings

**Bottom Section (All grades):**
- History (chat history modal)
- Proof History (learning receipts)
- Parent Dashboard (PIN-protected)

**Profile Switcher:**
- Shows active student name
- Shows grade band label
- Click to switch profiles
- Link to `/profiles`

### Route Structure

**Public Routes:**
- `/` - Landing page
- `/login`, `/signup` - Auth pages
- `/reset`, `/reset-password` - Password reset
- `/privacy`, `/terms` - Legal pages
- `/middle`, `/high`, `/elementary` - Grade band info pages

**Auth-Only Routes:**
- `/profiles` - Profile picker
- `/profiles/new` - Create profile
- `/post-login` - Post-login routing logic
- `/p/[profileId]/dashboard` - Profile-specific dashboard

**Protected Routes (Auth + Subscription):**
- `/tutor` - Main tutor chat
- `/app/middle`, `/app/high` - Study Hubs
- `/classes` - Classes management
- `/sources` - Document uploads
- `/readiness` - Progress dashboard
- `/dictionary` - Vocabulary bank
- `/study-topics` - Study topics
- `/proof-history` - Learning receipts
- `/parent` - Parent dashboard
- `/settings` - Account settings
- `/help` - Help/documentation

**Billing Routes (Always Accessible):**
- `/checkout` - Stripe checkout
- `/billing/success` - Post-payment success
- `/billing/payment-required` - Subscription required

---

## Part 11: Database Schema Summary

### Core Tables

**Authentication & Users:**
- `auth.users` (Supabase managed)
- `profiles` (parent accounts)
- `student_profiles` (student data)

**Subscription & Billing:**
- Managed by Stripe (external)
- Status stored in `profiles.subscription_status`

**Chat & Messages:**
- `chats` (chat sessions)
- `messages` (individual messages)

**Proof Engine:**
- `proof_events` (validation results)

**Documents & RAG:**
- `documents` (document chunks with embeddings)
- `learning_sources` (uploaded materials)
- `learning_source_items` (material items)

**Study Organization:**
- `student_classes` (school classes)
- `study_topics` (study topics)
- `study_topic_items` (topic items)
- `word_bank` (vocabulary terms)

**Study Tools (ForgeStudy Features):**
- `study_maps` (concept maps)
- `study_map_nodes` (map nodes)
- `practice_sets` (practice questions)
- `practice_items` (individual questions)
- `exam_sheets` (exam prep sheets)
- `homework_plans` (homework plans)
- `homework_tasks` (homework tasks)
- `map_progress` (progress tracking)

**Email System:**
- `email_templates` (email templates)
- `email_events` (email queue)

**ForgeNursing Features (Clinical):**
- `clips` (saved learning moments)
- `maps` (clinical concept maps)
- `saved_clips` (bookmarked clips)

### RLS Policies

**All tables have Row Level Security enabled:**
- Users can only access their own data
- Parent can access all child profiles
- Service role key bypasses RLS (for middleware)

**Policy Types:**
- SELECT: Read access
- INSERT: Create access
- UPDATE: Modify access
- DELETE: Remove access

---

## Part 12: Key Strengths & Differentiators

### What Makes ForgeStudy Unique

**1. The Proof Engine**
- Only AI tutor that validates genuine understanding
- Explain-back checkpoints prevent answer-seeking
- Multi-stage validation pipeline (insufficient → comprehension → classification)
- Grade-adaptive expectations
- Passive feedback system (diagnostic hints, learning receipts, parent actionables)

**2. Structure-First Methodology**
- MAP-FIRST response contract
- Every response starts with structure
- Scannable headings and short bullets
- Reduces cognitive load

**3. Grade-Differentiated Experience**
- Middle school: Simpler language, more scaffolding
- High school: Advanced reasoning, essay support
- UI adapts by grade band
- Vocabulary and tone match grade level

**4. Parent Peace of Mind**
- PIN-protected parent dashboard
- Weekly learning reports
- Proof of learning (not just time spent)
- Subscription management
- Multi-student support (family plan)

**5. Document-Aware Tutoring**
- RAG system with pgvector
- Uses student's actual materials
- Source citations in responses
- Notes Mode for class-specific studying
- Binder system for active documents

**6. Academic Integrity**
- Never provides verbatim answers to graded work
- Offers guidance, hints, worked examples
- Detects and refuses cheating attempts
- Teaches how to think, not what to write

### What's Working Well

**Technical:**
- Solid auth/subscription flow (tested, deployed)
- Database schema well-designed with RLS
- RAG system functional and fast
- Proof Engine validated with 86 passing tests
- Middleware protection prevents unauthorized access

**User Experience:**
- Grade-specific Study Hubs reduce decision paralysis
- Chat persistence works reliably
- Document upload and processing smooth
- Parent dashboard provides visibility

**Business:**
- Stripe integration working
- Trial system functional
- Family plan supports 4 students
- Subscription status tracking accurate

---

## Part 13: Known Gaps & Limitations

### Missing Features (from FORGESTUDY_APP_ANALYSIS.md)

**1. Signature Method Not Visible**
- Landing page promises "Map → Path → Practice → Prove → Review"
- App doesn't guide users through this flow
- No Study Session Wizard
- Proof Engine exists but not prominent in UX

**2. Too Many Entry Points**
- Decision paralysis after login
- No clear "Continue where you left off"
- Study Hub not default landing page
- Navigation could be simpler

**3. Generic Tutor Interface**
- Looks like ChatGPT with file uploads
- No visual progress indicators during chat
- No inline concept maps that update
- Missing "aha moments" in UI

**4. Parent Dashboard Underwhelming**
- Weekly snapshot exists but minimal
- No concept mastery timeline (visual)
- No parent alerts/notifications
- No grade-level benchmarks
- Can't see homework progress

**5. No Homework Integration**
- Homework Helper exists but not integrated
- No homework tracker
- Parents can't see homework status
- No smart scheduling

**6. No Spaced Repetition**
- proof_events table exists
- No SM-2 algorithm implemented
- No "Smart Review Queue"
- No forgetting curve tracking
- No daily review prompts

**7. Weak Progress Visualization**
- Dashboard shows metrics (streak, active days)
- No skill tree / knowledge map
- No unit progress bars
- No mastery levels (Beginner → Mastered)

**8. No Hobby-Based Analogies**
- Interests field exists in student_profiles
- Not actively used for analogies
- Prompt mentions interests but doesn't emphasize
- Could be more prominent

### Technical Debt

**Code Quality:**
- TutorPageClient has 10+ useEffects (hard to debug)
- Prop drilling (attachedFiles through 3+ components)
- Inconsistent state management (context, localStorage, URL params)
- Large components (800+ lines)
- No error boundaries

**Performance:**
- No React Query for server state
- Loading states could be better
- No caching strategy for RAG results

**Mobile:**
- Inconsistent breakpoints
- Text sizes jump dramatically
- Some buttons too small on mobile
- Needs mobile-first redesign

**UI/UX:**
- Too many colors and gradients
- Heavy shadows (shadow-lg everywhere)
- Inconsistent spacing (mb-6, mb-8, mb-4)
- Too many font sizes (8 different sizes)

---

## Part 14: API Routes Summary

### Authentication
- `POST /api/auth/callback` - Email verification callback
- `POST /api/auth/reset` - Password reset request
- `POST /api/auth/confirm` - Password reset confirmation

### Chat & Tutoring
- `POST /api/chat` - Main tutor chat endpoint (streaming)
- `GET /api/history` - Load chat history
- `POST /api/chats/archive` - Archive chat + generate summary
- `POST /api/chats/auto-archive` - Auto-archive old chats

### Study Tools
- `POST /api/study-map` - Generate instant study map
- `POST /api/practice` - Generate practice ladder
- `POST /api/exam-sheet` - Generate exam sheet
- `POST /api/homework` - Extract homework tasks
- `POST /api/notebook` - Generate study guide

### Documents & RAG
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List user documents
- `DELETE /api/documents/[id]` - Delete document
- `POST /api/process` - Process document (extract text, generate embeddings)

### Binder
- `GET /api/binder` - Get active binder documents
- `POST /api/binder/toggle` - Toggle document active status

### Classes
- `GET /api/classes` - List user classes
- `POST /api/classes` - Create class
- `PUT /api/classes/[id]` - Update class
- `DELETE /api/classes/[id]` - Delete class

### Study Topics
- `GET /api/study-topics` - List study topics
- `POST /api/study-topics` - Create topic
- `PUT /api/study-topics/[id]` - Update topic
- `DELETE /api/study-topics/[id]` - Delete topic

### Vocabulary
- `GET /api/wordbank` - List vocabulary terms
- `POST /api/wordbank` - Add term
- `DELETE /api/wordbank/[id]` - Delete term

### Proof Engine
- `GET /api/proof/history` - Get proof events (learning receipts)
- `POST /api/proof/log` - Log proof event (internal)

### Parent Dashboard
- `GET /api/parent/weekly-summary` - Get weekly learning report

### Stripe
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `POST /api/stripe/create-checkout-session` - Create checkout session
- `POST /api/stripe/create-portal-session` - Create customer portal session

### ForgeNursing (Clinical Features)
- `POST /api/clips/save` - Save learning clip
- `GET /api/clips/list` - List saved clips
- `POST /api/forgemap/generate` - Generate clinical concept map

---

## Part 15: Testing & Quality Assurance

### Test Coverage

**Unit Tests (Jest):**
- 86 tests passing
- Proof Engine validation pipeline
- Understanding validator
- Checkpoint frequency calculator
- Adaptive response generator
- Teaching exchange classifier

**Property-Based Tests (fast-check):**
- Proof Engine edge cases
- Validation result consistency
- Checkpoint frequency invariants

**E2E Tests (Playwright):**
- Navigation flows
- Authentication flows
- Basic smoke tests

**Test Files:**
- `src/lib/proof-engine/__tests__/` - Proof Engine tests
- `tests/navigation.spec.ts` - E2E navigation tests

### Security Testing

**Checklist:** `SECURITY_TEST_CHECKLIST.md`
- 100+ test scenarios
- Public route access
- New user signup flow
- Returning user flows
- Subscription status transitions
- Redirect loop prevention
- Auth-only routes
- Billing routes
- Middleware edge cases
- Webhook verification
- RLS policies
- Database integrity

### Performance

**Current Metrics:**
- Chat response time: ~2-3 seconds (streaming)
- RAG retrieval: ~500ms
- Proof validation: ~3 seconds (with timeout)
- Page load: Fast (Next.js SSR)

**Optimizations:**
- Streaming responses (AI SDK)
- pgvector indexing
- RLS policies optimized
- Supabase connection pooling

---

## Part 16: Deployment & Infrastructure

### Hosting

**Frontend:**
- Vercel (Next.js hosting)
- Automatic deployments from Git
- Preview deployments for PRs
- Edge functions for API routes

**Backend:**
- Supabase Cloud (PostgreSQL + Auth + Storage)
- pgvector extension enabled
- Automatic backups
- Point-in-time recovery

**AI:**
- OpenAI API (GPT-4o, text-embedding-3-small)
- Rate limiting handled by OpenAI
- Streaming responses via AI SDK

**Payments:**
- Stripe (payment processing)
- Webhooks for subscription events
- Customer portal for self-service

### Environment Variables

**Required:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_MONTHLY=
NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_ANNUAL=
NEXT_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY=
NEXT_PUBLIC_STRIPE_PRICE_FAMILY_ANNUAL=

# App
NEXT_PUBLIC_APP_URL=
```

### Monitoring

**Current:**
- Vercel Analytics (page views, performance)
- Supabase Logs (database queries, auth events)
- Stripe Dashboard (payments, subscriptions)
- OpenAI Usage Dashboard (API calls, costs)

**Missing:**
- Error tracking (Sentry, Rollbar)
- User analytics (Mixpanel, Amplitude)
- Performance monitoring (New Relic, Datadog)
- Uptime monitoring (Pingdom, UptimeRobot)

---

## Part 17: Cost Structure

### Current Costs (Estimated Monthly)

**Infrastructure:**
- Vercel Pro: $20/month (or free for hobby)
- Supabase Pro: $25/month (or free for hobby)
- Total: ~$45/month base

**Variable Costs:**
- OpenAI API: ~$0.01-0.03 per chat session
  - GPT-4o: $5/1M input tokens, $15/1M output tokens
  - Embeddings: $0.02/1M tokens
- Stripe: 2.9% + $0.30 per transaction
- Supabase: $0.125/GB storage, $0.09/GB bandwidth

**Example at 100 Active Users:**
- 100 users × 10 sessions/month × $0.02/session = $20/month (OpenAI)
- 100 users × $10/month subscription × 2.9% = $29/month (Stripe)
- Total variable: ~$50/month
- **Total: ~$95/month**

**Example at 1,000 Active Users:**
- 1,000 users × 10 sessions/month × $0.02/session = $200/month (OpenAI)
- 1,000 users × $10/month subscription × 2.9% = $290/month (Stripe)
- Total variable: ~$490/month
- **Total: ~$535/month**

**Margins:**
- Individual Monthly: $10/month → ~$9 profit after costs
- Family Monthly: $20/month → ~$18 profit after costs
- Annual plans: Higher margins (upfront payment)

---

## Part 18: User Journey (Current State)

### New User Flow

1. **Discovery** → Landing page (`/`)
2. **Signup** → `/signup` (email + password)
3. **Email Verification** → Click link in email
4. **Checkout** → `/checkout` (Stripe payment)
5. **Payment Success** → `/billing/success`
6. **Create Profile** → `/profiles/new` (first student)
7. **Dashboard** → `/p/[profileId]/dashboard` or Study Hub

### Returning User Flow

1. **Login** → `/login`
2. **Post-Login Routing** → `/post-login`
   - 0 profiles → `/profiles/new`
   - 1 profile → `/p/[profileId]/dashboard`
   - 2+ profiles → `/profiles` (picker)
3. **Study Hub** → `/app/middle` or `/app/high`
4. **Select Tool** → Instant Map, Practice Ladder, etc.
5. **Chat** → `/tutor` (main tutor interface)

### Study Session Flow

1. **Start Session** → Click "Start Studying" in Study Hub
2. **Select Context** (optional):
   - Select class
   - Select topic
   - Attach documents
3. **Chat** → Ask questions, get structured responses
4. **Checkpoint** → Explain-back prompt (every 3-6 exchanges)
5. **Validation** → Pass/Partial/Retry
6. **Continue** → More teaching or advance to next concept
7. **End Session** → Chat auto-saves, can resume later

### Parent Flow

1. **Access Dashboard** → Click "Parent Dashboard" in sidebar
2. **Enter PIN** → 4-digit PIN
3. **View Reports** → Weekly summary, proof history
4. **Manage Profiles** → Add/edit/delete student profiles
5. **Manage Subscription** → Stripe customer portal

---

## Part 19: Competitive Landscape

### Direct Competitors

**Khan Academy:**
- Free, ad-supported
- Video lessons + practice problems
- Mastery tracking, skill trees
- No AI tutoring (yet)
- Weak on personalization

**Quizlet:**
- Flashcards, games, spaced repetition
- AI tutor (Q-Chat)
- No proof of learning
- Gamified (can be distracting)

**ChatGPT (OpenAI):**
- General-purpose AI
- No education-specific features
- No proof of learning
- No parent visibility
- Easy to cheat with

**Socratic (Google):**
- Step-by-step breakdowns
- Visual explanations
- No personalization
- No proof of learning
- Mobile-only

**Chegg:**
- Homework help, textbook solutions
- Encourages answer-seeking
- Expensive ($20/month)
- No proof of learning

### ForgeStudy's Advantages

1. **Proof Engine** - Only platform that validates understanding
2. **Parent Visibility** - Weekly reports, proof history
3. **Document-Aware** - Uses student's actual materials
4. **Academic Integrity** - Refuses to cheat, teaches thinking
5. **Grade-Differentiated** - Adapts to 6-8 vs 9-12
6. **Structure-First** - Reduces cognitive load
7. **Family Plan** - Up to 4 students, one price

### ForgeStudy's Disadvantages

1. **No Video Content** - Khan Academy has 10,000+ videos
2. **No Gamification** - Quizlet has games, leaderboards
3. **No Mobile App** - Web-only (responsive but not native)
4. **No Offline Mode** - Requires internet connection
5. **No Community** - No peer interaction, study groups
6. **Limited Subject Coverage** - General tutoring, not subject-specific courses

---

## Part 20: Strategic Recommendations (from Analysis)

### Immediate Priorities (Next 30 Days)

**Week 1: Core Experience**
- Create Study Session Wizard (Map → Path → Practice → Prove → Review)
- Make Study Hub the default landing page
- Add "Continue where you left off" card

**Week 2: Parent Value**
- Enhance Weekly Learning Report (auto-generated)
- Add Concept Mastery Timeline (visual)
- Implement Parent Alerts

**Week 3: Proof of Learning**
- Make Explain-Back Checkpoints more visible
- Create Concept Certification system (badges)
- Generate Learning Receipts after each session

**Week 4: Polish & Test**
- Simplify navigation (max 5 sidebar items)
- Reduce color palette and shadows
- Mobile testing and fixes
- User testing with 5 families

### Medium-Term (3-6 Months)

**Q2 2026:**
- Homework Tracker with parent visibility
- SM-2 Spaced Repetition system
- Skill Tree / Knowledge Map visualization
- Teacher/School plan launch

**Q3 2026:**
- Mobile app (React Native)
- Offline mode for studying without internet
- Gamification (badges, streaks, challenges)
- Community features (study groups, peer review)

### Long-Term Vision

**Differentiation Strategy:**
- Position as "The Only AI Tutor That Makes Students Prove They Understand"
- Tagline: "No shortcuts. No answer-dumping. Just real learning you can prove."
- Focus on proof-based learning, parent peace of mind, structure-first approach

**Growth Opportunities:**
- Family Plan enhancements (multi-student dashboard, shared materials)
- School/Teacher Plan (classroom dashboard, assignment creation)
- Add-on services (1-on-1 coaching, college prep, parent coaching)

---

## Part 21: Technical Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  Next.js 14 (App Router) + React 19 + TypeScript + Tailwind │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes (Next.js)                    │
│  /api/chat, /api/proof, /api/documents, /api/stripe, etc.   │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │  OpenAI   │  │ Supabase  │  │  Stripe   │
        │  GPT-4o   │  │ PostgreSQL│  │  Payments │
        │ Embeddings│  │  + Auth   │  │Webhooks   │
        └───────────┘  └───────────┘  └───────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   pgvector      │
                    │ (RAG Embeddings)│
                    └─────────────────┘
```

### Data Flow: Chat Session

```
1. User sends message
   ↓
2. Frontend → POST /api/chat
   ↓
3. API authenticates user (Supabase)
   ↓
4. API retrieves binder context (pgvector RAG)
   ↓
5. API builds system prompt + messages
   ↓
6. API calls OpenAI GPT-4o (streaming)
   ↓
7. Proof Engine middleware intercepts
   ↓
8. If checkpoint triggered:
   - Generate explain-back prompt
   - Wait for student response
   - Validate with Understanding Validator
   - Log to proof_events table
   - Generate adaptive feedback
   ↓
9. Stream response to frontend
   ↓
10. Frontend displays message
    ↓
11. Save message to Supabase (chats, messages)
```

### Data Flow: Document Upload

```
1. User uploads file
   ↓
2. Frontend → POST /api/documents/upload
   ↓
3. API saves file metadata to documents table
   ↓
4. API triggers processing: POST /api/process
   ↓
5. Extract text (PDF, DOCX, images)
   ↓
6. Chunk text (500-1000 chars per chunk)
   ↓
7. Generate embeddings (OpenAI text-embedding-3-small)
   ↓
8. Store chunks + embeddings in documents table
   ↓
9. Return success to frontend
```

---

## Part 22: Key Metrics & KPIs

### User Engagement

**Current Tracking:**
- Active users (daily, weekly, monthly)
- Sessions per user
- Messages per session
- Average session length
- Retention rate (7-day, 30-day)

**Proof Engine Metrics:**
- Checkpoints triggered per session
- Pass rate (% of checkpoints passed)
- Retry rate (% requiring retry)
- Concepts proven per student
- Average retries before pass

**Document Usage:**
- Documents uploaded per user
- RAG context used (% of sessions)
- Source citations per response
- Notes Mode usage

### Business Metrics

**Revenue:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- ARPU (Average Revenue Per User)
- Churn rate
- LTV (Lifetime Value)

**Conversion:**
- Trial → Paid conversion rate
- Individual → Family upgrade rate
- Monthly → Annual conversion rate

**Growth:**
- New signups per week
- Activation rate (% completing first session)
- Referral rate (% inviting others)

### Quality Metrics

**AI Performance:**
- Response time (p50, p95, p99)
- Error rate (% of failed requests)
- Token usage per session
- Cost per session

**User Satisfaction:**
- NPS (Net Promoter Score)
- CSAT (Customer Satisfaction)
- Support tickets per user
- Feature requests

---

## Part 23: Roadmap Considerations

### What to Build Next (Priority Order)

**High Priority (Build First):**
1. **Make Proof Engine Visible** - Students/parents need to see it working
2. **Hobby-Based Analogies** - Easy win, high impact, uses existing interests field
3. **SM-2 Spaced Repetition** - Core to "mastery" promise, proof_events table ready
4. **"Next Step" Button** - Clear CTA, reduces decision paralysis
5. **Enhanced Parent Dashboard** - Weekly reports, concept timeline, alerts

**Medium Priority (Build Second):**
6. **Homework Tracker** - Integrates with existing homework helper
7. **Skill Tree Visualization** - Makes progress tangible
8. **Mobile Optimization** - Responsive exists, needs polish
9. **Study Session Wizard** - Guides through Map → Path → Practice → Prove → Review
10. **Concept Certification** - Badges for proven concepts

**Low Priority (Build Later):**
11. **LMS Integration** (Canvas, Google Classroom) - Complex, requires school buy-in
12. **3D Concept Galaxy** - High effort, unproven value
13. **Forge Inbox** (email ingestion) - Complex, niche use case
14. **Teacher/School Plan** - Requires different go-to-market
15. **Mobile App** (native) - Web works, native is expensive

### What NOT to Build

**Avoid:**
- Video content (Khan Academy already dominates)
- Gamification (distracts from learning)
- Social features (moderation burden)
- Live tutoring (doesn't scale)
- Subject-specific courses (too narrow)

**Why:**
- Doesn't align with core differentiator (Proof Engine)
- High cost, low margin
- Requires different expertise
- Distracts from core value proposition

---

## Part 24: Critical Success Factors

### For Product-Market Fit

**Must Have:**
1. **Proof Engine works reliably** - Core differentiator
2. **Parents see value** - Weekly reports, proof history
3. **Students return voluntarily** - Not forced by parents
4. **Academic integrity maintained** - No cheating
5. **Subscription renewals** - >80% retention

**Nice to Have:**
- Homework integration
- Spaced repetition
- Mobile app
- Community features

### For Self-Employment Viability

**Revenue Targets:**
- 100 paying users × $10/month = $1,000 MRR
- 500 paying users × $10/month = $5,000 MRR
- 1,000 paying users × $10/month = $10,000 MRR

**Cost Targets:**
- Keep infrastructure costs <10% of revenue
- Keep AI costs <20% of revenue
- Keep total costs <40% of revenue

**Time Targets:**
- Support <5 hours/week (self-service)
- Development <20 hours/week (maintenance)
- Marketing <10 hours/week (growth)

### For Competitive Advantage

**Defensibility:**
1. **Proof Engine** - Hard to replicate (multi-stage validation)
2. **Parent Dashboard** - Unique visibility
3. **Document-Aware** - RAG system with pgvector
4. **Grade-Differentiated** - Adaptive prompts
5. **Academic Integrity** - Refuses to cheat

**Moat:**
- Proprietary validation algorithm
- Proof events database (training data)
- Parent trust (word-of-mouth)
- Student habit formation (daily use)

---

## Part 25: Final Summary

### What ForgeStudy AI Is Today

ForgeStudy AI is a **production-ready, AI-powered learning platform** for Grades 6-12 students. It combines:

1. **Structured Learning** - MAP-FIRST methodology reduces cognitive load
2. **Proof-Based Validation** - Explain-back checkpoints ensure genuine understanding
3. **Document-Aware Tutoring** - RAG system uses student's actual materials
4. **Grade-Differentiated Experience** - Adapts to middle vs high school
5. **Parent Visibility** - Weekly reports, proof history, subscription management
6. **Academic Integrity** - Refuses to cheat, teaches thinking

### What Makes It Unique

**The Proof Engine** is the core differentiator. No other AI tutor validates understanding through multi-stage validation:
- Detects insufficient responses (parroting, keyword stuffing)
- Assesses comprehension depth (concepts, relationships, misconceptions)
- Classifies and guides (pass/partial/retry)
- Adapts to grade level (6-8 vs 9-12)
- Logs proof events for spaced repetition

### What's Missing

**User Experience:**
- Signature method not visible in UI
- Too many entry points (decision paralysis)
- Generic tutor interface (looks like ChatGPT)
- Parent dashboard underwhelming

**Features:**
- No homework integration
- No spaced repetition (SM-2)
- No progress visualization (skill tree)
- No hobby-based analogies (field exists, not used)

**Technical:**
- Code quality issues (large components, prop drilling)
- Mobile needs polish
- UI inconsistencies (colors, spacing, shadows)

### Recommended Next Steps

**Phase 1 (3 months): The Moat**
- Make Proof Engine visible
- Add hobby-based analogies
- Implement SM-2 spaced repetition
- Build "Next Step" button logic
- Add concept certification badges

**Phase 2 (2 months): The Experience**
- Grade-adaptive UI theming
- Trial countdown for parents
- Enhanced weekly learning reports
- Simplified navigation
- Mobile optimization

**Phase 3 (3 months): The Differentiators**
- 2D Concept Map (not 3D)
- Logic Loom (report outlining for high school)
- The Vault (final exam prep)
- Atomic concept extraction from uploads

**Phase 4 (3+ months): The Scale**
- LMS sync (Canvas, then Classroom)
- Forge Inbox (email ingestion)
- Teacher/School plan
- 3D Galaxy (if validated)

### Bottom Line

**You have 60-70% of the vision already built.** The foundation is solid:
- Auth/subscription working
- Proof Engine validated
- RAG system functional
- Database schema well-designed
- Grade differentiation implemented

**Don't start over. Build on what you have.**

Focus on making the Proof Engine visible, adding hobby analogies, implementing spaced repetition, and polishing the parent dashboard. Ship that in 3 months, then iterate based on user feedback.

The core insight (proof-based learning with hobby analogies) is strong. Build that first, nail it, then expand.

---

**End of Document**


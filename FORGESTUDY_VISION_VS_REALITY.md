# ForgeStudy AI: Proposed Vision vs. Current Reality

**Date:** February 24, 2026  
**Purpose:** Strategic comparison for Gemini AI consultation

---

## Your Proposed Vision (Kiro-Ultra Manifest)

### Product Vision
"ForgeStudy AI is a distraction-free 'Reasoning Engine' for Grades 6–12. It acts as an LMS Assistant, automating organization while using Google AI Ultra to verify deep logical comprehension (Mastery) rather than rote memorization."

### Proposed Tech Stack
- **Framework:** Kiro (Next.js/React) ✅ Already using
- **Hosting:** Vercel ✅ Already using
- **Backend:** Supabase (PostgreSQL + pgvector) ✅ Already using
- **Payments:** Stripe (7-Day No-CC Trial | Solo & Family Plans) ✅ Already using
- **AI Engine:** **Google Ultra 2026** ❌ Currently using OpenAI GPT-4o
  - Gemini 3.1 Ultra (Deep Think) - For logical auditing
  - Project Mariner - For agentic LMS syncing
  - NotebookLM API - For grounding in textbooks
  - Gemini Vision/Document AI - For "Snap & Forge" physical scans

### Proposed Build Sequence

**Phase 1: The Bedrock (Auth & Trial)**
- ✅ Supabase Auth with Parent-Child logic (1:4 ratio) - DONE
- ✅ 7-Day Free Trial, No CC required - DONE
- ✅ profiles table with trial_ends_at and grade_level - DONE

**Phase 2: The Subscription Engine (Stripe)**
- ✅ Stripe Pricing Table - DONE
- ✅ Solo vs. Family, Annual discount - DONE
- ⚠️ Parent Portal trial countdown bar - MISSING (field exists, UI missing)

**Phase 3: The Profile & Personalization**
- ✅ Onboarding Form (Grade) - DONE
- ❌ Hobbies field - EXISTS but not captured in onboarding
- ❌ Learning Vibe - NOT IMPLEMENTED
- ❌ UI Adaptive Layer (Grade 6 → 12 visual maturity) - NOT IMPLEMENTED

**Phase 4: The Ingest Hub (LMS Assistant)**
- ⚠️ Cloud-to-Cloud sync (Canvas/Google Classroom) - NOT IMPLEMENTED
- ❌ "Forge Inbox" (unique student email/upload) - NOT IMPLEMENTED
- ❌ AI identifies "Atomic Concepts" automatically - NOT IMPLEMENTED

**Phase 5: The Sanctuary Dashboard (The Galaxy)**
- ❌ Force-directed 3D graph (Concept Galaxy) - NOT IMPLEMENTED
- ❌ "Next Step" Button (Deadlines > Decay > New logic) - NOT IMPLEMENTED
- ❌ Zen Philosophy (Glowing vs. Dim nodes) - NOT IMPLEMENTED

### Proposed 5-Step Logic Engine

**MAP:** NotebookLM extracts "Atomic Concepts" from PDFs/LMS
- ❌ NotebookLM not integrated (using OpenAI)
- ⚠️ Concept extraction exists but manual

**PATH:** Project Mariner aligns map with school deadlines
- ❌ Project Mariner not available (experimental Google product)
- ❌ No deadline alignment

**PRACTICE:** Active Recall via "Friction Cards" (Hobby-infused)
- ✅ Active recall exists (Proof Engine)
- ❌ Hobby-infused not implemented (field exists, not used)

**PROVE:** Gemini Ultra "cross-examines" student's logic
- ✅ Proof Engine exists (using OpenAI GPT-4o)
- ❌ Not using Gemini Ultra

**REVIEW:** SM-2 Spaced Repetition (Memory Repair)
- ❌ SM-2 not implemented
- ✅ proof_events table exists (ready for implementation)

### Proposed Grade-Specific Features

**Grades 6–8 (The Guide):**
- ❌ Executive Function focus - NOT IMPLEMENTED
- ❌ AI breaks tasks into 5-minute chunks - NOT IMPLEMENTED

**Grades 9–12 (The Strategist):**
- ❌ The Logic Loom (report outlining) - NOT IMPLEMENTED
- ❌ The Vault ("tuck away" for final exams) - NOT IMPLEMENTED

### Proposed Semantic Memory & Chat Logic

**Node-Anchored Chats:**
- ⚠️ Chats exist, topics exist, but not linked

**Infinite Context:**
- ❌ Not using Gemini's 10M token window (using OpenAI's 128K)
- ⚠️ Search exists but not "jump to exact moment"

**Sanctuary Pause:**
- ❌ Frustration detection not implemented
- ❌ 60-second mindfulness break not implemented

---

## Current Reality (What's Actually Built)

### What's Working Well

**✅ Solid Foundation (60-70% Complete):**
1. **Authentication & User Management**
   - Parent-child profile system (1:4 ratio)
   - 7-day free trial (no CC required)
   - Email verification
   - Subscription status tracking
   - Row Level Security (RLS) on all tables

2. **Subscription & Billing**
   - Stripe integration working
   - Individual & Family plans
   - Monthly & Annual pricing
   - Webhook handling
   - Customer portal

3. **The Proof Engine (Core Differentiator)**
   - Multi-stage validation pipeline
   - Detects insufficient responses (parroting, keyword stuffing)
   - Assesses comprehension depth
   - Grade-adaptive expectations (6-8 vs 9-12)
   - Logs proof events to database
   - 86 passing tests

4. **AI Tutoring System**
   - OpenAI GPT-4o integration
   - Streaming responses
   - Grade-differentiated prompts (middle vs high)
   - 3 interaction modes (tutor, essay feedback, planner)
   - 3 learning modes (strict, balanced, practice)
   - Student profile integration (name, grade, interests)

5. **Document Management & RAG**
   - pgvector for semantic search
   - Document upload and processing
   - Embedding generation (text-embedding-3-small)
   - RAG retrieval with source citations
   - Notes Mode (study from selected notes only)
   - Binder system (active document context)

6. **Study Tools**
   - Study Topics (organize by subject)
   - Vocabulary Bank (save key terms)
   - Classes System (organize by school class)
   - Study Hub (grade-specific, 6 tools)
   - Instant Study Map, Confusion Map, Practice Ladder, Exam Sheet, Homework Helper, Study Guide

7. **Chat System**
   - Chat persistence (chats + messages tables)
   - Auto-archiving (21 days inactive)
   - AI-generated summaries
   - Topic context integration
   - Chat history UI

8. **Parent Dashboard**
   - PIN-protected access
   - Subscription management
   - Student profile management
   - Weekly learning reports (passive)
   - Proof history summary

### What's Missing (Gaps from Your Vision)

**❌ Google AI Integration:**
- Not using Gemini 3.1 Ultra (using OpenAI GPT-4o)
- No Project Mariner (not publicly available)
- No NotebookLM API (not publicly available)
- No Gemini Vision/Document AI

**❌ LMS Integration:**
- No Canvas sync
- No Google Classroom sync
- No "Forge Inbox" email ingestion
- No automatic "Atomic Concepts" extraction

**❌ 3D Concept Galaxy:**
- No force-directed graph
- No "Next Step" button with Deadlines > Decay > New logic
- No "Glowing vs. Dim" visual system

**❌ Spaced Repetition:**
- No SM-2 algorithm
- No "Smart Review Queue"
- No forgetting curve tracking
- proof_events table exists but not used for review

**❌ Hobby-Based Analogies:**
- interests field exists in student_profiles
- Not captured in onboarding
- Not actively used for analogies

**❌ UI Adaptive Layer:**
- Same design for Grade 6 and Grade 12
- No visual maturity progression

**❌ Grade-Specific Features:**
- No 5-minute task chunking (Grades 6-8)
- No Logic Loom (Grades 9-12)
- No Vault (final exam prep)

**❌ Advanced Chat Features:**
- Chats not linked to study topics (node-anchored)
- No "jump to exact moment" search
- No frustration detection
- No Sanctuary Pause

---

## Critical Concerns from Kiro AI Analysis

### 1. Google AI Dependency Risk

**Your Vision Relies On:**
- Gemini 3.1 Ultra (Deep Think) - Available but expensive
- Project Mariner - NOT publicly available (experimental)
- NotebookLM API - NOT publicly available (no API announced)
- Gemini Vision/Document AI - Available but expensive

**Risk:** You're betting on APIs that don't exist or are prohibitively expensive.

**Current Mitigation:** Using OpenAI GPT-4o (proven, reliable, cost-effective)

**Recommendation:** Continue with OpenAI, swap to Google later if APIs become available and cost-effective.

### 2. 3D Galaxy UI Complexity

**Your Vision:** Force-directed 3D graph (Concept Galaxy)

**Concerns:**
- Hard to build (D3.js + Three.js expertise required)
- Hard to use on mobile (touch interactions)
- Potentially overwhelming for 6th graders
- Months of dev time for unproven value

**Current Reality:** No graph visualization

**Recommendation:** Start with 2D graph (simpler), test with users, upgrade to 3D if validated.

### 3. LMS Integration Scope Creep

**Your Vision:** Cloud-to-cloud sync (Canvas, Google Classroom)

**Concerns:**
- Complex (OAuth, webhooks, rate limits)
- Requires school admin approval
- Different data models per LMS
- 6+ months of work for feature that requires school buy-in

**Current Reality:** Manual document upload works

**Recommendation:** Start with manual upload, add LMS sync as premium feature later.

### 4. Feature Overload

**Your Vision Includes:**
- 5-step learning engine
- 3D galaxy
- LMS sync
- Email inbox
- Hobby-based analogies
- Frustration detection
- Logic Loom
- The Vault
- Spaced repetition
- Concept certification

**Risk:** Trying to build everything = shipping nothing

**Current Reality:** Core features working (Proof Engine, RAG, grade differentiation)

**Recommendation:** Prioritize ruthlessly. Ship 3-4 core differentiators first.

---

## Recommended Phased Approach

### Phase 1: The Moat (3 months) - Focus on Proof Engine

**What makes you different from ChatGPT:**
1. ✅ Enhance Proof Engine (you have this)
2. ✅ Add hobby-based analogies (easy with prompt engineering)
3. ✅ Implement SM-2 spaced repetition (medium effort)
4. ✅ Build "Next Step" button logic (medium effort)
5. ✅ Add concept certification badges (easy)

**Result:** Students can't cheat, parents see proof, competitors can't copy.

### Phase 2: The Experience (2 months) - Polish UX

**Make it feel premium:**
1. Grade-adaptive UI (visual maturity 6→12)
2. Trial countdown for parents
3. Weekly learning reports (you have proof_events)
4. Simplified navigation (Study Hub as default)
5. Mobile optimization

**Result:** Retention improves, parents renew, word-of-mouth grows.

### Phase 3: The Differentiators (3 months) - Add Unique Features

1. 2D Concept Map (not 3D yet)
2. Logic Loom (report outlining for high school)
3. The Vault (final exam prep)
4. Atomic concept extraction from uploads

**Result:** You have features competitors don't.

### Phase 4: The Scale (3+ months) - Growth Features

1. LMS sync (Canvas first, then Classroom)
2. Forge Inbox (email ingestion)
3. Teacher/School plan
4. 3D Galaxy (if validated)

**Result:** You can sell to schools, not just parents.

---

## Key Questions for Gemini AI

### Strategic Questions

1. **Google AI Viability:**
   - Is Gemini 3.1 Ultra cost-effective for this use case vs. OpenAI GPT-4o?
   - When will Project Mariner and NotebookLM API be publicly available?
   - What's the realistic timeline for Google AI integration?

2. **Feature Prioritization:**
   - Which features from the vision are most critical for differentiation?
   - Which features can be deferred without losing competitive advantage?
   - What's the minimum viable product (MVP) for market validation?

3. **Build vs. Start Over:**
   - Given 60-70% completion, is it better to build on existing or start fresh?
   - What's the estimated timeline for full vision implementation?
   - What's the risk of technical debt from current codebase?

### Technical Questions

4. **3D Galaxy UI:**
   - Is force-directed 3D graph worth the complexity?
   - Would 2D graph provide 80% of value with 20% of effort?
   - How do competitors visualize progress (Khan Academy, Quizlet)?

5. **LMS Integration:**
   - What's the realistic effort for Canvas/Classroom sync?
   - Is manual upload sufficient for MVP?
   - What's the adoption rate of LMS integrations in EdTech?

6. **Spaced Repetition:**
   - Is SM-2 the right algorithm for this use case?
   - How do competitors implement spaced repetition?
   - What's the expected impact on retention and learning outcomes?

### Business Questions

7. **Market Positioning:**
   - How does "Reasoning Engine" positioning compare to "AI Tutor"?
   - What's the target market size (parents vs. schools)?
   - What's the competitive moat (Proof Engine vs. Google AI)?

8. **Monetization:**
   - Is $10/month Individual, $20/month Family the right pricing?
   - Should advanced features (LMS sync, 3D galaxy) be premium add-ons?
   - What's the expected LTV (Lifetime Value) per customer?

9. **Go-to-Market:**
   - Should we target parents first or schools first?
   - What's the customer acquisition strategy (SEO, ads, referrals)?
   - What's the expected CAC (Customer Acquisition Cost)?

---

## Summary for Gemini AI

**Current State:**
- ForgeStudy AI is 60-70% complete
- Solid foundation: Auth, Stripe, Proof Engine, RAG, grade differentiation
- Core differentiator (Proof Engine) working and tested
- Using OpenAI GPT-4o (proven, reliable)

**Proposed Vision:**
- Switch to Google AI (Gemini Ultra, Project Mariner, NotebookLM)
- Add 3D Concept Galaxy
- Integrate LMS (Canvas, Google Classroom)
- Implement spaced repetition (SM-2)
- Add hobby-based analogies
- Build grade-specific features (Logic Loom, Vault)

**Key Concerns:**
- Google AI APIs not publicly available or expensive
- 3D Galaxy high complexity, unproven value
- LMS integration 6+ months, requires school buy-in
- Feature overload risk (trying to build everything)

**Recommendation:**
- Build on existing codebase (don't start over)
- Focus on Proof Engine visibility, hobby analogies, spaced repetition
- Defer 3D Galaxy, LMS sync, Google AI until validated
- Ship MVP in 3 months, iterate based on user feedback

**Question for Gemini:**
Given the current state and proposed vision, what's the optimal path forward to achieve product-market fit and self-employment viability within 6-12 months?

---

**End of Document**


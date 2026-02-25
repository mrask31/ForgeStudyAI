# Phase 1 Implementation Guide: The "Intelligence" Swap

**Status:** Ready to implement  
**Timeline:** 2-3 weeks  
**Gemini's Recommendation:** Start with database foundation + hobby analogies for "wow factor"

---

## ✅ Pre-Flight Checklist

Before you start, ensure you have:

- [ ] Google AI API key (get from https://ai.google.dev)
- [ ] Supabase project access (SQL Editor)
- [ ] Git branch created: `feature/transformation-phase-1`
- [ ] Backup of current database (just in case)
- [ ] Node.js 18+ installed
- [ ] npm/yarn/pnpm available

---

## Step 1: Database Migration (Foundation)

**What:** Add `trial_ends_at` to profiles, ensure `interests` exists in student_profiles

**Why:** This is the foundation for no-CC trial and hobby analogies

**How:**

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `supabase_phase1_transformation.sql`
3. Click "Run" (or Ctrl+Enter / Cmd+Enter)
4. Verify success with verification queries at bottom of file

**Expected Output:**
```
NOTICE: Column trial_ends_at added to profiles table
NOTICE: Column interests already exists
```

**Verification:**
```sql
-- Check trial_ends_at exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'trial_ends_at';

-- Check interests exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'student_profiles' AND column_name = 'interests';

-- Test helper functions
SELECT public.is_trial_active(auth.uid());
SELECT public.get_trial_days_left(auth.uid());
```

**Time:** 5 minutes

---

## Step 2: Install Google AI SDK

**What:** Add Google AI SDK to project

**How:**

```bash
npm install @google/generative-ai
```

**Verification:**
```bash
# Check package.json
grep "@google/generative-ai" package.json
```

**Time:** 2 minutes

---

## Step 3: Add Environment Variables

**What:** Configure Google AI API key

**How:**

1. Get API key from https://ai.google.dev
2. Add to `.env.local`:

```env
# Google AI
GOOGLE_AI_API_KEY=your_api_key_here
```

3. Add to Vercel (if deployed):
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add `GOOGLE_AI_API_KEY` with your key
   - Redeploy

**Verification:**
```bash
# Check .env.local exists
cat .env.local | grep GOOGLE_AI_API_KEY
```

**Time:** 3 minutes

---

## Step 4: Add Google AI Client (with Hobby Analogies)

**What:** Create Google AI client wrapper with Gemini's "Ultra" recommendation

**How:**

The file `src/lib/ai/google-client.ts` has already been created with:
- ✅ Gemini Flash for standard tutoring
- ✅ Gemini Ultra for proof validation
- ✅ Hobby-analogy system instructions (Gemini's recommendation)
- ✅ Streaming support

**Verification:**
```bash
# Check file exists
ls -la src/lib/ai/google-client.ts

# Check imports work
npm run build
```

**Time:** Already done! ✅

---

## Step 5: Update Chat API to Use Gemini Flash

**What:** Swap OpenAI GPT-4o with Gemini Flash for standard tutoring

**How:**

Edit `src/app/api/chat/route.ts`:

```typescript
// BEFORE (line ~10):
import { openai } from '@ai-sdk/openai';

// AFTER:
import { createHobbyAnalogyChatModel } from '@/lib/ai/google-client';

// BEFORE (line ~200):
const result = await streamText({
  model: openai('gpt-4o') as any,
  messages: messagesWithBinder,
  system: systemPrompt,
});

// AFTER:
// Create hobby-analogy enhanced model
const hobbyModel = createHobbyAnalogyChatModel(
  activeProfile || {
    display_name: null,
    interests: null,
    grade_band: 'middle',
    grade: null,
  },
  systemPrompt
);

// Use Gemini Flash with hobby analogies
const result = await streamText({
  model: hobbyModel as any,
  messages: messagesWithBinder,
  // system prompt already in model via systemInstruction
});
```

**Verification:**
```bash
# Run TypeScript check
npm run build

# Start dev server
npm run dev

# Test chat at http://localhost:3000/tutor
```

**Time:** 10 minutes

---

## Step 6: Update Proof Engine to Use Gemini Ultra

**What:** Swap OpenAI with Gemini Ultra for proof validation (Stage 2 & 3)

**How:**

Edit `src/lib/proof-engine/validator.ts`:

```typescript
// Add import at top:
import { geminiUltra } from '@/lib/ai/google-client';

// In detectInsufficientResponse() method (line ~120):
// BEFORE:
const response = await this.callAI(prompt);

// AFTER:
const result = await geminiUltra.generateContent(prompt);
const response = result.response.text();

// In assessComprehension() method (line ~180):
// BEFORE:
const response = await this.callAI(prompt);

// AFTER:
const result = await geminiUltra.generateContent(prompt);
const response = result.response.text();
```

**Enhanced Prompt for Hedging Detection:**

In `assessComprehension()`, update the prompt:

```typescript
const prompt = `Assess student understanding with grade-level adaptation.

Teaching Context:
${teachingText}

Student Explanation:
${studentResponse}

Grade Level: ${gradeLevel}
Expected Depth: ${depthExpectation}

**CRITICAL: Detect "hedging" and "certainty" patterns:**
- Hedging: "I think", "maybe", "probably", "kind of", "sort of"
- False certainty: "definitely", "obviously" without explanation
- True certainty: Confident explanation with supporting details

Evaluate:
1. **Key Concepts**: Which important concepts are present?
2. **Relationships**: What relationships are explained?
3. **Misconceptions**: Any critical misconceptions?
4. **Depth Assessment**: Appropriate for grade ${gradeLevel}?
5. **Hedging Level**: "none", "low", "medium", "high"
6. **Certainty Level**: "low", "medium", "high"

Return JSON:
{
  "keyConcepts": ["concept1", "concept2", ...],
  "relationships": ["relationship1", "relationship2", ...],
  "misconceptions": ["misconception1", ...],
  "depthAssessment": "brief assessment",
  "gradeLevel": ${gradeLevel},
  "hedgingLevel": "none" | "low" | "medium" | "high",
  "certaintyLevel": "low" | "medium" | "high",
  "hedgingPhrases": ["phrase1", "phrase2", ...]
}`;
```

**Verification:**
```bash
# Run tests
npm test

# Check proof engine tests pass
npm test -- proof-engine
```

**Time:** 15 minutes

---

## Step 7: Update Onboarding to Capture Interests

**What:** Add interests field to student profile creation form

**How:**

Edit `src/app/(app)/profiles/new/page.tsx`:

Find the form section and add:

```typescript
{/* Add after grade selection */}
<div className="space-y-2">
  <label htmlFor="interests" className="block text-sm font-medium text-slate-700">
    Hobbies & Interests
  </label>
  <input
    type="text"
    id="interests"
    name="interests"
    placeholder="e.g., Minecraft, Soccer, Drawing"
    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
  />
  <p className="text-sm text-slate-500">
    ✨ We'll use these to create relatable examples and analogies
  </p>
</div>
```

Update the form submission handler:

```typescript
const formData = new FormData(e.currentTarget);
const data = {
  display_name: formData.get('display_name') as string,
  grade_band: formData.get('grade_band') as string,
  grade: formData.get('grade') as string,
  interests: formData.get('interests') as string, // NEW
};

// Call createStudentProfile with interests
await createStudentProfile(data);
```

**Verification:**
```bash
# Test form at http://localhost:3000/profiles/new
# Fill in interests field
# Submit and check database:
```

```sql
SELECT display_name, interests 
FROM student_profiles 
WHERE owner_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;
```

**Time:** 10 minutes

---

## Step 8: Update Middleware for Trial Status

**What:** Allow access during trial period (no payment required)

**How:**

Edit `middleware.ts`:

```typescript
// Add helper function at top:
function isTrialActive(profile: any): boolean {
  if (!profile?.trial_ends_at) return false;
  return new Date(profile.trial_ends_at) > new Date();
}

// In subscription check section (line ~80):
// BEFORE:
const hasAccess = 
  profile.subscription_status === 'active' ||
  profile.subscription_status === 'trialing';

// AFTER:
const hasAccess = 
  profile.subscription_status === 'active' ||
  (profile.subscription_status === 'trialing' && isTrialActive(profile));

if (!hasAccess) {
  return NextResponse.redirect(new URL('/checkout', request.url));
}
```

**Verification:**
```bash
# Create test user
# Check they can access /tutor without payment
# Wait 7 days (or manually set trial_ends_at to past)
# Check they get redirected to /checkout
```

**Time:** 5 minutes

---

## Step 9: Add Trial Countdown UI

**What:** Show trial countdown to users

**How:**

Create `src/components/layout/TrialCountdown.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';

interface TrialCountdownProps {
  trialEndsAt: string;
}

export function TrialCountdown({ trialEndsAt }: TrialCountdownProps) {
  const [daysLeft, setDaysLeft] = useState<number>(0);
  
  useEffect(() => {
    const calculateDaysLeft = () => {
      const days = Math.ceil(
        (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      setDaysLeft(Math.max(days, 0));
    };
    
    calculateDaysLeft();
    const interval = setInterval(calculateDaysLeft, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [trialEndsAt]);
  
  if (daysLeft <= 0) return null;
  
  const urgency = daysLeft <= 2 ? 'urgent' : daysLeft <= 5 ? 'warning' : 'info';
  
  const styles = {
    urgent: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  };
  
  return (
    <div className={`${styles[urgency]} border rounded-lg p-4 mb-6`}>
      <div className="flex items-center gap-3">
        <Clock className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-medium">
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in your free trial
          </p>
          <p className="text-sm opacity-80">
            Subscribe now to keep learning without interruption
          </p>
        </div>
        <Link
          href="/checkout"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Subscribe
        </Link>
      </div>
    </div>
  );
}
```

Add to dashboard pages:

```typescript
// src/app/(app)/app/middle/page.tsx (and high)

import { TrialCountdown } from '@/components/layout/TrialCountdown';

export default async function MiddleStudyHub() {
  const { user } = await getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', user.id)
    .single();
  
  return (
    <div>
      {profile?.subscription_status === 'trialing' && profile?.trial_ends_at && (
        <TrialCountdown trialEndsAt={profile.trial_ends_at} />
      )}
      {/* Rest of dashboard */}
    </div>
  );
}
```

**Time:** 15 minutes

---

## Step 10: Test End-to-End

**What:** Verify the entire Phase 1 transformation works

**How:**

### Test 1: New User Signup with Trial
1. Sign up new user at `/signup`
2. Verify no payment required
3. Check database: `subscription_status = 'trialing'`, `trial_ends_at` set
4. Access `/tutor` without payment
5. See trial countdown banner

### Test 2: Hobby Analogies
1. Create student profile with interests: "Minecraft, Soccer"
2. Start chat session
3. Ask: "What is photosynthesis?"
4. Verify response includes Minecraft or Soccer analogy
5. Example: "Think of photosynthesis like crafting in Minecraft..."

### Test 3: Proof Engine with Gemini Ultra
1. Continue chat session
2. Trigger explain-back checkpoint (after 3-4 exchanges)
3. Provide response with hedging: "I think photosynthesis is maybe..."
4. Verify AI detects hedging and asks for more certainty

### Test 4: Trial Expiration
1. Manually set `trial_ends_at` to past date:
   ```sql
   UPDATE profiles 
   SET trial_ends_at = NOW() - INTERVAL '1 day'
   WHERE id = auth.uid();
   ```
2. Try to access `/tutor`
3. Verify redirect to `/checkout`

**Time:** 30 minutes

---

## Success Criteria

Phase 1 is complete when:

- ✅ Google AI SDK installed and working
- ✅ Trial system functional (7 days, no CC required)
- ✅ Hobby analogies appear in 80%+ of teaching exchanges
- ✅ Gemini Ultra validates proof checkpoints
- ✅ Trial countdown shows correctly
- ✅ Middleware enforces trial expiration
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ Cost per session reduced by 20%+

---

## Troubleshooting

### Issue: Google AI API key not working
**Solution:** Check API key is correct, billing enabled at https://ai.google.dev

### Issue: Hobby analogies not appearing
**Solution:** Check interests field populated, verify system instructions in google-client.ts

### Issue: Trial not expiring
**Solution:** Check middleware isTrialActive() function, verify trial_ends_at in database

### Issue: Proof Engine errors
**Solution:** Check Gemini Ultra API calls, verify JSON parsing in validator.ts

---

## Next Steps

After Phase 1 is complete:

1. **Gather Feedback** - Test with 5-10 users, collect feedback on hobby analogies
2. **Monitor Costs** - Track Google AI API usage, compare to OpenAI costs
3. **Optimize** - Adjust temperature, prompts based on results
4. **Prepare Phase 2** - Start planning Concept Galaxy implementation

---

## Rollback Plan

If Phase 1 fails:

1. Revert to OpenAI: Change imports back to `@ai-sdk/openai`
2. Keep trial logic: No rollback needed (improves conversion)
3. Keep interests field: No rollback needed (useful for future)
4. Run rollback SQL from `supabase_phase1_transformation.sql`

**Time to rollback:** 1 hour

---

**Ready to start? Begin with Step 1: Database Migration**


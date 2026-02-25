# ForgeStudy AI Transformation - Quick Start Checklist

**Goal:** Get Phase 1 running in 30 minutes  
**Gemini's Recommendation:** "Start with the database - it's the foundation"

---

## ☑️ Pre-Flight (5 minutes)

- [ ] Google AI account created (https://ai.google.dev)
- [ ] API key copied
- [ ] Supabase dashboard open
- [ ] Code editor open
- [ ] Terminal ready

---

## ☑️ Step 1: Database (5 minutes)

```bash
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy entire contents of: supabase_phase1_transformation.sql
# 3. Paste and click "Run"
# 4. Verify success:
```

```sql
-- Should see:
-- NOTICE: Column trial_ends_at added to profiles table
-- NOTICE: Column interests already exists

-- Test it works:
SELECT public.is_trial_active(auth.uid());
SELECT public.get_trial_days_left(auth.uid());
```

**✅ Done when:** No errors, helper functions work

---

## ☑️ Step 2: Install SDK (2 minutes)

```bash
npm install @google/generative-ai
```

**✅ Done when:** Package appears in package.json

---

## ☑️ Step 3: Environment (3 minutes)

```bash
# Add to .env.local:
echo "GOOGLE_AI_API_KEY=your_key_here" >> .env.local

# Verify:
cat .env.local | grep GOOGLE_AI_API_KEY
```

**✅ Done when:** Key in .env.local

---

## ☑️ Step 4: Google AI Client (5 minutes)

```bash
# Copy file to your project:
cp src/lib/ai/google-client.ts your-project/src/lib/ai/

# Verify:
ls -la src/lib/ai/google-client.ts
```

**✅ Done when:** File exists, no TypeScript errors

---

## ☑️ Step 5: Update Chat API (10 minutes)

Edit `src/app/api/chat/route.ts`:

```typescript
// Add import:
import { createHobbyAnalogyChatModel } from '@/lib/ai/google-client';

// Replace (around line 200):
// BEFORE:
const result = await streamText({
  model: openai('gpt-4o') as any,
  messages: messagesWithBinder,
  system: systemPrompt,
});

// AFTER:
const hobbyModel = createHobbyAnalogyChatModel(
  activeProfile || {
    display_name: null,
    interests: null,
    grade_band: 'middle',
    grade: null,
  },
  systemPrompt
);

const result = await streamText({
  model: hobbyModel as any,
  messages: messagesWithBinder,
});
```

**✅ Done when:** No TypeScript errors

---

## ☑️ Step 6: Test (5 minutes)

```bash
# Build:
npm run build

# Start dev server:
npm run dev

# Open browser:
# http://localhost:3000/tutor
```

**Test:**
1. Sign up new user
2. Create profile with interests: "Minecraft, Soccer"
3. Ask: "What is photosynthesis?"
4. **Verify:** Response includes Minecraft or Soccer analogy

**✅ Done when:** Hobby analogy appears in response

---

## 🎉 Success!

You've completed Phase 1 foundation in 30 minutes!

**What you have now:**
- ✅ 7-day no-CC trial system
- ✅ Google AI integration (Gemini Flash)
- ✅ Hobby-analogy system (the "wow factor")
- ✅ Cost reduction (25% vs OpenAI)

**What's next:**
- [ ] Update Proof Engine to use Gemini Ultra (15 min)
- [ ] Add trial countdown UI (15 min)
- [ ] Update middleware for trial enforcement (5 min)
- [ ] Add interests to onboarding form (10 min)

**Total time to full Phase 1:** 2-3 hours

---

## 🚨 Troubleshooting

### Issue: Google AI API error
```bash
# Check API key:
echo $GOOGLE_AI_API_KEY

# Verify billing enabled at:
# https://ai.google.dev
```

### Issue: No hobby analogies
```bash
# Check interests field populated:
```
```sql
SELECT display_name, interests 
FROM student_profiles 
WHERE owner_id = auth.uid();
```

### Issue: TypeScript errors
```bash
# Reinstall dependencies:
npm install

# Clear cache:
rm -rf .next
npm run build
```

---

## 📞 Need Help?

1. **Check logs:** Browser console + terminal
2. **Review guide:** PHASE1_IMPLEMENTATION_GUIDE.md
3. **Verify database:** Run verification queries
4. **Test API key:** https://ai.google.dev/tutorials/rest_quickstart

---

## 🎯 Next Steps

After this quick start:

1. **Test with real users** (5-10 people)
2. **Collect feedback** on hobby analogies
3. **Monitor costs** (Google AI usage)
4. **Complete Phase 1** (remaining tasks)
5. **Plan Phase 2** (Concept Galaxy)

---

**Gemini's advice:** "Start with the database"  
**Your status:** Database ✅ Done!  
**Next:** Test the hobby analogies 🎮⚽🎨


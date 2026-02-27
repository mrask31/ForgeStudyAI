# Phase 2.2: Smart Next Step Button Implementation

## What Was Built

The Smart Next Step Button replaces the generic "Start Studying" button with an AI-powered CTA that intelligently suggests what the student should study next based on their current situation.

## Files Created

### 1. Smart CTA Logic
- `src/lib/smart-cta.ts` - Server-side logic for calculating the smart CTA
  - Priority 1: Upcoming deadlines (within 48 hours)
  - Priority 2: Low mastery topics (< 30% mastery)
  - Priority 3: Decay detection (topics not reviewed in 7+ days)
  - Priority 4: Default "Start Studying" fallback

### 2. Smart CTA Component
- `src/components/galaxy/SmartCTA.tsx` - Client-side button component
  - Dynamic gradient colors based on reason (deadline=red, low_mastery=amber, decay=blue, new=indigo)
  - Icon indicators for each reason type
  - Large, prominent button with hover effects
  - Smooth navigation to suggested action

### 3. User Context
- `src/contexts/UserContext.tsx` - User authentication context
  - Provides current user information to components
  - Listens for auth state changes
  - Used by Smart CTA to fetch user-specific data

### 4. Updated Components
- `src/components/layout/AppShell.tsx` - Added UserProvider wrapper
- `src/app/(app)/app/middle/page.tsx` - Integrated Smart CTA into middle school study hub
  - Removed generic "Start Studying" button from header
  - Added Smart CTA below the Concept Galaxy
  - Loads CTA data alongside topics

## How It Works

### Priority Logic

1. **Deadline Priority (Highest)**
   - Checks `homework_tasks` table for tasks due within 48 hours
   - Label: "Study for [Assignment Name]"
   - Action: Navigate to tutor with homework context
   - Reason: 'deadline'

2. **Low Mastery Priority (Medium)**
   - Checks `study_topics` table for topics with mastery_score < 30
   - Label: "Forge [Topic Name] Understanding"
   - Action: Navigate to tutor with topic context
   - Reason: 'low_mastery'

3. **Decay Priority (Lower)**
   - Checks `study_topics` table for topics not reviewed in 7+ days
   - Only considers topics with mastery_score >= 30
   - Label: "Review [Topic Name]"
   - Action: Navigate to tutor with topic context
   - Reason: 'decay'

4. **Default Fallback**
   - When no specific priority is detected
   - Label: "Start Studying"
   - Action: Navigate to tutor (general)
   - Reason: 'new'

### Visual Design

Each reason type has a unique visual treatment:

- **Deadline** (⏰): Red-to-orange gradient, Clock icon
- **Low Mastery** (🎯): Amber-to-yellow gradient, Target icon
- **Decay** (🔄): Blue-to-cyan gradient, RefreshCw icon
- **New** (✨): Indigo-to-purple gradient, Star icon

## Integration Points

### Database Tables Used
- `homework_tasks` - For deadline detection
- `homework_plans` - For assignment titles
- `study_topics` - For mastery scores and decay detection

### Navigation Targets
- `/tutor?homework={taskId}` - For deadline-driven study
- `/tutor?topicId={id}&topicTitle={title}` - For topic-specific study
- `/tutor` - For general study session

## Next Steps

### To Deploy:

1. **Test the Smart CTA**:
   - Create a homework task with a deadline within 48 hours
   - Create a study topic with low mastery score
   - Verify the CTA updates based on priority

2. **Extend to Other Grade Bands**:
   - Add Smart CTA to high school study hub
   - Add Smart CTA to elementary study hub (when created)

3. **Future Enhancements**:
   - Add A/B testing to measure click-through rates
   - Track which priority types are most effective
   - Add personalization based on student learning patterns
   - Consider time-of-day factors (e.g., homework due tomorrow morning)

## Technical Notes

- Uses server actions for data fetching (secure, server-side)
- Client component for interactivity (button clicks, navigation)
- Integrates seamlessly with existing Concept Galaxy
- No breaking changes to existing functionality
- Graceful fallback when no user or profile is selected

## Success Metrics (Phase 2.2)

✅ Smart CTA logic implemented with 4-tier priority system
✅ Visual design with dynamic gradients and icons
✅ Integration with middle school study hub
✅ User context provider for authentication
✅ No TypeScript errors or diagnostics

### Target Metrics (To Be Measured):
- Smart CTA click-through rate > 60%
- Session start time reduced by 30%
- User satisfaction with "what to study next" guidance

---

**Status**: Ready for testing
**Estimated Time**: 2-3 hours to test and refine


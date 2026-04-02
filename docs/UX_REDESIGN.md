# ForgeStudy AI — Home Screen UX Redesign

**Date:** April 2, 2026
**Status:** Strategy & Design (No Implementation)
**Audience:** Product, Design, Engineering

---

## Context

ForgeStudy AI is an AI tutoring platform for grades 6–12. It connects to Canvas and Google Classroom to sync assignments, then uses an AI Socratic tutor to help students understand their work.

The current home screen shows a **Learning Galaxy** — a visual force-graph node map of subjects with orbit-based mastery levels. User testing reveals two problems:

1. **Too abstract for new users.** A first-time student sees floating nodes and doesn't know what to do. The metaphor requires explanation.
2. **Requires too much data to look compelling.** A fresh account shows an empty or sparse galaxy, which feels broken rather than inviting.

This document designs a simplified home screen that gets students to value faster.

---

## 1. The Single Most Important Action

### Middle School (Grades 6–8)

**"Start studying for your next assignment."**

Middle schoolers are assignment-driven. They think in terms of "what's due" not "what should I learn." The app should open and immediately surface their nearest deadline with a single, unmissable button: **"Study for [Assignment Name] — due [Day]"**.

Why: This age group has shorter planning horizons, is more likely to be prompted by a parent or teacher, and responds to concrete, immediate tasks. Abstract exploration ("pick a topic") causes decision paralysis. Give them the answer.

### High School (Grades 9–12)

**"Continue where you left off — or tackle what's due next."**

High schoolers have more autonomy and varied study needs (AP prep, test review, homework help). The primary action should be contextual:

- If they have an **active tutor session**, show "Continue: [Topic]"
- If not, show **"Study for [Next Assignment] — due [Day]"**
- During exam weeks, show **"Review for [Exam Name]"**

Why: High schoolers are more self-directed but still procrastinate. The app should eliminate the "what should I do?" friction while respecting that they may already have momentum from a prior session.

---

## 2. Competitive Analysis

### Khan Academy / Khanmigo

| | |
|---|---|
| **Does well** | Massive content library. Trusted brand with teachers and parents. Khanmigo provides AI tutoring with guardrails. Course structure is clear and sequential. |
| **Does poorly** | Feels like school, not like a tool that helps with *your* school. Content is generic — not connected to what a student is actually assigned. Khanmigo is bolted onto existing content rather than built around the student's real coursework. |
| **ForgeStudy does better** | ForgeStudy starts from the student's *actual assignments* via Canvas/Classroom sync. We tutor on what's due Thursday, not a generic lesson. This is the difference between "learn algebra" and "get help with tonight's homework." |

### Quizlet

| | |
|---|---|
| **Does well** | Dead-simple core loop: make flashcards, study flashcards. Social features (shared sets) create network effects. Fast to start — no onboarding friction. |
| **Does poorly** | Memorization-only. No conceptual understanding. No connection to coursework. AI features (Q-Chat) feel shallow. Doesn't know what you're actually studying in class. |
| **ForgeStudy does better** | Socratic tutoring builds understanding, not just recall. We know what the student is studying because we sync their assignments — we don't ask them to manually create study materials. |

### Photomath

| | |
|---|---|
| **Does well** | Magic moment: point camera at a math problem, get a step-by-step solution. Extremely low friction. Feels like a superpower. |
| **Does poorly** | Math-only. Encourages answer-copying rather than understanding. No connection to broader coursework. No relationship with the student over time. |
| **ForgeStudy does better** | Our photo-drop homework feature provides a similar "point and go" moment, but routes to a Socratic tutor that helps the student *understand* rather than just handing them the answer. And it works across all subjects, not just math. |

### Chegg

| | |
|---|---|
| **Does well** | Comprehensive homework help. Textbook solutions. Expert Q&A. Students trust it as a last resort. |
| **Does poorly** | Widely perceived as a cheating tool. Expensive subscription. Reactive — you go there when desperate, not as a daily habit. No learning relationship. Being actively blocked by universities. |
| **ForgeStudy does better** | We're proactive, not reactive. ForgeStudy surfaces assignments *before* the panic moment and builds understanding through guided tutoring. We're the tool students use at 4pm, not 11pm. Teachers can trust it because Socratic method means students do the thinking. |

---

## 3. Simplified Home Screen Wireframes (Text-Based)

### Middle School Layout (Grades 6–8)

```
┌─────────────────────────────────────────────┐
│  ForgeStudy                    🔥 3-day streak │
│  Hey Maya! Ready to study?                    │
├─────────────────────────────────────────────┤
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  📘  MATH CHAPTER 7 REVIEW             │  │
│  │  Due tomorrow · Mrs. Patterson          │  │
│  │                                         │  │
│  │  ┌─────────────────────────────────┐    │  │
│  │  │     ▶  START STUDYING           │    │  │
│  │  └─────────────────────────────────┘    │  │
│  └─────────────────────────────────────────┘  │
│                                               │
├─────────────────────────────────────────────┤
│  COMING UP                                    │
│                                               │
│  ┌────────────┐  ┌────────────┐              │
│  │ 📗 Science │  │ 📙 English │              │
│  │ Lab Report │  │ Essay Draft│              │
│  │ Wed        │  │ Friday     │              │
│  │ [Study]    │  │ [Study]    │              │
│  └────────────┘  └────────────┘              │
│                                               │
├─────────────────────────────────────────────┤
│  📷 SNAP HOMEWORK                             │
│  Take a photo of any problem to get help      │
│                                               │
├─────────────────────────────────────────────┤
│  MY PROGRESS →                                │
│  ██████████░░░░  68% mastery this week        │
│  Tap to see your Learning Galaxy              │
│                                               │
├─────────────────────────────────────────────┤
│                                               │
│  [🏠 Home]    [💬 Tutor]    [📊 Progress]    │
│                                               │
└─────────────────────────────────────────────┘
```

**Key decisions:**
- **One hero card** for the most urgent assignment. No choice needed — just tap "Start Studying."
- **Coming Up** shows the next 2–3 assignments as small cards. Scrollable horizontally.
- **Snap Homework** keeps the photo-drop feature prominent — this is a strong "magic moment."
- **Progress** section replaces the Galaxy as the default view. The Galaxy is accessible but not the landing experience. Shows a simple progress bar, not a force graph.
- **Bottom nav** puts the tutor one tap away at all times.
- **Streak** stays visible — it's lightweight retention.

---

### High School Layout (Grades 9–12)

```
┌─────────────────────────────────────────────┐
│  ForgeStudy                    🔥 12-day streak│
│  Welcome back, Jordan                         │
├─────────────────────────────────────────────┤
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ↩️  PICK UP WHERE YOU LEFT OFF         │  │
│  │  AP Bio — Cellular Respiration          │  │
│  │  You were 60% through this topic        │  │
│  │  ┌─────────────────────────────────┐    │  │
│  │  │       ▶  CONTINUE               │    │  │
│  │  └─────────────────────────────────┘    │  │
│  └─────────────────────────────────────────┘  │
│                                               │
├─────────────────────────────────────────────┤
│  DUE THIS WEEK                                │
│                                               │
│  ⚡ AP Bio Lab Report ········· Tomorrow      │
│     [Study]                                   │
│  📐 Calc Problem Set 4 ······· Wednesday      │
│     [Study]                                   │
│  📝 English Rhetorical Analysis · Friday      │
│     [Study]                                   │
│                                               │
├─────────────────────────────────────────────┤
│  QUICK ACTIONS                                │
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ 📷 Snap  │ │ 📄 Upload│ │ 🧠 Quiz  │     │
│  │ Homework │ │ Material │ │ Me       │     │
│  └──────────┘ └──────────┘ └──────────┘     │
│                                               │
├─────────────────────────────────────────────┤
│  WEEKLY PROGRESS →                            │
│  Bio ████████░░  AP Calc ██████░░░░          │
│  Eng ███████░░░  History █████████░          │
│  Tap to explore your Learning Galaxy          │
│                                               │
├─────────────────────────────────────────────┤
│                                               │
│  [🏠 Home]    [💬 Tutor]    [📊 Progress]    │
│                                               │
└─────────────────────────────────────────────┘
```

**Key decisions:**
- **Hero card is contextual.** "Continue" if there's an active session, "Next Due" if starting fresh. High schoolers have more sessions in flight.
- **Due This Week** is a list, not cards. High schoolers juggle more assignments and need to scan quickly. Sorted by urgency.
- **Quick Actions** row gives access to photo-drop, material upload, and a self-quiz feature. High schoolers use more tools.
- **Progress** shows per-subject bars. More informational density than middle school. Galaxy accessible via tap.
- **"Quiz Me"** is new — high schoolers preparing for tests want to self-assess. This could generate quick practice questions from synced material.

---

## 4. Retention Hooks

### 1. **"Your [Subject] assignment is due tomorrow — you're 40% ready"**
Push notification with a readiness score derived from their tutor interactions. Creates urgency *and* a specific gap to close. A 7th grader thinks "40%?! I should study more." A 10th grader thinks "I need to review the parts I missed."

### 2. **Daily Streak with Streak Freeze**
The current streak counter is good. Add a **streak freeze** (earned by completing a full study session) so students don't lose their streak to one bad day. Streaks drive daily opens. The freeze gives them a reason to bank a good session today ("I'll earn a freeze in case I can't study tomorrow"). Duolingo proved this works for exactly this age group.

### 3. **"You explained it better than yesterday"**
After each tutor session, show a brief "session recap" that highlights improvement: "Yesterday you needed 6 hints on quadratic equations. Today you needed 2." Visible, concrete progress is addictive. Middle schoolers respond to "you're getting better" signals. High schoolers respond to efficiency metrics.

### 4. **Friend Activity Feed (Opt-In)**
"Ava studied for 45 minutes today" or "Marcus just mastered Chapter 5." Not a full social network — just a lightweight feed of study activity among friends. Creates gentle social pressure. This age group is deeply motivated by peers. Opt-in only to avoid pressure on struggling students.

### 5. **Weekly Challenge: "Beat Your Own Record"**
Every Monday, set a personal challenge based on last week's activity: "Last week you studied 3 hours. Can you hit 3.5?" or "You mastered 4 topics. Go for 5." Self-competition is more motivating than leaderboards for students who aren't top performers. Completing the challenge earns a streak freeze or cosmetic reward (galaxy skin, avatar item).

---

## 5. Simplification Recommendations

### Hide for Beta

| Feature | Reason |
|---|---|
| **Learning Galaxy as default home view** | Move to a "Progress" tab. It's a reward for engaged users, not an onboarding tool. Show it after the student has enough data to make it look impressive (5+ topics with mastery data). |
| **Orbit states (0–3) as primary progress indicator** | Replace with simple percentage bars on the home screen. Orbit metaphor requires explanation. Percentages are universal. |
| **Share Progress link on home screen** | Premature for beta. No one shares progress from a tool they just started using. Add this to the Progress tab later. |
| **Helper chips on the home screen** | Too many options on first load. The home screen should have ONE primary action, not a menu of chips. Move these to the tutor or an "explore" flow. |
| **Material upload on the home screen** | Keep photo-drop (it's a magic moment). Move PDF/DOCX upload to a secondary "Sources" or "Materials" area. Most students won't upload materials — they'll sync from Canvas. |

### Redesign for Beta

| Feature | Recommendation |
|---|---|
| **Canvas/Classroom connection flow** | Currently requires manual URL + token entry. This is a dealbreaker for middle schoolers. Prioritize OAuth or a teacher-initiated connection flow. If manual setup is the only option for beta, make it a guided wizard with screenshots, not a form. |
| **Smart CTA** | Good concept, but it should BE the home screen, not a widget on the Galaxy. The entire hero card should be the Smart CTA — "Here's what to do right now." |
| **Due Soon tray** | Currently a secondary tray on the Galaxy page. Promote this to the primary content of the home screen. Assignments are the backbone of the experience. |
| **Decontamination / quarantine banner** | The naming is opaque. If a topic needs review, say "This topic needs review" not "decontamination." Rename for clarity. |
| **Photo-drop button** | Good feature, but currently competes with the Galaxy for attention. Give it a dedicated, visually distinct spot on the new home screen. |

### Remove for Beta

| Feature | Reason |
|---|---|
| **Empty Galaxy state** | If a student has no data, do NOT show an empty Galaxy. Show a "Get Started" flow instead: connect Canvas → see your assignments → start studying. A barren Galaxy is the worst possible first impression. |

---

## 6. The 30-Second Pitch

> **ForgeStudy AI connects to your school's Canvas or Google Classroom, pulls in all your assignments, and then gives you your own AI tutor that actually helps you understand the work — not just gives you answers. You open the app, it shows you what's due, and you tap "Study" to start working through it with an AI that asks you questions and guides you step by step. It's like having a really patient tutor who knows exactly what your teacher assigned and never judges you for not getting it the first time. You can even take a photo of a homework problem and start getting help in seconds.**

---

## Summary: What Changes

| Before (Galaxy Home) | After (Assignment-First Home) |
|---|---|
| Open app → see floating nodes | Open app → see what's due tomorrow |
| "What do I click?" | "Start Studying" (one button) |
| Galaxy looks empty for new users | Assignments populate immediately from Canvas |
| Tutor is a separate section | Tutor is one tap away in bottom nav |
| Progress = orbit positions | Progress = percentage bars, Galaxy in a tab |
| Same experience for all grades | Middle school vs. high school layouts |

The Galaxy isn't gone — it's earned. Once a student has enough mastery data to make it look alive, it becomes a rewarding progress visualization. But it's not the front door anymore. The front door is: **"Here's your homework. Let's study."**

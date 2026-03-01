# Implementation Plan

## Overview

This task list implements 4 layout/routing/styling fixes to restore the Spatial OS architecture. The fixes follow established Dark Space patterns and require minimal new code.

---

## Tasks

- [x] 1. Create (gateway) route group with layout

  - [x] 1.1 Create src/app/(gateway)/layout.tsx
    - Export default GatewayLayout component
    - Apply Dark Space background gradient (bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950)
    - Render children with min-h-screen container
    - _Design: Architecture > Route Group Structure_
    - _Design: Bug 3 Implementation_
    - _Requirements: 2.5, 2.9_

- [x] 2. Move /profiles and /parent to gateway group

  - [x] 2.1 Move profiles directory to gateway group
    - Move src/app/(app)/profiles/ → src/app/(gateway)/profiles/
    - Verify profiles/page.tsx and profiles/new/ are moved
    - _Design: Implementation Notes > File Moves Required_
    - _Requirements: 2.5_

  - [x] 2.2 Move parent directory to gateway group
    - Move src/app/(app)/parent/ → src/app/(gateway)/parent/
    - Verify parent/page.tsx is moved
    - _Design: Implementation Notes > File Moves Required_
    - _Requirements: 2.9_

- [x] 3. Mount SettingsDrawer in (app) layout

  - [x] 3.1 Update src/app/(app)/layout.tsx
    - Import SettingsDrawer from '@/components/drawers/SettingsDrawer'
    - Mount SettingsDrawer component after children in AppShell
    - Verify SettingsDrawer is rendered in DOM
    - _Design: Bug 1 Implementation_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Test Settings drawer functionality
    - Navigate to Galaxy page
    - Click "Settings" in sidebar
    - Verify drawer slides open from right
    - Verify drawer has Dark Space styling
    - _Design: Testing Strategy > Manual Testing > Bug 1_
    - _Requirements: 2.1, 2.2_

- [x] 4. Apply Dark Space styling to History drawer

  - [x] 4.1 Locate History drawer component
    - Search codebase for History drawer component
    - Identify the drawer container element
    - _Design: Implementation Notes > Files to Modify_
    - _Requirements: 2.3_

  - [x] 4.2 Update History drawer styling
    - Apply bg-slate-950/95 backdrop-blur-2xl to drawer container
    - Add border-l border-slate-800 shadow-2xl
    - Verify fixed positioning (inset-y-0 right-0)
    - _Design: Bug 2 Implementation_
    - _Design: Dark Space Styling Patterns > Drawer Styling_
    - _Requirements: 2.3, 2.4_

  - [x] 4.3 Test History drawer styling
    - Trigger History drawer
    - Verify Dark Space styling matches Settings drawer
    - Verify backdrop blur and border appearance
    - _Design: Testing Strategy > Manual Testing > Bug 2_
    - _Requirements: 2.3, 2.4_

- [x] 5. Update profile cards with Dark Space styling

  - [x] 5.1 Update profile card backgrounds
    - In src/app/(gateway)/profiles/page.tsx
    - Replace bg-white/80 with bg-slate-900/60 backdrop-blur-md
    - Replace border-slate-200 with border-slate-800
    - Add shadow-xl rounded-2xl
    - _Design: Bug 3 Implementation_
    - _Design: Dark Space Styling Patterns > Glassmorphic Cards_
    - _Requirements: 2.6_

  - [x] 5.2 Add profile card hover states
    - Add hover:border-indigo-500 hover:bg-slate-800/60
    - Add hover:-translate-y-1
    - Add hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]
    - Add transition-all duration-300
    - _Design: Dark Space Styling Patterns > Hover States_
    - _Requirements: 2.8_

  - [x] 5.3 Update profile card text colors
    - Replace text-slate-900 with text-slate-100
    - Replace text-slate-600 with text-slate-400
    - Verify text readability on dark background
    - _Design: Implementation Notes > Styling Changes Summary > Profile Cards_
    - _Requirements: 2.6_

  - [x] 5.4 Test profile selection page
    - Navigate to /profiles
    - Verify no sidebar visible
    - Verify full-screen cinematic layout
    - Verify glassmorphic cards with Dark Space styling
    - Hover over cards, verify indigo border and glow effect
    - Click profile, verify navigation works
    - _Design: Testing Strategy > Manual Testing > Bug 3_
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

- [x] 6. Update parent PIN screen with Dark Space styling

  - [x] 6.1 Update parent dashboard container
    - In src/app/(gateway)/parent/page.tsx
    - Apply min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950
    - Center content with flex items-center justify-center
    - _Design: Bug 4 Implementation_
    - _Requirements: 2.11_

  - [x] 6.2 Update parent dashboard card styling
    - Replace bg-white with bg-slate-900/80 backdrop-blur-xl
    - Replace border-slate-200 with border-slate-800
    - Add shadow-xl rounded-2xl p-8
    - _Design: Dark Space Styling Patterns > Glassmorphic Cards_
    - _Requirements: 2.10_

  - [x] 6.3 Update parent dashboard text colors
    - Update text colors for dark background
    - Verify text readability
    - _Design: Implementation Notes > Styling Changes Summary > Parent Dashboard_
    - _Requirements: 2.10_

  - [x] 6.4 Test parent dashboard page
    - Navigate to /parent
    - Verify no sidebar visible
    - Verify full-screen secure vault layout
    - Verify Dark Space styling on all elements
    - Verify PIN entry modal has Dark Space styling
    - _Design: Testing Strategy > Manual Testing > Bug 4_
    - _Requirements: 2.9, 2.10, 2.11_

- [x] 7. Regression testing

  - [x] 7.1 Test route group preservation
    - Navigate to /galaxy → verify sidebar visible
    - Navigate to /sources → verify sidebar visible
    - Verify all (app) routes continue to show sidebar
    - _Design: Testing Strategy > Regression Testing > Route Group Preservation_
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 7.2 Test drawer system preservation
    - Open Focus Panel → verify Dark Space styling
    - Open Settings drawer → verify Dark Space styling
    - Verify all drawers slide smoothly
    - _Design: Testing Strategy > Regression Testing > Drawer System Preservation_
    - _Requirements: 3.1, 3.2_

  - [x] 7.3 Test styling system preservation
    - Check existing glassmorphic cards in Galaxy
    - Check existing hover states on interactive elements
    - Verify no white backgrounds introduced in (app) routes
    - _Design: Testing Strategy > Regression Testing > Styling System Preservation_
    - _Requirements: 3.7, 3.8_

- [x] 8. Checkpoint - Ensure all fixes are working
  - Verify Settings drawer opens correctly
  - Verify History drawer has Dark Space styling
  - Verify /profiles renders full-screen with Dark Space cards
  - Verify /parent renders full-screen with Dark Space styling
  - Verify no regressions in (app) routes or drawer system

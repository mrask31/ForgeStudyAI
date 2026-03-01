# UI Sprint 5 Gateway Fixes - Design Document

## Overview

This design addresses 4 straightforward layout/routing/styling bugs that break the Spatial OS architecture. The fixes follow established patterns from the Dark Space UI completion work and require minimal new code. The primary changes are:

1. Create (gateway) route group for full-screen authentication/profile experiences
2. Move /profiles and /parent routes to (gateway) group
3. Mount SettingsDrawer in (app) layout
4. Apply Dark Space CSS to History drawer
5. Update profile cards and parent PIN screen with Dark Space glassmorphic styling

## Glossary

- **Gateway Route Group**: Next.js route group for full-screen experiences (auth, profile selection) that render outside the sidebar layout
- **App Route Group**: Next.js route group for student application pages (Galaxy, Sources) that render inside the sidebar layout
- **Dark Space Styling**: Established design system using slate-950/slate-900 backgrounds, backdrop-blur, glassmorphic cards, and indigo accent colors
- **Spatial OS Architecture**: UI pattern where Galaxy is the central hub with secondary pages as slide-over drawers
- **SettingsDrawer**: Drawer component that slides from right when "Settings" is clicked in sidebar
- **History Drawer**: Drawer component that displays study history (location TBD)

## Architecture

### Route Group Structure

```
src/app/
├── (app)/                    # Student application with sidebar
│   ├── layout.tsx           # Mounts Sidebar + SettingsDrawer
│   ├── galaxy/
│   ├── sources/
│   └── ...
└── (gateway)/               # Full-screen gateway experiences
    ├── layout.tsx           # Minimal layout, no sidebar
    ├── profiles/
    │   ├── page.tsx        # Profile selection (moved from (app))
    │   └── new/
    └── parent/
        └── page.tsx        # Parent dashboard (moved from (app))
```

### Layout Hierarchy

**Current (Broken):**
- /profiles renders inside (app) layout → sidebar visible, cramped
- /parent renders inside (app) layout → sidebar visible, wrong context
- SettingsDrawer not mounted → event listeners don't work

**Fixed:**
- /profiles renders in (gateway) layout → full-screen cinematic
- /parent renders in (gateway) layout → full-screen secure vault
- SettingsDrawer mounted in (app) layout → receives custom events

## Bug Fixes

### Bug 1: Settings Drawer Not Mounting

**Root Cause:** SettingsDrawer component is not rendered in the DOM, so its event listeners cannot hear custom events dispatched by the sidebar.

**Fix:** Mount SettingsDrawer in (app) layout alongside children.

**Implementation:**
```tsx
// src/app/(app)/layout.tsx
import { SettingsDrawer } from '@/components/drawers/SettingsDrawer'

export default function AppRouteLayout({ children }) {
  return (
    <AppShell variant="app">
      {children}
      <SettingsDrawer />
    </AppShell>
  )
}
```

### Bug 2: History Drawer White Background

**Root Cause:** History drawer lacks Dark Space styling classes.

**Fix:** Apply established Dark Space drawer pattern (bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800).

**Implementation:**
```tsx
// Find History drawer component and update className
<div className="fixed inset-y-0 right-0 w-96 bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl">
  {/* drawer content */}
</div>
```

### Bug 3: Profile Selection Trapped in Sidebar Layout

**Root Cause:** /profiles page is in (app) route group, inheriting sidebar layout.

**Fix:** 
1. Create (gateway) route group with minimal layout
2. Move profiles/ directory to (gateway)
3. Update profile cards with Dark Space glassmorphic styling

**Implementation:**
```tsx
// src/app/(gateway)/layout.tsx
export default function GatewayLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {children}
    </div>
  )
}

// src/app/(gateway)/profiles/page.tsx
// Update card styling from white to Dark Space:
<div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl p-8 
     hover:border-indigo-500 hover:bg-slate-800/60 hover:-translate-y-1 
     hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300">
```

### Bug 4: Parent PIN Screen Trapped in Sidebar Layout

**Root Cause:** /parent page is in (app) route group, inheriting sidebar layout.

**Fix:**
1. Move parent/ directory to (gateway)
2. Update parent dashboard with Dark Space styling

**Implementation:**
```tsx
// src/app/(gateway)/parent/page.tsx
// Update container styling:
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
  <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl rounded-2xl p-8">
    {/* parent dashboard content */}
  </div>
</div>
```

## Dark Space Styling Patterns

### Established Patterns (from dark-space-ui-completion)

**Glassmorphic Cards:**
```css
bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl
```

**Hover States:**
```css
hover:border-indigo-500 hover:bg-slate-800/60 hover:-translate-y-1 
hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300
```

**Drawer Styling:**
```css
bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl
```

**Background Gradients:**
```css
bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950
```

### Application to Fixes

- Profile cards: Replace `bg-white/80` with `bg-slate-900/60 backdrop-blur-md`
- Profile card borders: Replace `border-slate-200` with `border-slate-800`
- Profile card hover: Add `hover:border-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]`
- Parent dashboard: Replace white backgrounds with `bg-slate-900/80 backdrop-blur-xl`
- History drawer: Add `bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800`

## Testing Strategy

### Manual Testing

**Bug 1: Settings Drawer**
1. Navigate to Galaxy page
2. Click "Settings" in sidebar
3. Verify drawer slides open from right
4. Verify drawer has Dark Space styling

**Bug 2: History Drawer**
1. Trigger History drawer (find trigger location)
2. Verify drawer has Dark Space styling (bg-slate-950/95, backdrop-blur-2xl, border-slate-800)
3. Verify visual consistency with Settings drawer

**Bug 3: Profile Selection**
1. Navigate to /profiles
2. Verify no sidebar visible
3. Verify full-screen cinematic layout
4. Verify profile cards have Dark Space glassmorphic styling
5. Hover over cards, verify indigo border and glow effect
6. Click profile, verify navigation works

**Bug 4: Parent Dashboard**
1. Navigate to /parent
2. Verify no sidebar visible
3. Verify full-screen secure vault layout
4. Verify Dark Space styling on all elements
5. Verify PIN entry modal has Dark Space styling

### Regression Testing

**Route Group Preservation:**
- Navigate to /galaxy → verify sidebar visible
- Navigate to /sources → verify sidebar visible
- Verify all (app) routes continue to show sidebar

**Drawer System Preservation:**
- Open Focus Panel → verify Dark Space styling
- Open Settings drawer → verify Dark Space styling
- Verify all drawers slide smoothly

**Styling System Preservation:**
- Check existing glassmorphic cards in Galaxy
- Check existing hover states on interactive elements
- Verify no white backgrounds introduced in (app) routes

## Implementation Notes

### File Moves Required

1. Move `src/app/(app)/profiles/` → `src/app/(gateway)/profiles/`
2. Move `src/app/(app)/parent/` → `src/app/(gateway)/parent/`

### New Files Required

1. `src/app/(gateway)/layout.tsx` - minimal layout with Dark Space background

### Files to Modify

1. `src/app/(app)/layout.tsx` - mount SettingsDrawer
2. `src/app/(gateway)/profiles/page.tsx` - update styling to Dark Space
3. `src/app/(gateway)/parent/page.tsx` - update styling to Dark Space
4. History drawer component (location TBD) - update styling to Dark Space

### Styling Changes Summary

**Profile Cards:**
- Background: `bg-white/80` → `bg-slate-900/60 backdrop-blur-md`
- Border: `border-slate-200` → `border-slate-800`
- Hover: Add `hover:border-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]`
- Text: `text-slate-900` → `text-slate-100`, `text-slate-600` → `text-slate-400`

**Parent Dashboard:**
- Background: `bg-white` → `bg-slate-900/80 backdrop-blur-xl`
- Border: `border-slate-200` → `border-slate-800`
- Text: Update to light colors for dark background

**History Drawer:**
- Add: `bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800`

## Correctness Properties

Property 1: Settings Drawer Mounting

_For any_ user interaction where the "Settings" button in the sidebar is clicked, the SettingsDrawer component SHALL be present in the DOM and SHALL slide open from the right with Dark Space styling.

**Validates: Requirements 2.1, 2.2**

Property 2: History Drawer Dark Space Styling

_For any_ user interaction that triggers the History drawer, the drawer SHALL display with Dark Space styling (bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800) matching the visual consistency of other drawers.

**Validates: Requirements 2.3, 2.4**

Property 3: Profile Selection Gateway Layout

_For any_ navigation to /profiles, the page SHALL render in the (gateway) route group with no sidebar visible, SHALL display Dark Space glassmorphic cards, and SHALL appear as a full-screen cinematic gateway with interactive hover states.

**Validates: Requirements 2.5, 2.6, 2.7, 2.8**

Property 4: Parent Dashboard Gateway Layout

_For any_ navigation to /parent, the page SHALL render in the (gateway) route group with no sidebar visible, SHALL display Dark Space styling, and SHALL appear as a full-screen secure vault gateway.

**Validates: Requirements 2.9, 2.10, 2.11**

Property 5: Preservation - App Route Group Sidebar

_For any_ navigation to pages in the (app) route group (Galaxy, Sources, etc.), the system SHALL continue to display the sidebar layout and Dark Space styling exactly as before.

**Validates: Requirements 3.3, 3.4, 3.5**

Property 6: Preservation - Drawer System

_For any_ drawer interaction (Focus Panel, Settings, History), the system SHALL continue to display drawers with correct Dark Space styling and smooth slide animations.

**Validates: Requirements 3.1, 3.2**

Property 7: Preservation - Styling System

_For any_ glassmorphic card or interactive element in existing components, the system SHALL continue to apply correct backdrop-blur, opacity, and hover transition values.

**Validates: Requirements 3.7, 3.8**

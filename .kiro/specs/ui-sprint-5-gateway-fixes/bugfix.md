# Bugfix Requirements Document

## Introduction

This document addresses 4 critical bugs discovered during QA walkthrough of UI Sprint 5. These bugs break the Spatial OS architecture where Galaxy serves as the central hub with secondary pages as slide-over drawers, and gateway routes (authentication/profile selection) should be full-screen experiences outside the sidebar layout. The bugs prevent proper drawer functionality and trap gateway pages inside the student application layout with incorrect styling.

## Bug Analysis

### Current Behavior (Defect)

**Bug 1: Settings Drawer Not Mounting**

1.1 WHEN user clicks "Settings" in the sidebar THEN nothing happens and the settings drawer does not open

1.2 WHEN the SettingsDrawer component is not rendered in the DOM THEN its event listeners cannot hear custom events dispatched by the sidebar

**Bug 2: History Drawer White Background**

1.3 WHEN the History drawer slides open THEN it displays with a stark white background instead of Dark Space styling

1.4 WHEN the History drawer is rendered THEN it lacks the glassmorphic backdrop blur and slate border styling used in other drawers

**Bug 3: Profile Selection Trapped in Sidebar Layout**

1.5 WHEN user navigates to /profiles THEN the page renders inside the (app) route group with the sidebar layout visible

1.6 WHEN the /profiles page renders THEN it displays V1 white cards instead of Dark Space glassmorphic cards

1.7 WHEN the /profiles page renders THEN it appears cramped inside the sidebar layout instead of full-screen cinematic gateway

**Bug 4: Parent PIN Screen Trapped in Sidebar Layout**

1.8 WHEN user navigates to /parent THEN the page renders inside the (app) route group with the sidebar layout visible

1.9 WHEN the /parent PIN screen renders THEN it displays with stark white background instead of Dark Space styling

1.10 WHEN the /parent PIN screen renders THEN it appears trapped in the student layout instead of full-screen secure vault gateway

### Expected Behavior (Correct)

**Bug 1: Settings Drawer Not Mounting**

2.1 WHEN user clicks "Settings" in the sidebar THEN the settings drawer SHALL slide open from the right

2.2 WHEN the application layout renders THEN the SettingsDrawer component SHALL be mounted in the DOM to receive custom events

**Bug 2: History Drawer White Background**

2.3 WHEN the History drawer slides open THEN it SHALL display with Dark Space styling (bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800)

2.4 WHEN the History drawer is rendered THEN it SHALL match the visual consistency of the Focus Panel and Settings drawer

**Bug 3: Profile Selection Trapped in Sidebar Layout**

2.5 WHEN user navigates to /profiles THEN the page SHALL render in a (gateway) route group with no sidebar layout

2.6 WHEN the /profiles page renders THEN it SHALL display Dark Space glassmorphic cards (bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl)

2.7 WHEN the /profiles page renders THEN it SHALL appear as a full-screen cinematic gateway centered vertically and horizontally

2.8 WHEN user hovers over a profile card THEN it SHALL display interactive hover states (hover:border-indigo-500 hover:bg-slate-800/60 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)])

**Bug 4: Parent PIN Screen Trapped in Sidebar Layout**

2.9 WHEN user navigates to /parent THEN the page SHALL render in a (gateway) route group with no sidebar layout

2.10 WHEN the /parent PIN screen renders THEN it SHALL display with Dark Space styling (bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl)

2.11 WHEN the /parent PIN screen renders THEN it SHALL appear as a full-screen secure vault gateway centered vertically and horizontally

### Unchanged Behavior (Regression Prevention)

**Drawer System Preservation**

3.1 WHEN other drawers (Focus Panel, etc.) are opened THEN the system SHALL CONTINUE TO display them with correct Dark Space styling

3.2 WHEN custom events are dispatched for other drawers THEN the system SHALL CONTINUE TO open them correctly

**Route Group Preservation**

3.3 WHEN user navigates to pages in the (app) route group (Galaxy, Sources, etc.) THEN the system SHALL CONTINUE TO display them with the sidebar layout

3.4 WHEN pages in the (app) route group render THEN the system SHALL CONTINUE TO display them with correct Dark Space styling

**Layout Hierarchy Preservation**

3.5 WHEN the (app) layout renders THEN it SHALL CONTINUE TO mount the Sidebar component correctly

3.6 WHEN the (gateway) layout is created THEN it SHALL NOT interfere with the (app) layout's sidebar functionality

**Styling System Preservation**

3.7 WHEN glassmorphic cards are rendered in existing components THEN the system SHALL CONTINUE TO apply the correct backdrop-blur and opacity values

3.8 WHEN hover states are applied to interactive elements THEN the system SHALL CONTINUE TO display smooth transitions

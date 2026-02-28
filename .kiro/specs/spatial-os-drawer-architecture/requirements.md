# Requirements Document

## Introduction

This specification defines the architectural refactor to eliminate redundant full-page routes and convert remaining pages to slide-over drawers, establishing the Galaxy as the central spatial hub. The refactor reduces the application to exactly two full-screen pages (/app for Galaxy and /sources for Airlock) while moving all other functionality into contextual slide-over drawers that maintain spatial continuity.

## Glossary

- **Galaxy**: The central spatial hub page located at /app route
- **Airlock**: The upload materials page located at /sources route
- **Drawer**: A slide-over panel component that appears over the Galaxy with backdrop blur
- **Sidebar**: The navigation component containing links to pages and drawer triggers
- **FocusPanel**: The existing tutor drawer component that serves as the architectural reference
- **Smart_CTA**: The component that handles progress tracking functionality
- **Spatial_Context**: The visual and navigational state where users remain on the Galaxy page
- **Backdrop**: The depth-of-field blur effect behind open drawers
- **SettingsDrawer**: Slide-over panel for application settings
- **HistoryDrawer**: Slide-over panel for chat conversation history
- **ProofHistoryDrawer**: Slide-over panel for proof document history

## Requirements

### Requirement 1: Remove Redundant Full-Page Routes

**User Story:** As a user, I want redundant pages removed, so that the application has a cleaner architecture focused on the Galaxy hub.

#### Acceptance Criteria

1. THE Application SHALL delete the /readiness route and associated page component
2. THE Application SHALL delete the /help route and associated page component
3. THE Application SHALL delete the /settings route and associated page component
4. THE Application SHALL delete the /history route and associated page component (if it exists)
5. THE Application SHALL delete the /proof route and associated page component (if it exists)

### Requirement 2: Implement Settings Drawer Component

**User Story:** As a user, I want to access settings through a drawer, so that I can configure the application without leaving the Galaxy context.

#### Acceptance Criteria

1. THE SettingsDrawer SHALL use the same architectural pattern as FocusPanel (fixed positioning, right-0, z-50, bg-slate-950/95, backdrop-blur-2xl)
2. THE SettingsDrawer SHALL display a Parent Dashboard link
3. THE SettingsDrawer SHALL display a Display Density toggle control
4. THE SettingsDrawer SHALL display a Logout button
5. THE SettingsDrawer SHALL display a Support email contact
6. WHEN the user clicks the Sidebar "Settings" link, THE Galaxy_Page SHALL open the SettingsDrawer over the Galaxy view

### Requirement 3: Implement History Drawer Components

**User Story:** As a user, I want to access my chat and proof history through drawers, so that I can review past interactions without leaving the Galaxy context.

#### Acceptance Criteria

1. THE HistoryDrawer SHALL use the same architectural pattern as FocusPanel
2. THE HistoryDrawer SHALL display the user's chat conversation history
3. THE ProofHistoryDrawer SHALL use the same architectural pattern as FocusPanel
4. THE ProofHistoryDrawer SHALL display the user's proof document history
5. WHEN the user clicks the Sidebar "History" link, THE Galaxy_Page SHALL open the HistoryDrawer
6. WHEN the user clicks the Sidebar "Proof History" link, THE Galaxy_Page SHALL open the ProofHistoryDrawer

### Requirement 4: Update Sidebar Navigation Structure

**User Story:** As a user, I want a clean sidebar with clear separation between pages and drawers, so that I understand the navigation structure.

#### Acceptance Criteria

1. THE Sidebar SHALL display "🌌 My Galaxy" as a primary section link to /app route
2. THE Sidebar SHALL display "📥 Uploads" as a primary section link to /sources route
3. THE Sidebar SHALL display "History" as a secondary section drawer trigger
4. THE Sidebar SHALL display "Proof History" as a secondary section drawer trigger
5. THE Sidebar SHALL display "Settings" as a secondary section drawer trigger
6. THE Sidebar SHALL NOT display "Progress" link
7. THE Sidebar SHALL NOT display "How it Works" link

### Requirement 5: Implement Drawer State Management

**User Story:** As a user, I want only one drawer open at a time with consistent interaction patterns, so that the interface remains predictable and uncluttered.

#### Acceptance Criteria

1. THE Galaxy_Page SHALL manage the state of all drawer components
2. WHEN a drawer is opened, THE Galaxy_Page SHALL close any currently open drawer
3. WHEN a drawer is open, THE Galaxy_Page SHALL display the Backdrop effect
4. WHEN the user clicks the Backdrop, THE Galaxy_Page SHALL close the open drawer
5. WHEN the user presses the Escape key, THE Galaxy_Page SHALL close the open drawer
6. THE Galaxy_Page SHALL maintain Spatial_Context when drawers open and close

### Requirement 6: Enforce Two-Page Architecture

**User Story:** As a developer, I want the application to have exactly two full-screen pages, so that the architecture is simple and maintainable.

#### Acceptance Criteria

1. THE Application SHALL have exactly two full-screen page routes: /app and /sources
2. THE Application SHALL implement all Settings functionality through SettingsDrawer
3. THE Application SHALL implement all History functionality through HistoryDrawer
4. THE Application SHALL implement all Proof History functionality through ProofHistoryDrawer
5. THE Application SHALL implement all Tutor functionality through FocusPanel (existing)
6. WHEN users navigate within the application, THE Application SHALL keep users in Spatial_Context except when accessing /sources

### Requirement 7: Maintain Consistent Drawer Architecture

**User Story:** As a developer, I want all drawers to follow the same architectural pattern, so that the codebase is consistent and maintainable.

#### Acceptance Criteria

1. FOR ALL drawer components, THE Drawer SHALL use fixed positioning with right-0 alignment
2. FOR ALL drawer components, THE Drawer SHALL use z-50 layering
3. FOR ALL drawer components, THE Drawer SHALL use bg-slate-950/95 background with backdrop-blur-2xl
4. FOR ALL drawer components, THE Drawer SHALL support close on Backdrop click
5. FOR ALL drawer components, THE Drawer SHALL support close on Escape key press
6. FOR ALL drawer components, THE Galaxy_Page SHALL ensure only one drawer is open at a time

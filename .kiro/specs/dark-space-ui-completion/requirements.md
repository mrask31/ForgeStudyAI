# Requirements Document

## Introduction

This feature completes the Dark Space UI transformation for ForgeStudy by converting the remaining legacy V1 white card pages (/readiness, /help, /settings) to the new Dark Space aesthetic and implementing a Focus Panel slide-over drawer for Galaxy star interactions. The goal is to achieve visual cohesion across all sidebar navigation links and provide seamless access to AI tutoring from the Galaxy visualization.

## Glossary

- **Dark_Space_UI**: The new design system featuring bg-slate-950 backgrounds, glassmorphic cards (bg-slate-900/60 with backdrop blur), and indigo brand colors
- **Legacy_V1_UI**: The old design system featuring white cards (bg-white), gray gradients, and teal/emerald accent colors
- **Glassmorphism**: A design technique using semi-transparent backgrounds with backdrop blur effects (bg-slate-900/60 backdrop-blur-md)
- **Focus_Panel**: A slide-over drawer component that appears from the right side when clicking a Galaxy star
- **Galaxy**: The force-directed graph visualization showing study topics as nodes (stars)
- **Weave_Mode**: A toggle mode in the Galaxy that allows selecting multiple stars for synthesis (when active, star clicks select rather than open Focus Panel)
- **Socratic_Chat**: The AI tutoring interface that guides students through questions using the Socratic method
- **Secondary_Pages**: The /readiness, /help, and /settings pages that currently use Legacy V1 UI

## Requirements

### Requirement 1: Convert Readiness Page to Dark Space UI

**User Story:** As a student, I want the readiness page to match the Dark Space aesthetic, so that the app feels visually cohesive.

#### Acceptance Criteria

1. THE Readiness_Page SHALL use bg-slate-950 as the global background color
2. THE Readiness_Page SHALL replace all bg-white cards with glassmorphic cards using bg-slate-900/60 border border-slate-800 shadow-xl rounded-2xl backdrop-blur-md
3. THE Readiness_Page SHALL replace all teal and emerald buttons with indigo brand colors (bg-indigo-600 hover:bg-indigo-500 text-white)
4. THE Readiness_Page SHALL use text-indigo-400 for active states and interactive elements
5. THE Readiness_Page SHALL update all black and gray text to text-slate-200 for headers and text-slate-400 for descriptions
6. THE Readiness_Page SHALL remove any gray gradient backgrounds (from-slate-50, via-emerald-50, etc.)

### Requirement 2: Convert Help Page to Dark Space UI

**User Story:** As a student, I want the help page to match the Dark Space aesthetic, so that I have a consistent visual experience.

#### Acceptance Criteria

1. THE Help_Page SHALL use bg-slate-950 as the global background color
2. THE Help_Page SHALL remove the massive white wrapper container
3. THE Help_Page SHALL use glassmorphic cards (bg-slate-900/60 border border-slate-800 shadow-xl rounded-2xl backdrop-blur-md) for content sections
4. THE Help_Page SHALL replace all teal and emerald accent colors with indigo brand colors
5. THE Help_Page SHALL update all text colors to text-slate-200 for headers and text-slate-400 for body text
6. THE Help_Page SHALL let content breathe on the bg-slate-950 canvas without constraining white backgrounds

### Requirement 3: Convert Settings Page to Dark Space UI

**User Story:** As a student, I want the settings page to match the Dark Space aesthetic, so that all navigation destinations are visually unified.

#### Acceptance Criteria

1. THE Settings_Page SHALL use bg-slate-950 as the global background color
2. THE Settings_Page SHALL replace all bg-white cards with glassmorphic cards using bg-slate-900/60 border border-slate-800 shadow-xl rounded-2xl backdrop-blur-md
3. THE Settings_Page SHALL replace all gradient backgrounds (from-slate-50 via-emerald-50) with bg-slate-950
4. THE Settings_Page SHALL replace all teal and emerald buttons with indigo brand colors (bg-indigo-600 hover:bg-indigo-500)
5. THE Settings_Page SHALL update all text colors to text-slate-200 for headers and text-slate-400 for descriptions
6. THE Settings_Page SHALL maintain all existing functionality (logout, density toggle, parent access links)

### Requirement 4: Implement Focus Panel Slide-Over Drawer

**User Story:** As a student, I want to click a Galaxy star and see a tutoring interface slide in from the right, so that I can get help without leaving the Galaxy view.

#### Acceptance Criteria

1. WHEN a Galaxy star is clicked AND Weave_Mode is off, THE Focus_Panel SHALL slide in from the right side of the screen
2. THE Focus_Panel SHALL use fixed positioning with classes: fixed inset-y-0 right-0 w-full md:w-[450px] lg:w-[500px]
3. THE Focus_Panel SHALL use Dark Space styling: bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl z-50
4. THE Focus_Panel SHALL animate with transition-transform duration-300 ease-in-out
5. THE Focus_Panel SHALL include a close button [X] in the top right corner
6. WHEN the close button is clicked, THE Focus_Panel SHALL slide out to the right and disappear
7. WHEN Weave_Mode is active, THE Galaxy SHALL continue to use constellation selection behavior (no Focus Panel)

### Requirement 5: Port Socratic Chat Interface to Focus Panel

**User Story:** As a student, I want the Focus Panel to contain the AI tutoring chat interface, so that I can ask questions about the selected topic.

#### Acceptance Criteria

1. THE Focus_Panel SHALL display the Socratic_Chat interface from the /tutor page
2. THE Focus_Panel SHALL pass the selected star's topicId and topicTitle to the chat interface
3. THE Focus_Panel SHALL initialize a new chat session when opened with the selected topic context
4. THE Socratic_Chat SHALL function identically to the /tutor page implementation
5. THE Focus_Panel SHALL maintain chat state while open (messages persist during the session)

### Requirement 6: Style Chat Messages in Focus Panel

**User Story:** As a student, I want the chat messages to use Dark Space styling, so that the Focus Panel feels integrated with the Galaxy.

#### Acceptance Criteria

1. THE AI_Messages SHALL use styling: bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl rounded-tl-none
2. THE Student_Messages SHALL use styling: bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 rounded-2xl rounded-tr-none
3. THE Input_Bar SHALL use styling: bg-slate-950 border-t border-slate-800 and be fixed to the bottom of the Focus Panel
4. THE Input_Field SHALL use styling: bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:border-indigo-500
5. THE Send_Button SHALL use indigo brand colors: bg-indigo-600 hover:bg-indigo-500 text-white

### Requirement 7: Handle Focus Panel State Management

**User Story:** As a student, I want the Focus Panel to close cleanly and return me to the Galaxy, so that I can continue exploring other topics.

#### Acceptance Criteria

1. WHEN the Focus_Panel is closed, THE Galaxy SHALL remain visible and interactive
2. WHEN the Focus_Panel is closed, THE Chat_Session SHALL be preserved in history
3. WHEN a different Galaxy star is clicked, THE Focus_Panel SHALL close the current session and open a new session with the new topic
4. THE Focus_Panel SHALL not navigate away from the Galaxy page
5. THE Focus_Panel SHALL overlay the Galaxy without blocking the Weave Mode toggle button

### Requirement 8: Ensure Mobile Responsiveness

**User Story:** As a student on mobile, I want the Focus Panel to work on small screens, so that I can use the feature on any device.

#### Acceptance Criteria

1. WHEN the viewport width is less than 768px, THE Focus_Panel SHALL use w-full (full screen width)
2. WHEN the viewport width is 768px or greater, THE Focus_Panel SHALL use w-[450px]
3. WHEN the viewport width is 1024px or greater, THE Focus_Panel SHALL use w-[500px]
4. THE Focus_Panel SHALL be scrollable when content exceeds viewport height
5. THE Close_Button SHALL remain accessible on all screen sizes

### Requirement 9: Validate Visual Cohesion

**User Story:** As a student, I want all sidebar navigation links to show consistent Dark Space UI, so that the app feels professionally designed.

#### Acceptance Criteria

1. WHEN navigating to /readiness, THE Page SHALL display no white cards, teal buttons, or gray gradients
2. WHEN navigating to /help, THE Page SHALL display no white cards, teal buttons, or gray gradients
3. WHEN navigating to /settings, THE Page SHALL display no white cards, teal buttons, or gray gradients
4. THE Readiness_Page, Help_Page, and Settings_Page SHALL all use the same glassmorphic card styling
5. THE Readiness_Page, Help_Page, and Settings_Page SHALL all use indigo brand colors for interactive elements

### Requirement 10: Preserve Existing Functionality

**User Story:** As a student, I want all existing features to continue working after the UI update, so that I don't lose any functionality.

#### Acceptance Criteria

1. THE Readiness_Page SHALL maintain all existing data displays (study signals, focus areas, learning library)
2. THE Help_Page SHALL maintain all existing content sections and text
3. THE Settings_Page SHALL maintain all existing controls (logout, density toggle, parent access)
4. THE Galaxy SHALL maintain all existing interactions (Weave Mode, node selection, navigation to /tutor)
5. THE Focus_Panel SHALL not interfere with existing Galaxy physics or animations

# Bugfix Requirements Document

## Introduction

The Forge Inbox feature currently creates an unfiltered data pipeline that instantly renders all automated email ingestion as visible grey dots in the Galaxy UI. When students receive high-volume automated emails (syllabi, class announcements, bulk materials), the system immediately creates study_topics that pollute the visual interface, causing psychological overwhelm and defeating the purpose of the calm, focused learning environment.

This bug violates the core principle of student agency: passive data ingestion (emails arriving automatically) should not have the same visual impact as active learning intent (manually adding topics). The fix introduces an orbit_state staging mechanism that quarantines automated ingestion (State 0: Invisible) while preserving immediate visibility for manual topic creation (State 1: Active/Visible).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an email arrives via Postmark webhook (source === 'email') THEN the system immediately creates study_topics with no orbit_state filtering, causing all automated ingestion to instantly render as grey dots in the Galaxy UI

1.2 WHEN high-volume automated emails arrive (syllabi, announcements, bulk materials) THEN the system creates dozens of study_topics simultaneously, overwhelming the visual interface with unprocessed grey dots

1.3 WHEN the webhook creates study_topics from email attachments THEN the system provides no mechanism to distinguish between passive ingestion (automated) and active intent (manual), treating all topics identically

1.4 WHEN the Galaxy UI queries study_topics THEN the system returns all topics without filtering by orbit_state, rendering every topic regardless of student readiness to engage

### Expected Behavior (Correct)

2.1 WHEN an email arrives via Postmark webhook (source === 'email') THEN the system SHALL create study_topics with orbit_state = 0 (Quarantine/Invisible), preventing automated ingestion from polluting the Galaxy UI

2.2 WHEN high-volume automated emails arrive (syllabi, announcements, bulk materials) THEN the system SHALL auto-fracture content into micro-missions and save them with orbit_state = 0, staging them for later review without visual overwhelm

2.3 WHEN the webhook processes email attachments THEN the system SHALL use Gemini 1.5 Flash with structured output to distinguish between reference materials (is_reference_only: true → learning_sources only) and actionable content (is_reference_only: false → study_topics with orbit_state = 0)

2.4 WHEN the Galaxy UI queries study_topics THEN the system SHALL filter by orbit_state, displaying only topics with orbit_state >= 1 (Active/Visible), hiding quarantined topics from the visual interface

2.5 WHEN the Galaxy UI loads AND there are topics with orbit_state = 0 belonging to the user THEN the system SHALL render a passive, non-intrusive UI banner (e.g., '📩 Forge Inbox intercepted [X] new items. Fractured and tucked away safely.') to provide system confirmation without cluttering the 2D Force Graph

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a student manually clicks "Add Topic" or types a subject in the UI THEN the system SHALL CONTINUE TO create study_topics with orbit_state = 1 (Active Target/Visible), ensuring high-agency actions result in immediate visibility

3.2 WHEN a student interacts with existing study_topics (clicking, studying, updating mastery) THEN the system SHALL CONTINUE TO function identically, preserving all current Galaxy UI interactions and navigation

3.3 WHEN the webhook creates learning_sources from email attachments THEN the system SHALL CONTINUE TO store file metadata, AI analysis, and extracted text in the learning_sources table without modification

3.4 WHEN the SmartCTA calculates recommended actions THEN the system SHALL evaluate BOTH active topics (orbit_state >= 1) AND quarantined topics (orbit_state = 0). The algorithm must weigh imminent deadlines of items in Quarantine against low-mastery items already in the Active map to determine the absolute highest priority next step

3.5 WHEN a student clicks the SmartCTA to begin a recommended task that is currently in quarantine (orbit_state = 0) THEN the system SHALL trigger a database update (UPDATE study_topics SET orbit_state = 1) immediately before navigating them to the tutor session. This is the exact moment the item safely materializes into their visual Galaxy

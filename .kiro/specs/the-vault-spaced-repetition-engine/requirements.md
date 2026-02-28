# Requirements Document

## Introduction

The Vault is a spaced-repetition memory retention system that implements the SuperMemo-2 (SM-2) algorithm to prevent knowledge decay. It automatically tracks when students are about to forget mastered topics, visually demotes them to "Ghost Nodes", and uses AI-powered active recall testing to reinforce memory. The system mathematically guarantees students never forget mastered material through automated memory-decay algorithms and optimized review intervals.

## Glossary

- **The_Vault**: The spaced-repetition memory retention system
- **SM2_Algorithm**: SuperMemo-2 algorithm for calculating optimal review intervals based on performance
- **Ghost_Node**: A study topic in orbit_state = 3, representing a previously mastered topic whose next_review_date has passed
- **Vault_Queue**: Prioritized list of study topics in orbit_state = 3 requiring review
- **Active_Recall_Spark**: Single-turn AI challenge using Gemini 1.5 Flash to test knowledge retention
- **SRS_Interval**: Number of days until next review (srs_interval_days)
- **Ease_Factor**: SM-2 multiplier controlling interval growth rate (srs_ease_factor)
- **Review_Date**: Timestamp when a topic requires review (next_review_date)
- **Orbit_State**: Visual state of a study topic (2 = Mastered, 3 = Decaying)
- **Smart_CTA**: Call-to-action system that prioritizes student actions
- **Proof_Event**: Historical learning event containing student's original synthesis
- **Galaxy_UI**: The react-force-graph-2d visualization interface

## Requirements

### Requirement 1: Initialize SRS Tracking for Mastered Topics

**User Story:** As a student, I want the system to automatically track my mastered topics, so that I can be reminded to review them before I forget.

#### Acceptance Criteria

1. WHEN a study topic first reaches orbit_state = 2, THE The_Vault SHALL set srs_interval_days to 3
2. WHEN a study topic first reaches orbit_state = 2, THE The_Vault SHALL set srs_ease_factor to 2.5
3. WHEN a study topic first reaches orbit_state = 2, THE The_Vault SHALL set next_review_date to current timestamp plus 3 days
4. WHEN a study topic first reaches orbit_state = 2, THE The_Vault SHALL set srs_reviews_completed to 0

### Requirement 2: Detect Memory Decay

**User Story:** As a student, I want the system to detect when I'm about to forget mastered material, so that I can review it before it's lost.

#### Acceptance Criteria

1. WHEN next_review_date is less than or equal to current timestamp, THE The_Vault SHALL update orbit_state to 3
2. WHEN orbit_state transitions to 3, THE The_Vault SHALL add the study topic to Vault_Queue
3. THE The_Vault SHALL evaluate next_review_date for all topics with orbit_state = 2 at least once per hour

### Requirement 3: Visual Ghost Node Representation

**User Story:** As a student, I want to see which topics are fading from memory, so that I understand what needs review without feeling judged.

#### Acceptance Criteria

1. WHEN a study topic transitions to orbit_state = 3, THE Galaxy_UI SHALL set node opacity to 40 percent
2. WHEN a study topic transitions to orbit_state = 3, THE Galaxy_UI SHALL change node color from Indigo to Silver
3. WHEN a study topic transitions to orbit_state = 3, THE Galaxy_UI SHALL reduce physics gravity so the node drifts toward outer rim
4. THE Galaxy_UI SHALL NOT use Red or Yellow colors for Ghost_Node visualization

### Requirement 4: Prioritize Vault Queue in Smart CTA

**User Story:** As a student, I want to be prompted to review fading memories at the right time, so that I can maintain my knowledge efficiently.

#### Acceptance Criteria

1. WHEN Smart_CTA calculates priority, THE Smart_CTA SHALL query Vault_Queue for topics with orbit_state = 3
2. IF Vault_Queue contains one or more Ghost_Node entries, THEN THE Smart_CTA SHALL present a batched review action
3. THE Smart_CTA SHALL display the count of Ghost_Node entries in the review action message
4. THE Smart_CTA SHALL estimate review time as 3 minutes for the batch
5. THE Smart_CTA SHALL cap the Vault_Queue batch to a maximum of 5 nodes per session

### Requirement 5: Conduct Active Recall Testing

**User Story:** As a student, I want to answer targeted questions about fading topics, so that I can prove I still remember the material.

#### Acceptance Criteria

1. WHEN a student enters The_Vault, THE The_Vault SHALL load a minimal chat interface
2. WHEN a student enters The_Vault, THE The_Vault SHALL use Gemini 1.5 Flash model for AI interactions
3. FOR EACH Ghost_Node in the session batch, THE The_Vault SHALL generate exactly one active recall question
4. WHEN generating a question, THE The_Vault SHALL retrieve historical Proof_Event data for context
5. WHEN generating a question, THE The_Vault SHALL reference the student's original synthesis or analogy
6. WHEN the student submits an answer, THE The_Vault SHALL receive structured JSON response containing passed_recall boolean

### Requirement 6: Calculate SM-2 Intervals for Successful Recall

**User Story:** As a student, I want successful reviews to extend my next review date, so that I spend time efficiently on material I'm actually forgetting.

#### Acceptance Criteria

1. WHEN passed_recall equals true, THE The_Vault SHALL calculate new SRS_Interval as current SRS_Interval multiplied by Ease_Factor rounded up to nearest integer
2. WHEN passed_recall equals true, THE The_Vault SHALL increase Ease_Factor by 0.1
3. WHEN passed_recall equals true, THE The_Vault SHALL set next_review_date to current timestamp plus new SRS_Interval days
4. WHEN passed_recall equals true, THE The_Vault SHALL update orbit_state to 2
5. WHEN passed_recall equals true, THE The_Vault SHALL increment srs_reviews_completed by 1

### Requirement 7: Calculate SM-2 Intervals for Failed Recall

**User Story:** As a student, I want failed reviews to schedule quick follow-up, so that I can relearn material before it's completely forgotten.

#### Acceptance Criteria

1. WHEN passed_recall equals false, THE The_Vault SHALL set SRS_Interval to 1 day
2. WHEN passed_recall equals false, THE The_Vault SHALL decrease Ease_Factor by 0.2
3. WHEN passed_recall equals false, THE The_Vault SHALL ensure Ease_Factor does not fall below 1.3
4. WHEN passed_recall equals false, THE The_Vault SHALL set next_review_date to current timestamp plus 1 day
5. WHEN passed_recall equals false, THE The_Vault SHALL keep orbit_state at 3
6. WHEN passed_recall equals false, THE The_Vault SHALL increment srs_reviews_completed by 1

### Requirement 8: Visual Snap-Back Animation

**User Story:** As a student, I want to see my knowledge being secured when I pass a review, so that I feel accomplished and motivated.

#### Acceptance Criteria

1. WHEN passed_recall equals true, THE Galaxy_UI SHALL animate the Ghost_Node returning to center position
2. WHEN passed_recall equals true, THE Galaxy_UI SHALL animate node opacity from 40 percent to 100 percent
3. WHEN passed_recall equals true, THE Galaxy_UI SHALL animate node color from Silver to Indigo
4. WHEN passed_recall equals true, THE Galaxy_UI SHALL increase physics gravity to pull node toward center
5. THE Galaxy_UI SHALL complete the snap-back animation within 1 second

### Requirement 9: Database Schema Support

**User Story:** As a developer, I want the database to store SRS tracking data, so that the system can persist review schedules across sessions.

#### Acceptance Criteria

1. THE study_topics table SHALL include column srs_interval_days of type INTEGER with default value 0
2. THE study_topics table SHALL include column srs_ease_factor of type NUMERIC with precision 5 and scale 3 with default value 2.500
3. THE study_topics table SHALL include column next_review_date of type TIMESTAMP WITH TIME ZONE
4. THE study_topics table SHALL include column srs_reviews_completed of type INTEGER with default value 0
5. THE study_topics table SHALL include index idx_study_topics_review_date on column next_review_date

### Requirement 10: Performance and Cost Optimization

**User Story:** As a system administrator, I want The Vault to respond quickly and cost-effectively, so that students have a smooth experience and operational costs remain low.

#### Acceptance Criteria

1. WHEN conducting Active_Recall_Spark, THE The_Vault SHALL use Gemini 1.5 Flash model exclusively
2. WHEN a student submits an answer, THE The_Vault SHALL receive AI response within 2 seconds at 95th percentile
3. THE The_Vault SHALL process a complete 5-node Vault session within 3 minutes
4. THE The_Vault SHALL limit each Active_Recall_Spark to exactly one question per Ghost_Node

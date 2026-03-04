# Requirements Document

## Introduction

The LMS Autonomy Engine transforms ForgeStudy from a manual AI tool into an autonomous studying engine by establishing direct connectivity with Learning Management Systems (Canvas and Google Classroom). This feature implements a "Dual-Intake Architecture" that maintains the manual Airlock as a permanent fallback to survive strict school IT firewalls while enabling automated assignment synchronization for students whose schools allow API access.

The system must comply with COPPA regulations by requiring parent authorization for all LMS connections, provide clear status visibility to students, and maintain the existing manual upload workflow as a first-class citizen rather than a degraded fallback.

## Glossary

- **LMS**: Learning Management System (Canvas or Google Classroom)
- **Airlock**: The existing manual file upload interface at /uploads
- **Dual-Intake Architecture**: System design supporting both automated LMS sync and manual file uploads simultaneously
- **Parent_Dashboard**: Secure parent interface for managing student settings and authorizations
- **Student_Dashboard**: Student interface showing sync status and upload options
- **Assignment_Sync_Service**: Backend service responsible for retrieving assignments from LMS APIs
- **Integration_Panel**: UI component in Parent Dashboard for managing LMS connections
- **Status_Indicator**: UI component showing real-time LMS sync status
- **COPPA**: Children's Online Privacy Protection Act requiring parental consent for minors
- **Canvas_PAT**: Canvas Personal Access Token for API authentication
- **GC_Test_Mode**: Google Classroom API in Test Mode with manual user whitelisting
- **Beta_Cohort**: Initial group of users testing LMS integration features

## Requirements

### Requirement 1: Technical Spike - LMS Integration Path Research

**User Story:** As a product team, I want to evaluate the fastest path to MVP for LMS integration, so that I can make an informed decision on implementation approach for the Beta Cohort.

#### Acceptance Criteria

1. THE Technical_Spike SHALL evaluate unified EdTech API providers (Edlink.com and Merge.dev) for startup tier pricing and feature availability
2. THE Technical_Spike SHALL evaluate a hacker MVP approach using Canvas Personal Access Tokens and Google Classroom Test Mode
3. THE Technical_Spike SHALL document the ability of each path to retrieve student assignments and PDF attachments
4. THE Technical_Spike SHALL document the authentication complexity for parents and students in each path
5. THE Technical_Spike SHALL document the firewall compatibility of each path
6. THE Technical_Spike SHALL document the estimated implementation timeline for each path
7. THE Technical_Spike SHALL produce a written recommendation identifying which path achieves reliable data retrieval fastest for the Beta Cohort
8. THE Technical_Spike SHALL document the cost implications for each path at Beta Cohort scale

### Requirement 2: Parent Authorization for LMS Connections

**User Story:** As a parent, I want to authorize ForgeStudy to connect to my child's LMS accounts, so that the system can automatically sync their assignments while maintaining COPPA compliance.

#### Acceptance Criteria

1. THE Parent_Dashboard SHALL display an Integration_Panel within each student's profile settings
2. THE Integration_Panel SHALL provide connection controls for Canvas LMS
3. THE Integration_Panel SHALL provide connection controls for Google Classroom
4. WHEN a parent initiates an LMS connection, THE Integration_Panel SHALL display legal authorization text stating "By connecting these accounts, I authorize ForgeStudy to sync my child's educational data to generate personalized study materials"
5. THE Integration_Panel SHALL require explicit parent confirmation before establishing any LMS connection
6. WHERE Canvas is selected, THE Integration_Panel SHALL provide an input field for Canvas Personal Access Token
7. WHERE Google Classroom is selected, THE Integration_Panel SHALL provide OAuth authentication flow
8. WHEN an LMS connection is successfully established, THE Integration_Panel SHALL display connection status with timestamp
9. THE Integration_Panel SHALL allow parents to disconnect LMS integrations at any time
10. THE Integration_Panel SHALL use glassmorphic styling consistent with the Dark Space UI design system (bg-slate-950, backdrop-blur-md, indigo accents)

### Requirement 3: Assignment Synchronization from Canvas

**User Story:** As a student, I want ForgeStudy to automatically retrieve my Canvas assignments, so that I don't have to manually upload them.

#### Acceptance Criteria

1. WHERE Canvas integration is authorized, THE Assignment_Sync_Service SHALL retrieve active assignments from the Canvas API
2. WHEN new assignments are detected, THE Assignment_Sync_Service SHALL download associated PDF attachments
3. THE Assignment_Sync_Service SHALL sync Canvas data at intervals not exceeding 15 minutes
4. WHEN Canvas API returns an authentication error, THE Assignment_Sync_Service SHALL mark the connection as failed and notify the parent
5. WHEN Canvas API is unreachable due to network or firewall restrictions, THE Assignment_Sync_Service SHALL log the failure and retry with exponential backoff
6. THE Assignment_Sync_Service SHALL store the timestamp of the last successful Canvas sync
7. FOR ALL retrieved assignments, THE Assignment_Sync_Service SHALL preserve assignment metadata including title, due date, and description

### Requirement 4: Assignment Synchronization from Google Classroom

**User Story:** As a student, I want ForgeStudy to automatically retrieve my Google Classroom assignments, so that I don't have to manually upload them.

#### Acceptance Criteria

1. WHERE Google Classroom integration is authorized, THE Assignment_Sync_Service SHALL retrieve active coursework from the Google Classroom API
2. WHEN new coursework is detected, THE Assignment_Sync_Service SHALL download associated attachments from Google Drive
3. THE Assignment_Sync_Service SHALL sync Google Classroom data at intervals not exceeding 15 minutes
4. WHEN Google Classroom API returns an authentication error, THE Assignment_Sync_Service SHALL mark the connection as failed and notify the parent
5. WHEN Google Classroom API is unreachable due to network or firewall restrictions, THE Assignment_Sync_Service SHALL log the failure and retry with exponential backoff
6. THE Assignment_Sync_Service SHALL store the timestamp of the last successful Google Classroom sync
7. FOR ALL retrieved coursework, THE Assignment_Sync_Service SHALL preserve coursework metadata including title, due date, and description

### Requirement 5: Dual-Intake Student Interface

**User Story:** As a student, I want to see my LMS sync status and still be able to manually upload files, so that I have a reliable way to get my assignments into ForgeStudy regardless of school firewall restrictions.

#### Acceptance Criteria

1. THE Student_Dashboard SHALL display a Status_Indicator at the top of the /uploads page
2. WHERE Canvas is connected and syncing successfully, THE Status_Indicator SHALL display "🟢 Canvas: Synced [X] mins ago. [N] new assignments found"
3. WHERE Google Classroom is connected and syncing successfully, THE Status_Indicator SHALL display "🟢 Google Classroom: Synced [X] mins ago. [N] new assignments found"
4. WHERE an LMS connection has failed, THE Status_Indicator SHALL display "🔴 [LMS_Name]: Connection failed. Using manual upload."
5. WHERE no LMS is connected, THE Status_Indicator SHALL display "Manual upload mode. Ask your parent to connect your school account for auto-sync."
6. THE Student_Dashboard SHALL maintain the existing drag-and-drop file upload interface below the Status_Indicator
7. THE Student_Dashboard SHALL display explanatory text "School blocked the connection? Or have a physical handout? Drop your PDFs and photos here."
8. THE Student_Dashboard SHALL accept manual file uploads regardless of LMS connection status
9. THE Student_Dashboard SHALL use glassmorphic styling consistent with the Dark Space UI design system
10. WHEN both LMS sync and manual uploads are available, THE Student_Dashboard SHALL treat both intake methods as equal-priority options

### Requirement 6: COPPA Compliance for Minor Authorization

**User Story:** As ForgeStudy, I want to ensure that only parents can authorize LMS connections for students under 13, so that the system complies with COPPA regulations.

#### Acceptance Criteria

1. THE System SHALL prevent students from authorizing LMS connections directly
2. THE System SHALL require all LMS connection authorizations to originate from the Parent_Dashboard
3. WHERE a student is under 13 years old, THE System SHALL enforce parent authorization for all LMS connections
4. THE System SHALL maintain an audit log of all parent LMS authorization actions including timestamp and parent identifier
5. THE System SHALL display COPPA-compliant language in the Integration_Panel before connection authorization

### Requirement 7: Graceful Degradation for Firewall Restrictions

**User Story:** As a student whose school blocks LMS API access, I want the system to automatically fall back to manual upload mode, so that I can continue using ForgeStudy without interruption.

#### Acceptance Criteria

1. WHEN the Assignment_Sync_Service detects repeated connection failures indicating firewall blocking, THE System SHALL automatically switch to manual upload mode for that student
2. WHEN switching to manual upload mode, THE System SHALL notify the parent via the Parent_Dashboard
3. THE System SHALL continue to display the manual upload interface with full functionality when LMS sync is blocked
4. THE System SHALL periodically retry LMS connections to detect when firewall restrictions are lifted
5. WHEN LMS connectivity is restored after a firewall block, THE System SHALL notify the parent and resume automatic syncing

### Requirement 8: Assignment Deduplication

**User Story:** As a student, I want the system to avoid creating duplicate assignments when I both receive an auto-synced assignment and manually upload the same file, so that my study queue remains clean.

#### Acceptance Criteria

1. WHEN an assignment is retrieved via LMS sync, THE System SHALL generate a unique identifier based on LMS assignment ID
2. WHEN a file is manually uploaded, THE System SHALL attempt to match it against existing synced assignments using title and due date
3. WHERE a manual upload matches an existing synced assignment, THE System SHALL merge them into a single assignment entry
4. THE System SHALL preserve both the synced metadata and the manually uploaded file when merging duplicates
5. THE System SHALL display a visual indicator when an assignment has both synced and manual sources

### Requirement 9: Parent Notification for Sync Events

**User Story:** As a parent, I want to receive notifications about LMS sync status changes, so that I can take action if the connection fails.

#### Acceptance Criteria

1. WHEN an LMS connection is successfully established, THE System SHALL send a confirmation notification to the parent
2. WHEN an LMS connection fails authentication, THE System SHALL send a notification to the parent with troubleshooting guidance
3. WHEN an LMS connection is blocked by a firewall, THE System SHALL send a notification to the parent explaining the fallback to manual mode
4. WHEN an LMS connection is restored after failure, THE System SHALL send a notification to the parent
5. THE System SHALL allow parents to configure notification preferences for LMS sync events in the Parent_Dashboard

### Requirement 10: Integration Panel Visual Design

**User Story:** As a parent, I want the School Integrations panel to be visually consistent with ForgeStudy's design system, so that the interface feels cohesive and professional.

#### Acceptance Criteria

1. THE Integration_Panel SHALL use a glassmorphic card design with backdrop-blur-md effect
2. THE Integration_Panel SHALL use bg-slate-950 as the base background color
3. THE Integration_Panel SHALL use bg-indigo-600 for primary action buttons
4. THE Integration_Panel SHALL display the title "School Integrations & Data Sync"
5. THE Integration_Panel SHALL use frosted glass effects consistent with the Dark Space UI design system
6. THE Integration_Panel SHALL display LMS provider logos (Canvas and Google Classroom) with appropriate spacing
7. THE Integration_Panel SHALL use smooth transitions when toggling between connected and disconnected states
8. THE Integration_Panel SHALL be responsive and functional on mobile devices


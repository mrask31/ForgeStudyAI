# Requirements Document: Proof Engine

## Introduction

The Proof Engine is ForgeStudy's core differentiator that ensures students genuinely understand concepts before progressing. Unlike traditional tutoring systems that accept passive acknowledgment ("got it"), the Proof Engine requires students to actively demonstrate understanding by explaining concepts in their own words. The system uses AI-powered validation to assess comprehension depth, adapts teaching strategies based on performance, and provides parents with concrete evidence of learning progress.

## Glossary

- **Proof_Engine**: The AI-powered system that validates student understanding through explain-back checkpoints
- **Proof_Checkpoint**: A point in the tutoring conversation where the student must explain a concept back
- **Explain_Back_Prompt**: A contextual question asking the student to demonstrate understanding in their own words
- **Understanding_Validator**: The AI component that analyzes student explanations for genuine comprehension
- **Teaching_Exchange**: A single AI tutor response that teaches or explains a concept
- **Proof_Attempt**: A student's response to an explain-back prompt
- **Proof_Event**: A logged record of a proof attempt with its validation result (pass/fail/partial)
- **Adaptive_Response**: The system's next action based on validation results (reteach, guide, or advance)
- **Learning_Receipt**: A summary report of concepts proven and learning progress
- **Anti_Gaming_Detector**: Component that identifies attempts to circumvent genuine understanding validation
- **Response_Quality_Detector**: Component that identifies insufficient or low-quality student responses

## Requirements

### Requirement 1: Adaptive Proof Checkpoint Triggering

**User Story:** As the system, I want to automatically insert proof checkpoints at appropriate intervals based on student performance, so that students are regularly required to demonstrate understanding without creating excessive pressure.

#### Acceptance Criteria

1. WHEN the AI tutor completes a teaching exchange, THE Proof_Engine SHALL increment the teaching exchange counter
2. WHEN a student has passed their last 2 proof attempts, THE Proof_Engine SHALL trigger checkpoints every 2-3 exchanges
3. WHEN a student has failed their last proof attempt, THE Proof_Engine SHALL trigger checkpoints every 4-5 exchanges
4. WHEN a student has mixed performance (some passes, some fails), THE Proof_Engine SHALL trigger checkpoints every 3-4 exchanges
5. WHEN a proof checkpoint is triggered, THE Proof_Engine SHALL reset the teaching exchange counter to zero
6. WHEN a student fails a proof attempt, THE Proof_Engine SHALL NOT count reteaching exchanges toward the next checkpoint
7. WHERE the conversation is in an introductory phase (first 2 exchanges), THE Proof_Engine SHALL NOT trigger proof checkpoints

### Requirement 2: Explain-Back Prompt Generation

**User Story:** As a student, I want to receive clear, contextual prompts that ask me to explain concepts in my own words, so that I understand what is expected of me.

#### Acceptance Criteria

1. WHEN a proof checkpoint is triggered, THE Proof_Engine SHALL generate an explain-back prompt based on the recent teaching content
2. WHEN generating the prompt, THE Proof_Engine SHALL reference specific concepts taught in the last 3-4 exchanges
3. WHEN generating the prompt, THE Proof_Engine SHALL use age-appropriate language matching the student's grade level
4. THE Explain_Back_Prompt SHALL explicitly request explanation in the student's own words
5. THE Explain_Back_Prompt SHALL NOT be answerable with simple yes/no responses

### Requirement 3: Understanding Validation

**User Story:** As the system, I want to accurately assess whether a student genuinely understands a concept, so that I can make appropriate decisions about their learning progression.

#### Acceptance Criteria

1. WHEN a student submits a proof attempt, THE Understanding_Validator SHALL analyze the response for key concept presence
2. WHEN analyzing the response, THE Understanding_Validator SHALL verify correct relationships between concepts
3. WHEN analyzing the response, THE Understanding_Validator SHALL detect if the student is parroting exact phrases from teaching content
4. WHEN analyzing the response, THE Understanding_Validator SHALL assess depth appropriate to the student's grade level
5. WHEN validation is complete, THE Understanding_Validator SHALL classify the attempt as pass, fail, or partial
6. THE Understanding_Validator SHALL complete analysis within 3 seconds

### Requirement 4: Adaptive Response System

**User Story:** As a student, I want the tutor to respond appropriately to my explanation quality, so that I receive the right level of support for my understanding.

#### Acceptance Criteria

1. WHEN a proof attempt is classified as pass, THE Proof_Engine SHALL acknowledge mastery and advance to the next concept
2. WHEN a proof attempt is classified as fail, THE Proof_Engine SHALL reteach the concept using a different pedagogical approach
3. WHEN a proof attempt is classified as partial, THE Proof_Engine SHALL provide targeted hints and ask clarifying questions
4. WHEN reteaching after a failed attempt, THE Proof_Engine SHALL use different examples or explanations than the original teaching
5. WHEN a student passes a proof checkpoint, THE Proof_Engine SHALL log the achievement for parent visibility

### Requirement 5: Proof Event Logging

**User Story:** As a parent, I want to see concrete evidence of which concepts my child has proven they understand, so that I have confidence in their learning progress.

#### Acceptance Criteria

1. WHEN a proof attempt is submitted, THE Proof_Engine SHALL create a proof event record
2. WHEN creating a proof event, THE Proof_Engine SHALL store the concept being tested, attempt text, validation result, and timestamp
3. WHEN a proof event is created, THE Proof_Engine SHALL associate it with the current chat session
4. WHEN a proof event is created, THE Proof_Engine SHALL make it available for parent dashboard queries
5. THE Proof_Engine SHALL persist proof events to the database immediately upon creation

### Requirement 6: Insufficient Response Detection

**User Story:** As the system, I want to detect when student responses lack genuine explanation, so that I can guide them toward demonstrating real understanding.

#### Acceptance Criteria

1. WHEN analyzing a proof attempt, THE Understanding_Validator SHALL identify responses that closely match teaching exchange text
2. WHEN analyzing a proof attempt, THE Understanding_Validator SHALL detect keyword lists without coherent explanation
3. WHEN analyzing a proof attempt, THE Understanding_Validator SHALL identify vague acknowledgments (e.g., "I understand it") without substantive content
4. WHEN insufficient explanation is detected, THE Proof_Engine SHALL classify the attempt as fail and provide instructional guidance
5. WHEN insufficient explanation is detected, THE Proof_Engine SHALL use supportive language that encourages genuine explanation (e.g., "I need to hear this in your words so I know how to help you")

### Requirement 7: Grade-Level Adaptation

**User Story:** As a student, I want proof checkpoints to match my grade level expectations, so that validation is fair and appropriate for my developmental stage.

#### Acceptance Criteria

1. WHEN validating a middle school student's response, THE Understanding_Validator SHALL accept simpler explanations with basic concept connections
2. WHEN validating a high school student's response, THE Understanding_Validator SHALL require deeper analysis and more sophisticated reasoning
3. WHEN generating explain-back prompts, THE Proof_Engine SHALL adjust complexity based on student grade level
4. THE Proof_Engine SHALL retrieve student grade level from the user profile before validation

### Requirement 8: Parent Dashboard Integration

**User Story:** As a parent, I want to view my child's proof achievements in the dashboard, so that I can monitor their genuine learning progress.

#### Acceptance Criteria

1. WHEN a parent views the dashboard, THE system SHALL display a list of concepts the student has proven they understand
2. WHEN displaying proof events, THE system SHALL show the concept name, date proven, and validation result (pass/partial/retry)
3. WHEN a student achieves a proof milestone (e.g., 5 concepts proven), THE system SHALL notify the parent
4. WHEN viewing proof history, THE system SHALL distinguish between passed, partial, and retry attempts
5. THE system SHALL display proof events in reverse chronological order

### Requirement 9: Learning Receipt Generation

**User Story:** As a parent, I want learning receipts to include proof summaries, so that I have comprehensive documentation of my child's verified understanding.

#### Acceptance Criteria

1. WHEN generating a learning receipt, THE system SHALL include a section listing all concepts proven during the session
2. WHEN listing proven concepts, THE system SHALL include the timestamp and validation result (pass/partial/retry)
3. WHEN no concepts were proven in a session, THE system SHALL indicate this in the learning receipt
4. THE system SHALL include the total number of proof attempts and pass rate in the learning receipt

### Requirement 10: Conversation Flow Integration

**User Story:** As a student, I want understanding checks to feel natural within the tutoring conversation, so that they enhance rather than disrupt my learning experience.

#### Acceptance Criteria

1. WHEN inserting a proof checkpoint, THE Proof_Engine SHALL use conversational transitions that maintain flow
2. WHEN a student passes a checkpoint, THE Proof_Engine SHALL celebrate the achievement before continuing
3. WHEN a student needs to retry a checkpoint, THE Proof_Engine SHALL provide encouragement along with reteaching
4. THE Proof_Engine SHALL NOT interrupt mid-concept explanations with proof checkpoints
5. WHEN a proof checkpoint is appropriate, THE Proof_Engine SHALL complete the current teaching point before triggering

### Requirement 11: Student Progress Visibility

**User Story:** As a student, I want to see my proof achievements during the session, so that I have a sense of momentum and orientation in my learning journey.

#### Acceptance Criteria

1. WHEN a student passes a proof checkpoint, THE Proof_Engine SHALL display the number of concepts proven in the current session
2. WHEN a student completes a topic, THE Proof_Engine SHALL acknowledge that the topic is now solid for them
3. WHEN approaching the next checkpoint, THE Proof_Engine SHALL optionally indicate progress toward the next understanding check
4. THE Proof_Engine SHALL present progress information as reassurance and orientation, not as gamification
5. THE Proof_Engine SHALL NOT display progress information in a way that creates pressure or anxiety

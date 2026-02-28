# Implementation Plan: Dark Space UI Completion

## Overview

This implementation plan converts the remaining legacy V1 pages (/readiness, /help, /settings) to Dark Space UI and implements a Focus Panel slide-over drawer for seamless Galaxy-to-tutoring workflow. The approach follows a phased strategy: start with low-risk page conversions, build the Focus Panel foundation, integrate chat functionality, and finish with testing and polish.

## Tasks

### Phase 1: Page Conversions

- [x] 1. Convert Help page to Dark Space UI
  - [x] 1.1 Update Help page background and remove white wrapper
    - Replace gradient background with bg-slate-950
    - Remove massive white wrapper container
    - Let content breathe on dark canvas
    - _Requirements: 2.1, 2.2, 2.6_
  
  - [x] 1.2 Convert Help page cards to glassmorphic styling
    - Replace all bg-white cards with bg-slate-900/60 backdrop-blur-md
    - Add border border-slate-800 shadow-xl rounded-2xl
    - Update section cards to use bg-slate-900/40
    - _Requirements: 2.3_
  
  - [x] 1.3 Update Help page text and accent colors
    - Replace text-slate-900 with text-slate-200 for headers
    - Replace text-slate-600 with text-slate-400 for body text
    - Replace text-emerald-600 with text-indigo-400 for accents
    - Replace border-slate-200 with border-slate-800
    - _Requirements: 2.4, 2.5_
  
  - [ ]* 1.4 Write unit tests for Help page styling
    - Test Dark Space background rendering
    - Test content preservation
    - _Requirements: 10.2_

- [x] 2. Convert Settings page to Dark Space UI
  - [x] 2.1 Update Settings page background
    - Replace gradient background (from-slate-50 via-emerald-50) with bg-slate-950
    - _Requirements: 3.1, 3.3_
  
  - [x] 2.2 Convert Settings page cards to glassmorphic styling
    - Replace bg-white/80 cards with bg-slate-900/60 backdrop-blur-md
    - Add border border-slate-800 shadow-xl rounded-2xl
    - _Requirements: 3.2_
  
  - [x] 2.3 Update Settings page buttons and text colors
    - Replace gradient buttons (from-teal-700 to-teal-600) with bg-indigo-600 hover:bg-indigo-500
    - Replace border-teal-300 with border-indigo-500/30
    - Update text-slate-900 to text-slate-200 for headers
    - Update text-slate-600 to text-slate-400 for descriptions
    - Replace text-emerald-600 with text-indigo-400
    - _Requirements: 3.4, 3.5_
  
  - [ ]* 2.4 Write unit tests for Settings page functionality
    - Test logout functionality preservation
    - Test density toggle preservation
    - Test Dark Space styling
    - _Requirements: 3.6, 10.3_

- [x] 3. Convert Readiness page to Dark Space UI
  - [x] 3.1 Update Readiness page background
    - Replace gradient background (from-slate-50 via-emerald-50/20) with bg-slate-950
    - _Requirements: 1.1, 1.6_
  
  - [x] 3.2 Convert Readiness page cards to glassmorphic styling
    - Replace bg-white/80 cards with bg-slate-900/60 backdrop-blur-md
    - Remove border-l-4 border-l-emerald-500 styling
    - Add border border-slate-800 shadow-xl rounded-2xl
    - _Requirements: 1.2_
  
  - [x] 3.3 Update Readiness page buttons and interactive elements
    - Replace gradient buttons (from-emerald-600 to-green-600) with bg-indigo-600 hover:bg-indigo-500
    - Replace text-emerald-600 with text-indigo-400 for active states
    - Replace border-emerald-200 with border-indigo-500/30
    - _Requirements: 1.3, 1.4_
  
  - [x] 3.4 Update Readiness page text colors
    - Replace text-slate-900 with text-slate-200 for headers
    - Replace text-slate-600 with text-slate-400 for descriptions
    - _Requirements: 1.5_
  
  - [ ]* 3.5 Write unit tests for Readiness page data display
    - Test study signals rendering
    - Test focus areas rendering
    - Test learning library functionality
    - Test Dark Space styling
    - _Requirements: 10.1_

- [ ] 4. Checkpoint - Verify page conversions
  - Ensure all three pages use consistent Dark Space styling
  - Verify no white cards, teal buttons, or gray gradients remain
  - Test all existing functionality works correctly
  - Ask the user if questions arise

### Phase 2: Focus Panel Foundation

- [ ] 5. Create FocusPanel component structure
  - [ ] 5.1 Create FocusPanel component file and basic structure
    - Create src/components/galaxy/FocusPanel.tsx
    - Define FocusPanelProps interface (isOpen, topicId, topicTitle, onClose)
    - Implement slide-over drawer container with fixed positioning
    - _Requirements: 4.1, 4.2_
  
  - [ ] 5.2 Implement FocusPanel Dark Space styling
    - Add bg-slate-950/95 backdrop-blur-2xl styling
    - Add border-l border-slate-800 shadow-2xl
    - Set z-50 for proper layering
    - _Requirements: 4.3_
  
  - [ ] 5.3 Implement FocusPanel slide animation
    - Add transition-transform duration-300 ease-in-out
    - Implement translate-x-full (closed) to translate-x-0 (open) states
    - _Requirements: 4.4_
  
  - [ ] 5.4 Implement FocusPanel responsive width
    - Add w-full for mobile (<768px)
    - Add md:w-[450px] for tablet (768px-1023px)
    - Add lg:w-[500px] for desktop (1024px+)
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 5.5 Create FocusPanel header with close button
    - Add header with border-b border-slate-800
    - Display topic title with text-slate-200
    - Add close button with X icon and onClick handler
    - _Requirements: 4.5_
  
  - [ ]* 5.6 Write unit tests for FocusPanel component
    - Test panel renders when isOpen is true
    - Test panel hidden when isOpen is false
    - Test close button calls onClose handler
    - Test responsive width classes
    - _Requirements: 4.6, 8.5_

- [ ] 6. Integrate FocusPanel into ConceptGalaxy
  - [ ] 6.1 Add Focus Panel state to ConceptGalaxy
    - Define FocusPanelState interface
    - Add useState hook for Focus Panel state
    - Initialize with isOpen: false, selectedTopicId: null, selectedTopicTitle: null
    - _Requirements: 7.1_
  
  - [ ] 6.2 Modify handleNodeClick to support Focus Panel
    - Check if Weave Mode is active or Shift key is pressed
    - If true: Continue constellation selection behavior
    - If false: Update Focus Panel state with topic info
    - _Requirements: 4.1, 4.7_
  
  - [ ] 6.3 Implement handleCloseFocusPanel function
    - Reset Focus Panel state to closed
    - Clear selected topic data
    - _Requirements: 4.6, 7.1_
  
  - [ ] 6.4 Render FocusPanel in ConceptGalaxy component
    - Add FocusPanel component to render tree
    - Pass isOpen, topicId, topicTitle, and onClose props
    - Ensure panel overlays Galaxy without blocking Weave Mode toggle
    - _Requirements: 7.5_
  
  - [ ]* 6.5 Write integration tests for Galaxy-FocusPanel interaction
    - Test Focus Panel opens on star click when Weave Mode is off
    - Test Focus Panel does not open when Weave Mode is active
    - Test Galaxy remains interactive after panel closes
    - Test Weave Mode toggle remains accessible
    - _Requirements: 7.1, 10.4, 10.5_

- [ ] 7. Checkpoint - Verify Focus Panel foundation
  - Test Focus Panel slides in/out smoothly
  - Verify responsive behavior on different screen sizes
  - Ensure Galaxy interactions are preserved
  - Ask the user if questions arise

### Phase 3: Chat Integration

- [ ] 8. Create FocusPanelChat wrapper component
  - [ ] 8.1 Create FocusPanelChat component file and structure
    - Create src/components/galaxy/FocusPanelChat.tsx
    - Define FocusPanelChatProps interface (topicId, topicTitle)
    - Add state for sessionId and isInitializing
    - _Requirements: 5.1_
  
  - [ ] 8.2 Implement chat session initialization
    - Create useEffect to initialize session on mount
    - Call /api/chats/resolve with intent: 'new_question', topicId, topicTitle
    - Store returned chatId in sessionId state
    - Handle initialization loading state
    - _Requirements: 5.3_
  
  - [ ] 8.3 Handle session initialization errors
    - Add try-catch for API call failures
    - Display error message in panel
    - Provide retry or close options
    - _Requirements: 5.3_
  
  - [ ] 8.4 Integrate ChatInterface component
    - Wrap ChatInterface with TutorProvider
    - Pass sessionId, mode: 'focus-panel', topicId, topicTitle props
    - Ensure chat functions identically to /tutor page
    - _Requirements: 5.1, 5.4_
  
  - [ ]* 8.5 Write unit tests for FocusPanelChat
    - Test session initialization on mount
    - Test error handling for failed session creation
    - Test ChatInterface receives correct props
    - _Requirements: 5.2, 5.3_

- [ ] 9. Style chat messages for Dark Space UI
  - [ ] 9.1 Update AI message styling in ChatInterface
    - Apply bg-slate-900 border border-slate-800 text-slate-300
    - Apply rounded-2xl rounded-tl-none
    - _Requirements: 6.1_
  
  - [ ] 9.2 Update student message styling in ChatInterface
    - Apply bg-indigo-600/20 border border-indigo-500/30 text-indigo-100
    - Apply rounded-2xl rounded-tr-none
    - _Requirements: 6.2_
  
  - [ ] 9.3 Update input bar styling
    - Apply bg-slate-950 border-t border-slate-800
    - Fix to bottom of Focus Panel
    - _Requirements: 6.3_
  
  - [ ] 9.4 Update input field styling
    - Apply bg-slate-900 border border-slate-700 text-slate-200 rounded-xl
    - Apply focus:border-indigo-500
    - _Requirements: 6.4_
  
  - [ ] 9.5 Update send button styling
    - Apply bg-indigo-600 hover:bg-indigo-500 text-white
    - _Requirements: 6.5_

- [ ] 10. Implement Focus Panel state management
  - [ ] 10.1 Handle topic switching in Focus Panel
    - When new star is clicked while panel is open, close current session
    - Open new session with new topic
    - _Requirements: 7.3_
  
  - [ ] 10.2 Ensure chat session persistence
    - Verify chat messages persist while panel is open
    - Verify chat session saved to history when panel closes
    - _Requirements: 5.5, 7.2_
  
  - [ ] 10.3 Verify Focus Panel does not navigate
    - Ensure browser URL remains on Galaxy page
    - Ensure no route changes occur during Focus Panel interactions
    - _Requirements: 7.4_
  
  - [ ]* 10.4 Write integration tests for chat state management
    - Test chat messages persist during session
    - Test chat session saved to history on close
    - Test topic switching closes and reopens session
    - Test URL remains unchanged
    - _Requirements: 5.5, 7.2, 7.3, 7.4_

- [ ] 11. Checkpoint - Verify chat integration
  - Test chat session creation works correctly
  - Verify messages send and display properly
  - Ensure chat history is preserved
  - Ask the user if questions arise

### Phase 4: Testing and Polish

- [ ] 12. Implement accessibility features
  - [ ] 12.1 Add semantic HTML and ARIA attributes to FocusPanel
    - Use role="dialog" and aria-modal="true"
    - Add aria-labelledby for panel title
    - Add aria-label for close button
    - _Requirements: 4.5_
  
  - [ ] 12.2 Implement focus management
    - Trap focus within panel when open
    - Restore focus to trigger element when closed
    - Support Escape key to close panel
    - _Requirements: 4.6_
  
  - [ ] 12.3 Verify keyboard navigation
    - Test all buttons are keyboard accessible
    - Verify tab order is logical
    - Ensure focus indicators are visible
    - _Requirements: 8.5_

- [ ] 13. Verify responsive behavior
  - [ ] 13.1 Test Focus Panel on mobile devices
    - Verify full-width display on screens <768px
    - Test scrollable content when exceeding viewport height
    - Verify close button remains accessible
    - _Requirements: 8.1, 8.4, 8.5_
  
  - [ ] 13.2 Test Focus Panel on tablet devices
    - Verify 450px width on screens 768px-1023px
    - Test scrollable content
    - _Requirements: 8.2, 8.4_
  
  - [ ] 13.3 Test Focus Panel on desktop devices
    - Verify 500px width on screens 1024px+
    - Test scrollable content
    - _Requirements: 8.3, 8.4_

- [ ] 14. Validate visual cohesion across all pages
  - [ ] 14.1 Verify Readiness page Dark Space compliance
    - Check no white cards remain
    - Check no teal/emerald buttons remain
    - Check no gray gradients remain
    - Verify glassmorphic card styling is consistent
    - _Requirements: 9.1, 9.4_
  
  - [ ] 14.2 Verify Help page Dark Space compliance
    - Check no white cards remain
    - Check no teal/emerald buttons remain
    - Check no gray gradients remain
    - Verify glassmorphic card styling is consistent
    - _Requirements: 9.2, 9.4_
  
  - [ ] 14.3 Verify Settings page Dark Space compliance
    - Check no white cards remain
    - Check no teal/emerald buttons remain
    - Check no gray gradients remain
    - Verify glassmorphic card styling is consistent
    - _Requirements: 9.3, 9.4_
  
  - [ ] 14.4 Verify indigo brand colors across all pages
    - Check all interactive elements use indigo colors
    - Verify consistency across Readiness, Help, Settings pages
    - _Requirements: 9.5_

- [ ] 15. Performance optimization
  - [ ] 15.1 Optimize FocusPanel rendering
    - Wrap FocusPanel with React.memo
    - Lazy load ChatInterface only when panel opens
    - Use Suspense with loading fallback
    - _Requirements: 10.5_
  
  - [ ] 15.2 Verify Galaxy performance
    - Test Focus Panel does not affect Galaxy physics simulation
    - Verify animations remain smooth
    - Check no unnecessary re-renders occur
    - _Requirements: 10.5_

- [ ] 16. Final checkpoint - Complete testing
  - Run all unit tests and verify they pass
  - Test end-to-end workflow: Galaxy → Focus Panel → Chat → Close
  - Verify all requirements are met
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Phase 1 (Page Conversions) can be completed independently and deployed first
- Phase 2 (Focus Panel Foundation) builds the UI shell without chat functionality
- Phase 3 (Chat Integration) adds the core tutoring functionality
- Phase 4 (Testing and Polish) ensures quality and accessibility
- The phased approach minimizes risk and enables incremental testing

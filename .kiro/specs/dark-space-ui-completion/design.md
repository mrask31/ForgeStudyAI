# Design Document: Dark Space UI Completion

## Overview

This design document specifies the technical implementation for completing the Dark Space UI transformation across ForgeStudy. The feature encompasses two major components:

1. **Page Conversions**: Converting the /readiness, /help, and /settings pages from Legacy V1 UI (white cards, teal/emerald accents) to Dark Space UI (bg-slate-950, glassmorphic cards, indigo accents)
2. **Focus Panel**: Implementing a slide-over drawer component that integrates the Socratic Chat interface into the Galaxy visualization, enabling students to access AI tutoring without leaving the Galaxy view

The Dark Space UI aesthetic is characterized by:
- Deep space backgrounds (bg-slate-950)
- Glassmorphic cards with semi-transparency (bg-slate-900/60 with backdrop-blur-md)
- Indigo brand colors for interactive elements (bg-indigo-600, text-indigo-400)
- Subtle borders and shadows (border-slate-800, shadow-xl)
- Light text on dark backgrounds (text-slate-200 for headers, text-slate-400 for body)

This transformation achieves visual cohesion across all sidebar navigation destinations and provides seamless Galaxy-to-tutoring workflow integration.

## Architecture

### System Components

The implementation involves modifications to existing pages and the creation of new components:

**Existing Pages (Modifications)**:
- `src/app/(app)/readiness/page.tsx` - Learning dashboard with study signals
- `src/app/(app)/help/page.tsx` - Help documentation page
- `src/app/(app)/settings/page.tsx` - User settings and account management

**New Components**:
- `src/components/galaxy/FocusPanel.tsx` - Slide-over drawer container
- `src/components/galaxy/FocusPanelChat.tsx` - Chat interface wrapper for Focus Panel context

**Modified Components**:
- `src/components/galaxy/ConceptGalaxy.tsx` - Add Focus Panel integration and state management

### Component Hierarchy

```
ConceptGalaxy (Modified)
├── ForceGraph2D (Existing)
├── Weave Mode Toggle (Existing)
├── Loom Dock (Existing)
└── FocusPanel (New)
    ├── Panel Header
    │   ├── Topic Title
    │   └── Close Button
    └── FocusPanelChat (New)
        ├── ChatInterface (Reused from /tutor)
        └── Message List
```


### State Management Strategy

The Focus Panel introduces new state that must be managed within the Galaxy component:

**Focus Panel State**:
```typescript
interface FocusPanelState {
  isOpen: boolean;              // Panel visibility
  selectedTopicId: string | null;  // Currently selected topic
  selectedTopicTitle: string | null; // Topic display name
  chatSessionId: string | null;    // Active chat session
}
```

**State Flow**:
1. User clicks Galaxy star (when Weave Mode is off)
2. `handleNodeClick` updates Focus Panel state with topic info
3. Focus Panel slides in from right
4. FocusPanelChat initializes new chat session with topic context
5. User interacts with chat (state managed by TutorContext)
6. User clicks close button → Panel slides out, chat session saved to history

**State Persistence**:
- Chat messages are persisted via existing chat API (`/api/chats/*`)
- Focus Panel state is ephemeral (resets on page navigation)
- Last active chat can be resumed via existing chat resolution logic

### Integration Points

**Galaxy Component Integration**:
- Modify `handleNodeClick` to check Weave Mode state
- If Weave Mode off: Open Focus Panel instead of navigating to /tutor
- If Weave Mode on: Continue existing constellation selection behavior

**Chat System Integration**:
- Reuse existing `ChatInterface` component from `/tutor` page
- Leverage `TutorContext` for chat state management
- Use existing chat API endpoints (`/api/chat/route.ts`)
- Maintain compatibility with chat history and session management

**Routing Integration**:
- Focus Panel does NOT change URL (stays on Galaxy page)
- Chat sessions are created via API, not route navigation
- Closing panel preserves Galaxy state and URL

## Components and Interfaces

### FocusPanel Component

**Purpose**: Slide-over drawer container that overlays the Galaxy visualization

**Props**:
```typescript
interface FocusPanelProps {
  isOpen: boolean;
  topicId: string | null;
  topicTitle: string | null;
  onClose: () => void;
}
```

**Styling**:
- Fixed positioning: `fixed inset-y-0 right-0 z-50`
- Responsive width: `w-full md:w-[450px] lg:w-[500px]`
- Dark Space aesthetic: `bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl`
- Slide animation: `transition-transform duration-300 ease-in-out`
- Transform states: `translate-x-full` (closed) → `translate-x-0` (open)

**Structure**:
```tsx
<div className={`fixed inset-y-0 right-0 z-50 w-full md:w-[450px] lg:w-[500px] 
                 bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl
                 transition-transform duration-300 ease-in-out
                 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
  {/* Header */}
  <div className="border-b border-slate-800 p-4 flex items-center justify-between">
    <h2 className="text-lg font-semibold text-slate-200">{topicTitle}</h2>
    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
      <X className="w-5 h-5" />
    </button>
  </div>
  
  {/* Chat Content */}
  <div className="h-[calc(100vh-64px)] overflow-hidden">
    <FocusPanelChat topicId={topicId} topicTitle={topicTitle} />
  </div>
</div>
```


### FocusPanelChat Component

**Purpose**: Wrapper component that adapts the existing ChatInterface for Focus Panel context

**Props**:
```typescript
interface FocusPanelChatProps {
  topicId: string | null;
  topicTitle: string | null;
}
```

**Responsibilities**:
1. Initialize chat session with topic context
2. Wrap ChatInterface with TutorProvider
3. Handle session creation via `/api/chats/resolve`
4. Pass topic metadata to chat system

**Implementation Strategy**:
```tsx
export function FocusPanelChat({ topicId, topicTitle }: FocusPanelChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function initializeSession() {
      if (!topicId) return;
      
      // Create new chat session with topic context
      const response = await fetch('/api/chats/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'new_question',
          topicId,
          topicTitle,
        }),
      });
      
      const { chatId } = await response.json();
      setSessionId(chatId);
      setIsInitializing(false);
    }
    
    initializeSession();
  }, [topicId, topicTitle]);

  if (isInitializing) {
    return <LoadingState />;
  }

  return (
    <TutorProvider>
      <ChatInterface 
        sessionId={sessionId}
        mode="focus-panel"
        topicId={topicId}
        topicTitle={topicTitle}
      />
    </TutorProvider>
  );
}
```

### Modified ConceptGalaxy Component

**Changes Required**:

1. **Add Focus Panel State**:
```typescript
const [focusPanelState, setFocusPanelState] = useState<FocusPanelState>({
  isOpen: false,
  selectedTopicId: null,
  selectedTopicTitle: null,
  chatSessionId: null,
});
```

2. **Modify handleNodeClick**:
```typescript
const handleNodeClick = (node: any, event: MouseEvent) => {
  // Check if Weave Mode is active OR Shift key is pressed
  if (isWeaveModeActive || event.shiftKey) {
    handleConstellationSelection(node);
  } else {
    // Open Focus Panel instead of navigating
    setFocusPanelState({
      isOpen: true,
      selectedTopicId: node.id,
      selectedTopicTitle: node.name,
      chatSessionId: null,
    });
  }
};
```

3. **Add Close Handler**:
```typescript
const handleCloseFocusPanel = () => {
  setFocusPanelState({
    isOpen: false,
    selectedTopicId: null,
    selectedTopicTitle: null,
    chatSessionId: null,
  });
};
```

4. **Render Focus Panel**:
```tsx
return (
  <div ref={containerRef} className="w-full h-full relative overflow-hidden">
    <ForceGraph2D {...graphProps} />
    
    {/* Existing UI elements */}
    <WeaveModeToggle />
    {showLoomDock && <LoomDock />}
    
    {/* New Focus Panel */}
    <FocusPanel
      isOpen={focusPanelState.isOpen}
      topicId={focusPanelState.selectedTopicId}
      topicTitle={focusPanelState.selectedTopicTitle}
      onClose={handleCloseFocusPanel}
    />
  </div>
);
```


### Page Conversion Specifications

#### Readiness Page Conversion

**Current State**: Uses Legacy V1 UI with white cards, teal/emerald accents, gray gradients

**Target State**: Dark Space UI with glassmorphic cards, indigo accents

**Conversion Map**:
```typescript
// Background
'bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50' 
  → 'bg-slate-950'

// Cards
'bg-white/80 backdrop-blur-sm border-l-4 border-l-emerald-500'
  → 'bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl'

// Buttons
'bg-gradient-to-r from-emerald-600 to-green-600'
  → 'bg-indigo-600 hover:bg-indigo-500'

// Text
'text-slate-900' → 'text-slate-200'
'text-slate-600' → 'text-slate-400'

// Accent Colors
'text-emerald-600' → 'text-indigo-400'
'border-emerald-200' → 'border-indigo-500/30'
```

**Preserved Functionality**:
- Study signals (streak, active days, concepts, saved clips)
- Focus areas (flagged Q&A)
- Learning library (clips with search/filter)
- Study activity by class
- All data fetching and state management

#### Help Page Conversion

**Current State**: White wrapper container with slate-50 background

**Target State**: Dark Space UI with content breathing on dark canvas

**Conversion Map**:
```typescript
// Remove wrapper
'bg-gradient-to-br from-slate-50 to-white' → 'bg-slate-950'

// Main container
'bg-white/90 backdrop-blur-sm border border-slate-200/70'
  → 'bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl'

// Section cards
'bg-slate-50/70' → 'bg-slate-900/40'
'bg-white' → 'bg-slate-900/60'
'border-slate-200' → 'border-slate-800'

// Text
'text-slate-900' → 'text-slate-200'
'text-slate-600' → 'text-slate-400'
'text-emerald-600' → 'text-indigo-400'
```

**Preserved Functionality**:
- All help content sections
- Text and descriptions
- Layout structure

#### Settings Page Conversion

**Current State**: Gradient background with white cards, teal buttons

**Target State**: Dark Space UI with glassmorphic cards, indigo buttons

**Conversion Map**:
```typescript
// Background
'bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50'
  → 'bg-slate-950'

// Cards
'bg-white/80 backdrop-blur-sm border border-slate-200/60'
  → 'bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl'

// Buttons
'bg-gradient-to-r from-teal-700 to-teal-600'
  → 'bg-indigo-600 hover:bg-indigo-500'
'border-teal-300' → 'border-indigo-500/30'

// Text
'text-slate-900' → 'text-slate-200'
'text-slate-600' → 'text-slate-400'
'text-emerald-600' → 'text-indigo-400'
```

**Preserved Functionality**:
- Logout functionality
- Density toggle (comfort/compact)
- Parent access links
- Profile switching
- Email display


## Data Models

### Focus Panel State Model

```typescript
interface FocusPanelState {
  isOpen: boolean;              // Panel visibility state
  selectedTopicId: string | null;  // ID of selected Galaxy topic
  selectedTopicTitle: string | null; // Display name of topic
  chatSessionId: string | null;    // Active chat session ID (if created)
}
```

**State Transitions**:
- Initial: `{ isOpen: false, selectedTopicId: null, selectedTopicTitle: null, chatSessionId: null }`
- Star Clicked: `{ isOpen: true, selectedTopicId: "topic-123", selectedTopicTitle: "Photosynthesis", chatSessionId: null }`
- Session Created: `{ isOpen: true, selectedTopicId: "topic-123", selectedTopicTitle: "Photosynthesis", chatSessionId: "chat-456" }`
- Panel Closed: `{ isOpen: false, selectedTopicId: null, selectedTopicTitle: null, chatSessionId: null }`

### Chat Session Model (Existing)

The Focus Panel reuses the existing chat session model:

```typescript
interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  session_type: 'general' | 'question' | 'snapshot' | 'reflection';
  created_at: string;
  updated_at: string;
  metadata: {
    topicId?: string;
    topicTitle?: string;
    classId?: string;
    [key: string]: any;
  };
}
```

**Focus Panel Metadata**:
When creating a chat session from the Focus Panel, the following metadata is included:
```typescript
{
  topicId: string;        // Galaxy topic ID
  topicTitle: string;     // Topic display name
  source: 'focus-panel';  // Indicates origin
}
```

### Style Token Model

The Dark Space UI uses consistent style tokens:

```typescript
interface DarkSpaceTokens {
  // Backgrounds
  background: 'bg-slate-950';
  cardBackground: 'bg-slate-900/60';
  cardBackdrop: 'backdrop-blur-md';
  
  // Borders
  border: 'border-slate-800';
  borderSubtle: 'border-slate-700';
  
  // Text
  heading: 'text-slate-200';
  body: 'text-slate-400';
  muted: 'text-slate-500';
  
  // Interactive
  primary: 'bg-indigo-600';
  primaryHover: 'hover:bg-indigo-500';
  primaryText: 'text-indigo-400';
  primaryBorder: 'border-indigo-500/30';
  
  // Shadows
  shadow: 'shadow-xl';
  shadowColor: 'shadow-slate-900/50';
  
  // Rounding
  rounded: 'rounded-2xl';
  roundedLg: 'rounded-xl';
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, the following properties were identified as testable through automated testing. Many criteria are styling requirements (CSS classes, colors, layouts) which are not amenable to property-based testing and are better validated through visual inspection and manual testing.

The testable properties focus on:
- Functional behavior preservation (existing features continue to work)
- UI interaction behavior (clicking, opening, closing)
- State management (data persistence, session handling)
- Responsive behavior (layout at different screen sizes)

Redundant properties have been eliminated. For example, multiple criteria about "maintaining existing functionality" have been consolidated into single properties per page.

### Property 1: Settings Page Functionality Preservation

*For any* user interaction with the Settings page (logout, density toggle, parent access links), the functionality should work identically before and after the UI conversion.

**Validates: Requirements 3.6, 10.3**

### Property 2: Focus Panel Opens on Star Click

*For any* Galaxy star click when Weave Mode is off, the Focus Panel should slide in from the right with the correct topic information.

**Validates: Requirements 4.1**

### Property 3: Focus Panel Close Button Exists and Functions

*For any* opened Focus Panel, clicking the close button should hide the panel and return to the Galaxy view.

**Validates: Requirements 4.5, 4.6**

### Property 4: Weave Mode Prevents Focus Panel

*For any* Galaxy star click when Weave Mode is active, the constellation selection behavior should occur and the Focus Panel should not open.

**Validates: Requirements 4.7**

### Property 5: Focus Panel Displays Chat Interface

*For any* opened Focus Panel, the Socratic Chat interface should be rendered with the selected topic context.

**Validates: Requirements 5.1**

### Property 6: Topic Context Passed to Chat

*For any* Galaxy star selection, the Focus Panel should pass the correct topicId and topicTitle to the chat interface.

**Validates: Requirements 5.2**

### Property 7: Chat Session Initialization

*For any* Focus Panel opening, a new chat session should be created with the selected topic context.

**Validates: Requirements 5.3**

### Property 8: Chat State Persistence

*For any* message sent in the Focus Panel chat, the message should persist in the chat state while the panel remains open.

**Validates: Requirements 5.5**

### Property 9: Galaxy Remains Interactive After Panel Close

*For any* Focus Panel close action, the Galaxy visualization should remain visible and all interactions (star clicks, Weave Mode) should continue to function.

**Validates: Requirements 7.1**

### Property 10: Chat Session Saved to History

*For any* Focus Panel chat session, closing the panel should preserve the chat session in the user's chat history.

**Validates: Requirements 7.2**

### Property 11: Topic Switching Closes Current Session

*For any* Galaxy star click while the Focus Panel is open, the current chat session should close and a new session should open with the new topic.

**Validates: Requirements 7.3**

### Property 12: Focus Panel Does Not Navigate

*For any* Focus Panel interaction (open, close, chat), the browser URL should remain on the Galaxy page without navigation.

**Validates: Requirements 7.4**

### Property 13: Weave Mode Toggle Remains Accessible

*For any* Focus Panel state (open or closed), the Weave Mode toggle button should remain clickable and functional.

**Validates: Requirements 7.5**

### Property 14: Focus Panel Responsive Width - Mobile

*For any* viewport width less than 768px, the Focus Panel should use full screen width (w-full).

**Validates: Requirements 8.1**

### Property 15: Focus Panel Responsive Width - Tablet

*For any* viewport width between 768px and 1023px, the Focus Panel should use 450px width.

**Validates: Requirements 8.2**

### Property 16: Focus Panel Responsive Width - Desktop

*For any* viewport width 1024px or greater, the Focus Panel should use 500px width.

**Validates: Requirements 8.3**

### Property 17: Focus Panel Scrollable Content

*For any* Focus Panel with content exceeding viewport height, the panel should be scrollable.

**Validates: Requirements 8.4**

### Property 18: Close Button Accessible on All Screens

*For any* screen size, the Focus Panel close button should be visible and clickable.

**Validates: Requirements 8.5**

### Property 19: Readiness Page Data Display Preservation

*For any* Readiness page load, all existing data displays (study signals, focus areas, learning library) should render correctly with the new styling.

**Validates: Requirements 10.1**

### Property 20: Help Page Content Preservation

*For any* Help page load, all existing content sections and text should be present and readable with the new styling.

**Validates: Requirements 10.2**

### Property 21: Galaxy Interactions Preservation

*For any* Galaxy interaction (Weave Mode, node selection, navigation to /tutor when Focus Panel is not used), the existing behavior should function identically after Focus Panel integration.

**Validates: Requirements 10.4**

### Property 22: Galaxy Physics Unaffected by Focus Panel

*For any* Focus Panel state change (open/close), the Galaxy force simulation and node animations should continue without interruption.

**Validates: Requirements 10.5**


## Error Handling

### Focus Panel Error Scenarios

**1. Chat Session Creation Failure**

**Scenario**: API call to `/api/chats/resolve` fails when opening Focus Panel

**Handling**:
```typescript
try {
  const response = await fetch('/api/chats/resolve', {
    method: 'POST',
    body: JSON.stringify({ intent: 'new_question', topicId, topicTitle }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create chat session');
  }
  
  const { chatId } = await response.json();
  setSessionId(chatId);
} catch (error) {
  console.error('[FocusPanel] Session creation failed:', error);
  
  // Show error state in panel
  setError('Unable to start chat session. Please try again.');
  
  // Optionally: Close panel after delay
  setTimeout(() => onClose(), 3000);
}
```

**User Experience**: Display error message in panel with retry button

**2. Topic Data Missing**

**Scenario**: User clicks star but topicId or topicTitle is null/undefined

**Handling**:
```typescript
const handleNodeClick = (node: any, event: MouseEvent) => {
  if (!node.id || !node.name) {
    console.error('[Galaxy] Invalid node data:', node);
    toast.error('Unable to open topic. Please try again.');
    return;
  }
  
  // Proceed with opening Focus Panel
  setFocusPanelState({
    isOpen: true,
    selectedTopicId: node.id,
    selectedTopicTitle: node.name,
    chatSessionId: null,
  });
};
```

**User Experience**: Show toast notification, prevent panel from opening

**3. Chat Interface Load Failure**

**Scenario**: ChatInterface component fails to render or load messages

**Handling**:
```typescript
// In FocusPanelChat component
const [loadError, setLoadError] = useState<string | null>(null);

useEffect(() => {
  async function loadChatData() {
    try {
      // Load chat messages, metadata, etc.
      const response = await fetch(`/api/chats/metadata?chatId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to load chat');
      
      const data = await response.json();
      // Process data...
    } catch (error) {
      console.error('[FocusPanelChat] Load failed:', error);
      setLoadError('Unable to load chat. Please close and try again.');
    }
  }
  
  loadChatData();
}, [sessionId]);

if (loadError) {
  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="text-center">
        <p className="text-red-400 mb-4">{loadError}</p>
        <button onClick={onClose} className="px-4 py-2 bg-indigo-600 rounded-lg">
          Close Panel
        </button>
      </div>
    </div>
  );
}
```

**User Experience**: Display error message with close button

### Page Conversion Error Scenarios

**1. Data Fetch Failures (Readiness Page)**

**Scenario**: API calls for study signals, clips, or classes fail

**Handling**: Existing error handling is preserved. The UI conversion does not change error handling logic.

```typescript
// Existing pattern (preserved)
try {
  const response = await fetch('/api/chats/list');
  if (!response.ok) throw new Error('Failed to load chats');
  const data = await response.json();
  // Process data...
} catch (error) {
  console.error('[Dashboard] Error loading data:', error);
  // Continue with empty state
}
```

**User Experience**: Show loading state, then empty state if data fails to load

**2. Settings Page Action Failures**

**Scenario**: Logout or density toggle fails

**Handling**: Existing error handling is preserved.

```typescript
// Logout error handling (preserved)
const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
    router.push('/');
  } catch (error) {
    console.error('[Settings] Logout failed:', error);
    // Show error toast or message
  }
};
```

**User Experience**: Display error message, allow retry

### Graceful Degradation

**Focus Panel Without JavaScript**:
- Focus Panel requires JavaScript for interaction
- If JS is disabled, Galaxy stars navigate to `/tutor` page (fallback behavior)
- This is acceptable as the Galaxy visualization itself requires JavaScript

**Mobile Viewport Constraints**:
- On very small screens (<320px), Focus Panel uses full width
- Content remains scrollable to ensure accessibility
- Close button remains fixed and accessible

**Network Failures**:
- Chat messages queue locally if network is unavailable
- Retry logic built into existing chat system
- User sees "Sending..." state until message is confirmed


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Verify Focus Panel opens with correct topic data
- Test close button functionality
- Verify Weave Mode prevents Focus Panel
- Test responsive width breakpoints
- Verify chat session creation
- Test error states and fallbacks

**Property-Based Tests**: Verify universal properties across all inputs
- Not applicable for this feature due to the nature of requirements (mostly UI styling and specific interaction behaviors)
- The testable requirements are better suited to example-based testing

### Unit Testing Strategy

**Testing Library**: Jest + React Testing Library

**Test Files**:
- `src/components/galaxy/__tests__/FocusPanel.test.tsx`
- `src/components/galaxy/__tests__/FocusPanelChat.test.tsx`
- `src/components/galaxy/__tests__/ConceptGalaxy-FocusPanel.test.tsx`
- `src/app/(app)/readiness/__tests__/page.test.tsx`
- `src/app/(app)/help/__tests__/page.test.tsx`
- `src/app/(app)/settings/__tests__/page.test.tsx`

**Key Test Scenarios**:

1. **Focus Panel Component Tests**:
```typescript
describe('FocusPanel', () => {
  it('should render when isOpen is true', () => {
    render(<FocusPanel isOpen={true} topicId="123" topicTitle="Test" onClose={jest.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<FocusPanel isOpen={false} topicId="123" topicTitle="Test" onClose={jest.fn()} />);
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<FocusPanel isOpen={true} topicId="123" topicTitle="Test" onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should use full width on mobile viewport', () => {
    global.innerWidth = 500;
    render(<FocusPanel isOpen={true} topicId="123" topicTitle="Test" onClose={jest.fn()} />);
    
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveClass('w-full');
  });

  it('should use 450px width on tablet viewport', () => {
    global.innerWidth = 800;
    render(<FocusPanel isOpen={true} topicId="123" topicTitle="Test" onClose={jest.fn()} />);
    
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveClass('md:w-[450px]');
  });
});
```

2. **Galaxy Integration Tests**:
```typescript
describe('ConceptGalaxy with Focus Panel', () => {
  it('should open Focus Panel when star is clicked and Weave Mode is off', () => {
    const { container } = render(<ConceptGalaxy topics={mockTopics} />);
    
    // Simulate star click
    const node = { id: '123', name: 'Test Topic' };
    const event = new MouseEvent('click', { shiftKey: false });
    
    // Trigger node click handler
    // (This requires exposing the handler or using integration test approach)
    
    expect(screen.getByText('Test Topic')).toBeInTheDocument();
  });

  it('should not open Focus Panel when Weave Mode is active', () => {
    const { container } = render(<ConceptGalaxy topics={mockTopics} />);
    
    // Enable Weave Mode
    const weaveModeToggle = screen.getByText(/weave mode/i);
    fireEvent.click(weaveModeToggle);
    
    // Simulate star click
    // Focus Panel should not open
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should preserve Galaxy interactions after Focus Panel closes', () => {
    const { container } = render(<ConceptGalaxy topics={mockTopics} />);
    
    // Open Focus Panel
    // ... open logic
    
    // Close Focus Panel
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Verify Galaxy is still interactive
    const weaveModeToggle = screen.getByText(/weave mode/i);
    expect(weaveModeToggle).toBeEnabled();
  });
});
```

3. **Page Conversion Tests**:
```typescript
describe('Readiness Page - Dark Space UI', () => {
  it('should render with Dark Space background', () => {
    render(<ReadinessPage />);
    const container = screen.getByTestId('readiness-container');
    expect(container).toHaveClass('bg-slate-950');
  });

  it('should display study signals with correct data', async () => {
    // Mock API responses
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chats: mockChats, clips: mockClips }),
    });

    render(<ReadinessPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/streak/i)).toBeInTheDocument();
      expect(screen.getByText(/active days/i)).toBeInTheDocument();
    });
  });

  it('should maintain clip search functionality', async () => {
    render(<ReadinessPage />);
    
    const searchInput = screen.getByPlaceholderText(/search learning moments/i);
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    // Verify filtered results
    await waitFor(() => {
      // Check that clips are filtered
    });
  });
});

describe('Settings Page - Dark Space UI', () => {
  it('should render with Dark Space styling', () => {
    render(<SettingsPage />);
    const container = screen.getByTestId('settings-container');
    expect(container).toHaveClass('bg-slate-950');
  });

  it('should maintain logout functionality', async () => {
    const mockSignOut = jest.fn();
    // Mock Supabase client
    
    render(<SettingsPage />);
    
    const logoutButton = screen.getByText(/log out/i);
    fireEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('should maintain density toggle functionality', () => {
    render(<SettingsPage />);
    
    const comfortButton = screen.getByText(/comfort/i);
    const compactButton = screen.getByText(/compact/i);
    
    fireEvent.click(compactButton);
    // Verify density context updated
    
    fireEvent.click(comfortButton);
    // Verify density context updated
  });
});
```

### Integration Testing

**End-to-End Tests** (Playwright):

```typescript
test('Focus Panel workflow from Galaxy to chat', async ({ page }) => {
  await page.goto('/app');
  
  // Wait for Galaxy to load
  await page.waitForSelector('.galaxy-container');
  
  // Click a star
  await page.click('.galaxy-node[data-topic-id="123"]');
  
  // Verify Focus Panel opens
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator('text=Topic Title')).toBeVisible();
  
  // Send a message
  await page.fill('textarea[placeholder*="message"]', 'Test question');
  await page.click('button:has-text("Send")');
  
  // Verify message appears
  await expect(page.locator('text=Test question')).toBeVisible();
  
  // Close panel
  await page.click('button[aria-label="Close"]');
  
  // Verify panel closes and Galaxy is still visible
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  await expect(page.locator('.galaxy-container')).toBeVisible();
});

test('Page navigation shows consistent Dark Space UI', async ({ page }) => {
  // Visit each page and verify styling
  await page.goto('/readiness');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(2, 6, 23)'); // slate-950
  
  await page.goto('/help');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(2, 6, 23)');
  
  await page.goto('/settings');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(2, 6, 23)');
});
```

### Visual Regression Testing

**Tool**: Percy or Chromatic

**Snapshots Required**:
- Readiness page (full page)
- Help page (full page)
- Settings page (full page)
- Galaxy with Focus Panel open (desktop)
- Galaxy with Focus Panel open (mobile)
- Focus Panel with chat messages (various states)

**Baseline**: Capture snapshots after implementation, review for Dark Space UI compliance

### Manual Testing Checklist

**Visual Inspection**:
- [ ] All three pages use bg-slate-950 background
- [ ] No white cards remain on any page
- [ ] No teal/emerald colors remain (replaced with indigo)
- [ ] Glassmorphic cards have correct transparency and blur
- [ ] Text is readable (sufficient contrast)
- [ ] Shadows and borders are subtle and consistent

**Interaction Testing**:
- [ ] Focus Panel slides in smoothly
- [ ] Focus Panel slides out smoothly
- [ ] Close button is always accessible
- [ ] Weave Mode toggle still works
- [ ] Galaxy physics unaffected by panel
- [ ] Chat messages send and display correctly
- [ ] Responsive breakpoints work correctly

**Functionality Preservation**:
- [ ] Readiness page data loads correctly
- [ ] Learning library search/filter works
- [ ] Settings logout works
- [ ] Settings density toggle works
- [ ] Help page content is complete


## Implementation Notes

### Development Sequence

The implementation should follow this sequence to minimize risk and enable incremental testing:

**Phase 1: Page Conversions** (Low Risk)
1. Convert Help page (simplest - minimal functionality)
2. Convert Settings page (moderate - preserve button functionality)
3. Convert Readiness page (complex - preserve all data displays and interactions)

**Phase 2: Focus Panel Foundation** (Medium Risk)
1. Create FocusPanel component (UI shell only)
2. Integrate into ConceptGalaxy (state management)
3. Test open/close behavior without chat

**Phase 3: Chat Integration** (High Risk)
1. Create FocusPanelChat wrapper component
2. Integrate ChatInterface from /tutor
3. Test session creation and message flow
4. Verify chat history persistence

**Phase 4: Polish and Testing** (Quality Assurance)
1. Responsive behavior testing
2. Error handling verification
3. Visual regression testing
4. Performance optimization

### Code Reuse Strategy

**Maximize Reuse**:
- ChatInterface component from `/tutor` page (no modifications needed)
- TutorContext for chat state management
- Existing chat API endpoints
- Density tokens from DensityContext

**Minimal New Code**:
- FocusPanel component (~150 lines)
- FocusPanelChat wrapper (~100 lines)
- ConceptGalaxy modifications (~50 lines)
- Page styling updates (~200 lines total across 3 pages)

**Total New Code**: ~500 lines
**Modified Code**: ~250 lines

### Performance Considerations

**Focus Panel Rendering**:
- Use React.memo for FocusPanel to prevent unnecessary re-renders
- Lazy load ChatInterface only when panel opens
- Debounce panel animations to avoid jank

```typescript
const FocusPanel = React.memo(({ isOpen, topicId, topicTitle, onClose }: FocusPanelProps) => {
  // Only render chat when panel is open
  return (
    <div className={`... ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {isOpen && (
        <Suspense fallback={<LoadingSpinner />}>
          <FocusPanelChat topicId={topicId} topicTitle={topicTitle} />
        </Suspense>
      )}
    </div>
  );
});
```

**Galaxy Performance**:
- Focus Panel overlay should not affect Galaxy physics simulation
- Use CSS transforms for animations (GPU-accelerated)
- Avoid re-rendering Galaxy when panel state changes

**Page Load Performance**:
- Dark Space UI uses fewer gradients (better performance)
- Backdrop blur is GPU-accelerated
- No additional assets or images required

### Accessibility Considerations

**Focus Panel**:
- Use semantic HTML: `<dialog>` or `role="dialog"`
- Trap focus within panel when open
- Restore focus to trigger element (star) when closed
- Support Escape key to close panel
- Provide aria-label for close button

```typescript
<div 
  role="dialog" 
  aria-modal="true"
  aria-labelledby="focus-panel-title"
  className="..."
>
  <div className="border-b border-slate-800 p-4">
    <h2 id="focus-panel-title" className="text-lg font-semibold text-slate-200">
      {topicTitle}
    </h2>
    <button 
      onClick={onClose}
      aria-label="Close focus panel"
      className="..."
    >
      <X className="w-5 h-5" />
    </button>
  </div>
  {/* Chat content */}
</div>
```

**Dark Space UI Contrast**:
- Text on dark backgrounds meets WCAG AA standards
- text-slate-200 on bg-slate-950: Contrast ratio ~12:1 (AAA)
- text-slate-400 on bg-slate-950: Contrast ratio ~7:1 (AA)
- Indigo buttons have sufficient contrast for interactive elements

**Keyboard Navigation**:
- All buttons remain keyboard accessible
- Tab order is logical (top to bottom, left to right)
- Focus indicators are visible (browser defaults + custom styles)

### Browser Compatibility

**Supported Browsers**:
- Chrome/Edge 90+ (backdrop-filter support)
- Firefox 103+ (backdrop-filter support)
- Safari 15.4+ (backdrop-filter support)

**Fallback for Older Browsers**:
```css
/* Fallback for browsers without backdrop-filter */
@supports not (backdrop-filter: blur(12px)) {
  .glassmorphic-card {
    background-color: rgb(15 23 42 / 0.95); /* More opaque */
  }
}
```

**Mobile Browser Considerations**:
- iOS Safari: Test safe area insets for notch devices
- Android Chrome: Test viewport height with/without address bar
- Use `h-screen-dynamic` utility for consistent viewport height

### Security Considerations

**No New Security Risks**:
- Focus Panel uses existing chat API (already secured)
- No new authentication or authorization logic
- No new data storage or persistence
- XSS protection via React's built-in escaping

**Existing Security Maintained**:
- Chat messages sanitized by existing system
- User authentication required for all chat operations
- RLS policies enforced at database level

### Migration Strategy

**Zero Downtime Deployment**:
1. Deploy page conversions first (visual changes only)
2. Deploy Focus Panel components (feature flag optional)
3. Enable Focus Panel for all users
4. Monitor for errors and performance issues

**Rollback Plan**:
- Page conversions: Revert CSS changes (no data impact)
- Focus Panel: Remove component, Galaxy reverts to navigation behavior
- No database migrations required

**Feature Flag** (Optional):
```typescript
const ENABLE_FOCUS_PANEL = process.env.NEXT_PUBLIC_ENABLE_FOCUS_PANEL === 'true';

const handleNodeClick = (node: any, event: MouseEvent) => {
  if (isWeaveModeActive || event.shiftKey) {
    handleConstellationSelection(node);
  } else if (ENABLE_FOCUS_PANEL) {
    // Open Focus Panel
    setFocusPanelState({ ... });
  } else {
    // Fallback: Navigate to /tutor
    router.push(`/tutor?topicId=${node.id}&topicTitle=${encodeURIComponent(node.name)}`);
  }
};
```

## Appendix

### Design Mockups

**Focus Panel - Desktop View**:
```
┌─────────────────────────────────────────────────────────────┐
│                     Galaxy Visualization                     │
│                                                               │
│  ⭐ ⭐                                    ┌──────────────────┐│
│     ⭐    ⭐                              │ Photosynthesis  ✕││
│  ⭐    ⭐                                 ├──────────────────┤│
│     ⭐       ⭐                           │                  ││
│                                          │ AI: Let's explore││
│  [🕸️ Weave Mode]                        │ photosynthesis...││
│                                          │                  ││
│                                          │ You: How does... ││
│                                          │                  ││
│                                          │ AI: Great       ││
│                                          │ question...      ││
│                                          │                  ││
│                                          ├──────────────────┤│
│                                          │ [Type message...] ││
└─────────────────────────────────────────┴──────────────────┘
```

**Focus Panel - Mobile View**:
```
┌─────────────────────────┐
│ Photosynthesis        ✕ │
├─────────────────────────┤
│                         │
│ AI: Let's explore       │
│ photosynthesis...       │
│                         │
│ You: How does...        │
│                         │
│ AI: Great question...   │
│                         │
│                         │
│                         │
├─────────────────────────┤
│ [Type message...]       │
└─────────────────────────┘
```

### Style Reference

**Dark Space Color Palette**:
```css
/* Backgrounds */
--bg-space: #020617;        /* slate-950 */
--bg-card: rgba(15, 23, 42, 0.6);  /* slate-900/60 */

/* Borders */
--border-primary: #1e293b;  /* slate-800 */
--border-subtle: #334155;   /* slate-700 */

/* Text */
--text-heading: #e2e8f0;    /* slate-200 */
--text-body: #94a3b8;       /* slate-400 */
--text-muted: #64748b;      /* slate-500 */

/* Interactive */
--primary: #4f46e5;         /* indigo-600 */
--primary-hover: #6366f1;   /* indigo-500 */
--primary-text: #818cf8;    /* indigo-400 */
--primary-border: rgba(99, 102, 241, 0.3); /* indigo-500/30 */
```

**Glassmorphic Card Template**:
```tsx
<div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl p-6">
  {/* Card content */}
</div>
```

**Indigo Button Template**:
```tsx
<button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors">
  Button Text
</button>
```

### API Endpoints Reference

**Chat Session Creation**:
```
POST /api/chats/resolve
Body: {
  intent: 'new_question',
  topicId: string,
  topicTitle: string
}
Response: {
  chatId: string,
  mode: string,
  session_type: string
}
```

**Chat Metadata**:
```
GET /api/chats/metadata?chatId={chatId}
Response: {
  id: string,
  metadata: {
    topicId?: string,
    topicTitle?: string,
    ...
  }
}
```

**Chat History**:
```
GET /api/chats/list
Response: {
  chats: Array<{
    id: string,
    title: string,
    session_type: string,
    updated_at: string,
    metadata: object
  }>
}
```


# Context-Aware Soft Nudges Implementation

## Overview

Implemented a **non-intrusive context-aware tutoring system** that detects student struggle patterns and offers help through soft nudges. This approach uses existing interaction logs (zero polling, zero extra APIs) to provide proactive support without interrupting the learning flow.

## Key Principle: Soft Nudges, Not Forced Interactions

✅ **What we built:**

- Passive struggle detection in background
- Dismissible toast notification when help might be useful
- Student initiates all interactions
- Agent interprets patterns via existing `getContext` tool

❌ **What we avoided:**

- Auto-pausing video
- Forced voice interactions
- Blocking learning flow
- Annoying interruptions

## Components Implemented

### 1. useStruggleDetection Hook

**File:** `frontend/src/hooks/useStruggleDetection.ts`

**Purpose:** Pure frontend detection of struggle patterns by analyzing interaction logs

**How it works:**

- Monitors recent seek/rewind interactions
- Detects 3+ rewinds to the same 15-second section within 90 seconds
- Checks if student is currently near the struggle section
- Returns boolean flag + rewind count + video timestamp

**API:**

```typescript
const { isStruggling, rewindCount, struggleTime, dismiss } =
  useStruggleDetection({
    interactionLogs: interactions, // Existing logs, no extra tracking needed
    currentVideoTime: currentTime, // From video player
    rewindThreshold: 3, // 3 rewinds = struggle signal
    sectionWindow: 15, // 15-second sections
    timeWindow: 90, // Within 90 seconds
  });
```

**Why it's smart:**

- Zero polling - uses existing data
- Zero backend calls - pure client-side
- Instant detection - no latency
- Auto-resets after time window expires
- Dismissible - respects student agency

### 2. StruggleToast Component

**File:** `frontend/src/components/common/StruggleToast.tsx`

**Purpose:** Non-blocking notification that appears when struggle is detected

**Design principles:**

- Bottom-right position (doesn't cover content)
- Easy to dismiss (X button)
- Single clear action ("Get Help" button)
- Gentle animation (no jarring popups)
- Context-aware message ("Rewatched this 3 times? I can help!")

**UI:**

```
┌──────────────────────────────────┐
│ 💬  Rewatched this 3 times?      │  [X]
│     I can help!                  │
│                                  │
│     Voice tutor is ready         │
│     to explain                   │
│                                  │
│     [    Get Help    ]           │
└──────────────────────────────────┘
```

**Accessibility:**

- Proper ARIA attributes (`role="alert"`, `aria-live="polite"`)
- Keyboard accessible
- Screen reader friendly
- High contrast support

### 3. System Prompt Updates

**File:** `docs/VOICE_TUTOR_AGENT_SYSTEM_PROMPT.md`

**Purpose:** Teach agent to interpret interaction patterns from `getContext`

**New section: "Reading Interaction Patterns (Context-Aware Teaching)"**

#### Struggle Indicators → Offer Different Approach

- **`seek > 3` in last 3 minutes**: Student rewatched same section repeatedly

  - Agent response: "I see you rewatched this part a few times. The tricky bit is probably [concept]. Want me to explain it differently?"
  - Key: Offer analogy, visual explanation, or simpler breakdown (not just repetition)

- **`pause > 5` at checkpoint**: Student pausing frequently at question
  - Agent response: "Taking your time? This is a tough one. Want a hint or should I break down the concept first?"
  - Key: Be patient, validate the difficulty

#### Engaged Learning → Build Momentum

- **`manual_pause > 2`**: Student taking notes or processing

  - Agent response: "Good on you for taking notes! That helps lock it in."
  - Key: Be patient, don't interrupt, shorter responses

- **`checkpoint_complete > 3` in a row**: Doing well
  - Agent response: "You're crushing these! Ready for a challenge question to test mastery?"
  - Key: Celebrate progress, raise difficulty slightly

#### Distraction/Confusion → Re-engage

- **`seek_backward` immediately after `checkpoint_complete`**: Might have guessed

  - Agent response: "You got that one right, but I notice you went back. Want to make sure it's solid?"
  - Key: Verify understanding, not just correctness

- **Long gaps (>5 min)**: May have paused or gotten distracted
  - Agent response: "Welcome back! Quick recap of where we are?"
  - Key: Gentle re-orientation, not intrusive

**Critical Rule:**

> **Interaction patterns = teaching signals, NOT judgment**. Use them to offer help proactively but always keep it light and optional.

### 4. StudentWatchPage Integration

**File:** `frontend/src/views/StudentWatchPage.tsx`

**Changes:**

1. **Import hooks:**

   ```typescript
   import { useStruggleDetection } from "../hooks/useStruggleDetection";
   import { StruggleToast } from "../components/common/StruggleToast";
   ```

2. **Add struggle detection:**

   ```typescript
   const {
     isStruggling,
     rewindCount,
     dismiss: dismissStruggle,
   } = useStruggleDetection({
     interactionLogs: interactions, // Already tracked!
     currentVideoTime: currentTime,
     rewindThreshold: 3,
     sectionWindow: 15,
     timeWindow: 90,
   });
   ```

3. **Add help handler:**

   ```typescript
   const handleGetHelp = () => {
     dismissStruggle();
     // Scroll to voice tutor widget
     const tutorWidget = document.querySelector("[data-voice-tutor-widget]");
     if (tutorWidget) {
       tutorWidget.scrollIntoView({ behavior: "smooth", block: "center" });
     }
   };
   ```

4. **Render toast:**
   ```tsx
   <StruggleToast
     show={isStruggling}
     rewindCount={rewindCount}
     onHelp={handleGetHelp}
     onDismiss={dismissStruggle}
   />
   ```

## How It Works End-to-End

### Frontend Struggle Detection (Client-Side)

1. Student watches video
2. Student rewinds to section A at 2:30 (logged)
3. Student rewinds to section A again at 2:32 (logged)
4. Student rewinds to section A again at 2:35 (logged)
5. **useStruggleDetection** detects 3 rewinds to same section within 90 seconds
6. **StruggleToast** appears: "Rewatched this 3 times? I can help!"
7. Student clicks "Get Help" → scrolls to voice tutor
8. Student can now ask question via voice

### Agent Context Awareness (Server-Side)

1. Student opens voice tutor (for any reason)
2. Agent automatically calls `getContext` tool (as per system prompt)
3. Backend returns:
   ```json
   {
     "interactionSummary": {
       "seek": 5,
       "manual_pause": 2,
       "checkpoint_complete": 3
     }
   }
   ```
4. Agent interprets: "5 seeks = struggling, but 3 checkpoints complete = engaged"
5. Agent responds: "I see you rewatched this section. The confusing part is probably [concept]. Want a different angle on it?"

## Why This Approach Is Superior

### ✅ Advantages

1. **Zero Polling**: No setInterval, no unnecessary API calls
2. **Zero Latency**: Detection happens instantly on existing data
3. **Zero Backend Changes**: Pure frontend with existing interaction logs
4. **Non-Intrusive**: Student can dismiss or ignore completely
5. **Context-Aware**: Agent reads patterns via existing `getContext` tool
6. **Scalable**: No performance impact, works for any number of students
7. **Privacy-Respecting**: All detection happens client-side
8. **User Agency**: Student always in control, no forced interactions

### ❌ Alternatives We Rejected

- **Auto-pause video + force voice interaction**: Too intrusive, becomes annoying
- **Polling backend every 5 seconds**: Wasteful, adds latency, costs money
- **New Gemini API for pattern detection**: Overcomplicated, slow, expensive
- **WebSocket real-time monitoring**: Overkill, complex infrastructure

## Testing Scenarios

### Scenario 1: Student Struggling

1. Open video with checkpoints
2. Rewind to 2:30 three times within 90 seconds
3. Toast should appear: "Rewatched this 3 times? I can help!"
4. Click "Get Help" → should scroll to voice tutor
5. Ask question → agent should reference the rewinds

### Scenario 2: Student Engaged (No Struggle)

1. Watch video normally
2. Rewind once or twice (< 3 times)
3. Toast should NOT appear
4. Continue learning without interruption

### Scenario 3: Student Dismisses Toast

1. Trigger toast by rewinding 3+ times
2. Click X to dismiss
3. Toast should disappear
4. Should not reappear until time window expires (90 seconds)

### Scenario 4: Agent Reads Patterns

1. Rewind multiple times (logged as `seek` interactions)
2. Open voice tutor
3. Agent calls `getContext` (automatically)
4. Agent response should mention: "I see you rewatched this section..."

## Deployment Checklist

- [x] Create useStruggleDetection hook
- [x] Create StruggleToast component
- [x] Update system prompt with interaction pattern interpretation
- [x] Integrate into StudentWatchPage
- [x] Fix TypeScript errors
- [ ] **Deploy frontend** (critical - includes checkpoint persistence fix!)
- [ ] **Update agent system prompt in ElevenLabs dashboard** (manual paste)
- [ ] Test struggle detection in production
- [ ] Verify agent interprets patterns correctly
- [ ] Monitor user feedback on toast notifications

## Configuration Options

All configurable via `useStruggleDetection` parameters:

```typescript
{
  rewindThreshold: 3,      // Number of rewinds before triggering
  sectionWindow: 15,       // Size of video section (seconds)
  timeWindow: 90,          // Time window to count rewinds (seconds)
  interactionLogs: [...],  // Existing interaction logs
  currentVideoTime: 123.4  // Current video playback time
}
```

**Tuning recommendations:**

- **More sensitive**: `rewindThreshold: 2` (triggers after 2 rewinds)
- **Less sensitive**: `rewindThreshold: 4` (triggers after 4 rewinds)
- **Smaller sections**: `sectionWindow: 10` (10-second sections)
- **Larger sections**: `sectionWindow: 20` (20-second sections)
- **Shorter window**: `timeWindow: 60` (within 1 minute)
- **Longer window**: `timeWindow: 120` (within 2 minutes)

## Performance Impact

**Frontend:**

- `useStruggleDetection`: O(n) where n = number of recent interactions
- Typical: < 100 interactions per session = negligible performance impact
- Uses `useMemo` for efficient computation
- No re-renders unless struggle state changes

**Backend:**

- Zero changes
- Zero extra API calls
- `getContext` already exists and returns `interactionSummary`

**Network:**

- Zero additional requests
- All detection happens client-side

## Future Enhancements

### Phase 2 (Optional)

1. **Configurable thresholds per video**: Some videos are harder, may need different thresholds
2. **Machine learning patterns**: Detect more complex struggle patterns (e.g., "pausing frequently at equations")
3. **A/B testing**: Test different toast messages, timing, thresholds
4. **Analytics**: Track toast show rate, dismiss rate, "Get Help" click rate

### Phase 3 (Advanced)

1. **Personalized thresholds**: Learn each student's typical rewind behavior
2. **Concept-specific detection**: "Struggling specifically with GraphQL queries"
3. **Multi-video patterns**: "Student always struggles with recursion"
4. **Collaborative filtering**: "Students who struggled here also struggled at [other concept]"

## Files Modified/Created

### Created:

- ✅ `frontend/src/hooks/useStruggleDetection.ts` (155 lines)
- ✅ `frontend/src/components/common/StruggleToast.tsx` (87 lines)

### Modified:

- ✅ `frontend/src/views/StudentWatchPage.tsx` (added imports, hook, handler, toast)
- ✅ `docs/VOICE_TUTOR_AGENT_SYSTEM_PROMPT.md` (added "Reading Interaction Patterns" section)
- ✅ `IMPLEMENTATION_PROGRESS.md` (fixed checkpoint type from deepDive to reflection/prediction/application)

### Total: 242 lines of new code + system prompt updates

## Success Metrics

**Immediate:**

- Toast appears when student struggles (3+ rewinds)
- Toast dismissible without issues
- "Get Help" button scrolls to tutor
- No performance degradation

**Short-term (1 week):**

- Students click "Get Help" at least 10% of the time
- Dismiss rate < 80% (not too annoying)
- Agent correctly interprets patterns in responses

**Long-term (1 month):**

- Reduced rewatch frequency (students get help sooner)
- Increased checkpoint completion rate
- Positive feedback on "proactive" tutoring
- No complaints about interruptions

## Summary

Implemented a **context-aware soft nudge system** that:

1. Detects struggle patterns using existing interaction logs (no polling)
2. Shows non-blocking toast when help might be useful
3. Teaches agent to interpret patterns via `getContext` tool
4. Maintains student agency (dismissible, optional, non-intrusive)

**Key Innovation:** Zero extra infrastructure, zero extra API calls, zero polling - just smart use of existing data to create a "proactive" tutoring experience that doesn't feel forced.

**Philosophy:** Proactive ≠ Intrusive. The best help is available when needed, not forced when not.

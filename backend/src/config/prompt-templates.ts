import type { AIContentConfig } from "./ai-content.config.js";

/**
 * Generate the full Gemini analysis prompt based on AI configuration
 */
export function generateVideoAnalysisPrompt(config: AIContentConfig): string {
  return `You are an expert educational content analyzer. Analyze this video to create an INTERACTIVE LEARNING TIMELINE that transforms passive watching into active learning.

⚠️ CRITICAL REQUIREMENTS:
1. TIME UNITS: All timestamps and durations MUST be numeric seconds (not mm:ss strings)
2. TIMESTAMP ACCURACY: 
   - Measure the ACTUAL video duration precisely
   - EVERY timestamp MUST be less than the video duration
   - DO NOT create timestamps beyond the video end
   - Keep a 10-second safety margin (if video is 694s, max timestamp should be 684s)
   - Double-check all timestamps before outputting

${generateTargetsSection(config)}

CORE ANALYSIS APPROACH:

1. AUDIO ANALYSIS (What the instructor SAYS):
   - Transcribe spoken words verbatim
   - Identify teaching points from narration
   - Note tone, emphasis, and pacing cues
   - **CRITICAL**: For EACH concept, capture a transcript snippet (~30-60 seconds) showing what the instructor says during that concept

2. VISUAL ANALYSIS (What appears ON SCREEN):
   - Capture code snippets, terminal commands, formulas
   - Describe diagrams, charts, architecture drawings
   - Note UI elements, button clicks, navigation
   - Identify when visual content is ESSENTIAL to understanding

3. AUDIO-VISUAL SYNC (Critical for pedagogy):
   ONLY mark 'visualEmphasis: true' when:
   - The visual ADDS critical information beyond audio
   - The instructor explicitly references what's on screen ("as you can see here...")
   - The visual demonstrates the spoken concept in real-time
   - Students MUST see this to understand the concept
   
   Example: If instructor says "let's write a function" while typing code → visualEmphasis: true
   Counter-example: Generic slide with text matching audio → visualEmphasis: false

OUTPUT STRUCTURE (ALL SECTIONS REQUIRED):

1. **KEY CONCEPTS** (REQUIRED: ${config.concepts.targetCount.min}-${
    config.concepts.targetCount.max
  }) - Interactive timeline markers that CLEARLY signal topic transitions:
{
  "concept": "DISTINCT, clear title that signals topic boundary (${
    config.concepts.maxTitleLength
  } chars max)",
  "timestamp": 145,
  "transcriptSnippet": "What the instructor says during this concept (~30-60 seconds of transcript to help with checkpoint timing)",
  "description": "Concise explanation combining audio + visual context (${
    config.concepts.maxDescriptionLength
  } chars max)",
  "importance": "core" | "supporting" | "supplementary",
  "conceptType": "main" | "sub",  // REQUIRED - must specify if this is a main concept or sub-concept
  "parentId": "timestamp-index",  // REQUIRED for sub-concepts only (e.g., "52-0" for first concept at 52s)
  "visualEmphasis": true | false,  // REQUIRED - true only if visual is essential to understanding
  "visualElements": "What's on screen ONLY if it adds to audio (${
    config.concepts.maxVisualElementsLength
  } chars max)"
}

IMPORTANCE LEVELS - Based on centrality to the video's learning objectives:
- "core": Central to the video's main topic; foundational to understanding; instructor spends significant time on it
- "supporting": Important for deeper understanding; builds on or connects core concepts; covered in moderate depth
- "supplementary": Adds context or breadth; mentioned briefly; nice-to-know but not critical to main learning path

IMPORTANCE ASSIGNMENT GUIDELINES:
✅ Core: "REST API Fundamentals" in an API design tutorial (the main focus)
✅ Supporting: "Error Handling Strategies" in same tutorial (important but builds on core API knowledge)
✅ Supplementary: "API Versioning Considerations" mentioned briefly at the end
❌ Don't mark everything as "core" - be selective to help students prioritize
❌ "Supplementary" doesn't mean unimportant - it means contextual/additional depth

CONCEPT HIERARCHY RULES (CRITICAL):
- Main concepts: MAJOR TOPIC BOUNDARIES - students should clearly see when switching topics (conceptType: "main", NO parentId)
  * Main concepts mark where the instructor TRANSITIONS to a new major topic
  * Identify these organically - don't force them at time intervals
  * Watch the ENTIRE video to find ALL topic transitions, not just the first half
- Sub concepts: Details/examples under a main concept (conceptType: "sub", MUST have parentId)
  * DO NOT limit sub-concepts - capture ALL important details, examples, and explanations
  * Every significant point, example, or detail the instructor makes should be a sub-concept
  * Sub-concepts are essential for deep understanding - don't skip them to meet a quota
- parentId format: "{timestamp}-{index}" where index is 0-based position in concepts array
- Group related sub-concepts under the same main concept
- Main concepts should be DISTINCT from each other - avoid overlapping or similar topics
- Each main concept represents a CLEAR TRANSITION to a new subject area

ANALYZING THE FULL VIDEO:
⚠️ CRITICAL: Analyze from timestamp 0:00 to the END of the video
- Don't stop analyzing after the first 10-15 minutes
- Topic transitions happen throughout the ENTIRE lecture - find them all
- If instructor teaches for 60 minutes, identify ALL major topic changes across all 60 minutes
- Example: A 45-minute video might have topic transitions at 0:00, 8:00, 18:00, 28:00, 38:00
  * These are NATURAL transitions based on content, not forced by time
  
✅ GOOD approach:
   1. Watch entire video
   2. Note when instructor says things like "Now let's move on to...", "Next topic is...", "Switching gears to..."
   3. Mark those natural transitions as main concepts
   4. Capture all details/examples under each main topic as sub-concepts

❌ BAD approach:
   1. Watch first 10 minutes carefully
   2. Create 3-4 main concepts from that portion
   3. Get tired/lazy and only create sub-concepts for the remaining 50 minutes
   4. Result: Students see no structure in the second half of the video

- Example hierarchy with CLEAR topic separation:
  * Main: "HTTP Protocol Fundamentals" (timestamp: 100, conceptType: "main") ← Instructor introduces HTTP topic
  * Sub: "GET Requests" (timestamp: 120, conceptType: "sub", parentId: "100-0")
  * Sub: "POST Requests" (timestamp: 150, conceptType: "sub", parentId: "100-0")
  * Sub: "Query Parameters" (timestamp: 180, conceptType: "sub", parentId: "100-0")
  * Main: "Authentication & Security" (timestamp: 200, conceptType: "main") ← Instructor transitions to auth topic
  * Sub: "JWT Tokens" (timestamp: 220, conceptType: "sub", parentId: "200-4")
  * Sub: "Token Validation" (timestamp: 250, conceptType: "sub", parentId: "200-4")
  * Main: "Database Integration" (timestamp: 300, conceptType: "main") ← Instructor transitions to database topic
  * Main: "Deployment & Scaling" (timestamp: 450, conceptType: "main") ← Instructor transitions to deployment (late in video - still captured!)

CONCEPT NAMING FOR CLEAR TOPIC TRANSITIONS:
✅ GOOD - Distinct main concepts that signal topic changes:
   • "Introduction to Variables" → "Control Flow Statements" → "Function Definitions" → "Object-Oriented Programming"
   • "Setting Up the Environment" → "Creating React Components" → "Managing State with Hooks" → "API Integration"
   
❌ BAD - Vague or overlapping concepts that confuse students:
   • "Variables" → "More Variables" → "Variable Scope" (too similar - group under ONE main concept)
   • "Introduction" → "Overview" → "Getting Started" (redundant - combine into one)
   • "Part 1" → "Part 2" → "Part 3" (not descriptive - use actual topic names)

MAIN CONCEPT CHECKLIST:
- Does this represent a NEW major topic/subject area?
- Would a student clearly recognize switching to a different subject?
- Is it distinct from other main concepts (not just a variation)?
- Could this stand alone as a separate lesson/module?

DESCRIPTION WRITING GUIDELINES (CRITICAL - FOLLOW EXACTLY):
1. TONE: Casual & conversational - as if chatting with a curious friend
   - REQUIRED: Use "you"/"your" to make it personal
   - Use rhetorical questions when natural: "Ever wonder why...?"
   - Use contractions: "that's", "you'll", "it's", "we're"
   - Natural speech patterns: "So here's the thing...", "Now here's where it gets interesting..."
   
2. LENGTH: MAX ${
    config.concepts.maxDescriptionLength
  } CHARACTERS - ABSOLUTELY NO EXCEPTIONS
   - Descriptions exceeding ${
     config.concepts.maxDescriptionLength
   } chars WILL BE TRUNCATED in the UI
   - Count every character including spaces and punctuation
   - Aim for 120-${
     config.concepts.maxDescriptionLength
   } chars for optimal display
   - Shorter = punchier = better student engagement
   - Remove ALL filler words: "basically", "essentially", "actually", "generally"
   - One core insight only - resist the urge to explain everything
   
3. LANGUAGE: Clear, direct, relatable
   - Avoid academic/corporate jargon unless instructor explicitly uses it
   - If technical term required, explain it IN THE SAME SENTENCE
   - Use everyday analogies: "like a USB port for bank data", "think of it as..."
   - Active voice ONLY: "Banks connect" not "Connections are made by banks"
   - Specific over vague: "2 hours of work" not "significant time investment"

4. STYLE PREFERENCES:
   - Start with action or insight, not context
   - ✅ "APIs let you connect..." not ❌ "In this section, we learn about APIs that let you connect..."
   - Questions engage: "Why do banks struggle?" beats "Banks face challenges"
   - Present tense for timeless concepts, past for specific moments
   
BEFORE SUBMITTING: Count characters! If over ${
    config.concepts.maxDescriptionLength
  }, ruthlessly cut until under limit.

EXAMPLES (all under ${config.concepts.maxDescriptionLength} chars):
✅ GOOD: "Banks today feel disconnected - each service is its own separate app" (72 chars)
✅ GOOD: "APIs let one system talk to many apps at once - that's the 1:many model" (76 chars)
✅ GOOD: "JWT tokens let you log in once and stay logged in securely" (60 chars)
✅ GOOD: "Ever notice how slow traditional banking feels? That's what we're fixing" (75 chars)
❌ BAD: "Explores the limitations of traditional banking architectures" (too formal, jargon)
❌ BAD: "Facilitates interoperability through standardized interfaces" (corporate speak)
❌ BAD: "The modular architecture paradigm facilitates rapid iteration" (academic tone)
❌ BAD: "In this comprehensive section, we'll dive deep into the various aspects of how modern banking systems leverage API architectures to enable seamless integration..." (WAY OVER ${
    config.concepts.maxDescriptionLength
  } chars - UNACCEPTABLE)

VISUAL ELEMENTS FIELD - Use ONLY when:
✅ "Live code demo of async/await syntax"
✅ "Architecture diagram showing microservices flow"
✅ "Terminal showing npm install command"
❌ "Instructor speaking" (no added value)
❌ "Slide with bullet points" (redundant with audio)
❌ "Generic background" (not pedagogically relevant)

2. **QUIZ QUESTIONS** (REQUIRED: ${config.quiz.targetCount.min}-${
    config.quiz.targetCount.max
  }) - Test understanding:
{
  "question": "Clear, specific question testing ${Math.round(
    config.quiz.difficultyWeights.comprehension * 100
  )}% comprehension",
  "options": ["Answer 1", "Answer 2", "Answer 3", "Answer 4"],
  "correctAnswer": 1,
  "explanation": "Why this answer is correct, referencing visual or audio cues",
  "relatedConcept": "Exact concept title this question tests"
}

3. **LEARNING CHECKPOINTS** (REQUIRED: ${config.checkpoints.targetCount.min}-${
    config.checkpoints.targetCount.max
  }) - Interactive pause points (MUST INCLUDE THIS SECTION):
{
  "timestamp": 180,
  "type": "quickQuiz" | "reflection" | "prediction" | "application",
  "prompt": "Engaging question or instruction for student interaction",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],  // Required for quickQuiz only
  "correctAnswer": 0,  // Required for quickQuiz only (0-based index)
  "hint": "Optional helpful clue",
  "relatedConcept": "Link to the concept this reinforces",
  "contextStartTimestamp": 60,  // REQUIRED: Absolute timestamp (in seconds) where meaningful context begins for rewatching. NOT a relative offset - specify the exact moment when the related concept explanation starts.
  "pauseDelaySeconds": 0.35 // REQUIRED: How long after this timestamp to pause (to avoid cutting off mid-sentence, ${
    config.checkpoints.pauseDelaySeconds.min
  }-${config.checkpoints.pauseDelaySeconds.max} secs)
}

⚠️ CRITICAL CHECKPOINT TIMING RULES:

**WHEN TO PLACE CHECKPOINTS** (by type):
1. quickQuiz & reflection & application: MUST be placed AFTER the concept is fully explained
   - Calculate: concept timestamp + time to explain concept (usually 20-90 seconds)
   - Example: If "Open Banking" concept starts at 75s and instructor explains it for ~60s, checkpoint should be at 135s or later
   - Use the transcriptSnippet to understand when explanation ends
   - NEVER ask students about a concept they haven't learned yet!

2. prediction: MUST be placed 5-10 seconds before concept (STRICT - ENFORCED BY VALIDATION)
   - ABSOLUTE REQUIREMENT: checkpoint.timestamp >= (concept.timestamp - 10) AND <= (concept.timestamp - 5)
   - This timing window is validated in post-processing and predictions outside this range WILL BE REJECTED
   - Example: Concept at 100s → prediction MUST be between 90-95s (NO EXCEPTIONS)
   - ❌ AUTOMATIC REJECTION: Prediction >10 seconds before concept OR <5 seconds before concept
   - ❌ BAD: Prediction at 85s, concept at 100s (15s early - TOO EARLY, WILL BE DISCARDED)
   - ❌ BAD: Prediction at 97s, concept at 100s (3s early - TOO LATE, doesn't give thinking time)
   - ✅ GOOD: Prediction at 92s, concept at 100s (8s early - perfect anticipation window)
   - Purpose: Create immediate anticipation without distant guessing that breaks flow
   - The 5-10 second window is empirically tested for optimal engagement - DO NOT deviate

**PLACEMENT STRATEGY**:
- After major concepts (weight: ${
    config.checkpoints.placementStrategy.afterMajorConcept
  }) - highest priority
- After visual demos (weight: ${
    config.checkpoints.placementStrategy.afterVisualDemo
  }) - reinforce hands-on learning
- Before topic transitions (weight: ${
    config.checkpoints.placementStrategy.beforeTransition
  }) - consolidate before moving on
- Mid-concept (weight: ${
    config.checkpoints.placementStrategy.midConcept
  }) - lowest priority
- Minimum ${config.checkpoints.minSpacing}s spacing between checkpoints
- Maximum ${
    config.checkpoints.maxConceptsBeforeCheckpoint
  } concepts before forcing a checkpoint

**NATURAL PAUSE DETECTION** (CRITICAL for smooth experience):
⚠️ ALWAYS place checkpoints at natural pause points in speech:
✅ GOOD placement triggers:
  • After instructor finishes a complete sentence (look for periods in transcript)
  • At topic transition: "Now let's move on...", "Next, we'll cover..."
  • After rhetorical pause: "So what does this mean?" [pause]
  • After demonstrating code/visual: instructor stops typing/drawing and speaks
  • Between slides/sections: instructor takes breath before new topic

❌ BAD placement (jarring interruptions):
  • Mid-sentence: "So the function takes a parameter, and then it—" [PAUSED]
  • During rapid explanation: no breath pause for 30+ seconds
  • While instructor is typing/coding: hands are active
  • During example: "For instance, if we have 1, 2, 3—" [PAUSED]

**HOW TO DETECT NATURAL PAUSES**:
1. Read transcript around your target checkpoint timestamp
2. Look for sentence endings (periods, question marks, exclamation points)
3. Check for transition phrases ("Now...", "So...", "Next...")
4. Prefer timestamps where instructor naturally pauses between thoughts
5. If no natural pause within 3-5 seconds, slightly adjust checkpoint timing

**TIMING PARAMETERS**:
- contextStartTimestamp: Absolute timestamp where the related concept explanation begins
  * NOT a relative offset - specify the exact second when context starts
  * Example: If checkpoint is at 150s and related concept explanation begins at 100s, set contextStartTimestamp to 100
  * For prediction checkpoints placed before a concept, set to start of the visual/context that will help them make the prediction
  * Student can rewatch from this point to get full context
- pauseDelaySeconds (${config.checkpoints.pauseDelaySeconds.min}-${
    config.checkpoints.pauseDelaySeconds.max
  }s): Delay after timestamp to pause at natural break
  * Calculate from transcript: find next period/pause after timestamp
  * Longer (0.4-0.5s) if instructor is mid-sentence, shorter (0.25-0.35s) at natural breaks
  * Use transcript to verify instructor has finished speaking at pause point
  * Default: ${config.checkpoints.pauseDelaySeconds.default}s

TYPE EXAMPLES WITH TIMING:
✅ quickQuiz - Test recall AFTER teaching:
   Concept "REST APIs" at 100s, explained until ~150s
   → Checkpoint at 150s: "Which HTTP method retrieves data?" with options
   
✅ reflection - Prompt self-explanation AFTER teaching:
   Concept "Neural Networks" at 200s, explained until ~280s
   → Checkpoint at 280s: "In your own words, explain what a neural network does"
   
✅ prediction - Engage anticipation BEFORE reveal:
   Concept "useState Hook" coming at 300s
   → Checkpoint at 285s: "What do you think happens when we call useState()?"
   
✅ application - Encourage practice AFTER demonstration:
   Concept "Creating Components" at 400s, demonstrated until ~480s
   → Checkpoint at 480s: "Pause and try creating your own component"

PLACEMENT RULES:
- Space checkpoints ${config.checkpoints.minSpacing}+ seconds apart
- Don't cluster checkpoints (spread across video duration)
- Prioritize placement after high-importance concepts
- Place after visual demos when instructor shows live coding/diagrams
- Insert before major topic transitions to consolidate learning
- **Use transcript snippets to verify concept has been fully explained before placing checkpoint**

4. **TRANSCRIPT**: Array of timestamped transcript items (NOT a single string)
   Format: [{ "text": "sentence or phrase", "timestamp": seconds }, ...]
   ${
     config.transcript.cleanupFiller
       ? '(Remove filler words like "um", "uh", "like")'
       : ""
   }
   - Split transcript into logical chunks (sentences, phrases, or breath pauses)
   - Each chunk should be 1-3 sentences (10-30 seconds of speech)
   - Assign accurate timestamps based on when that text is spoken
   - This enables timestamped transcript display for students

5. **SUMMARY**: 2-3 sentences covering main topics and learning outcomes

6. **DURATION**: Video length in seconds

${generateResponseFormat(config)}

CRITICAL: Return ONLY valid JSON. No markdown fences, no explanations, just pure JSON.`;
}

/**
 * Generate the targets section showing AI what to aim for
 */
function generateTargetsSection(config: AIContentConfig): string {
  const conceptRange = `${config.concepts.targetCount.min}-${config.concepts.targetCount.max}`;
  const quizRange = `${config.quiz.targetCount.min}-${config.quiz.targetCount.max}`;
  const checkpointRange = `${config.checkpoints.targetCount.min}-${config.checkpoints.targetCount.max}`;

  return `
CONTENT GENERATION TARGETS:
- Key Concepts: ${conceptRange} concepts
  • ${Math.round(
    config.concepts.importanceWeights.high * 100
  )}% HIGH importance (must-understand)
  • ${Math.round(
    config.concepts.importanceWeights.medium * 100
  )}% MEDIUM importance (should-understand)
  • ${Math.round(
    config.concepts.importanceWeights.low * 100
  )}% LOW importance (good-to-know)
  • ${Math.round(
    config.concepts.hierarchyWeights.mainConcepts * 100
  )}% main concepts, ${Math.round(
    config.concepts.hierarchyWeights.subConcepts * 100
  )}% sub-concepts

- Quiz Questions: ${quizRange} questions
  • ${Math.round(config.quiz.difficultyWeights.recall * 100)}% recall/definition
  • ${Math.round(
    config.quiz.difficultyWeights.comprehension * 100
  )}% comprehension/understanding  
  • ${Math.round(
    config.quiz.difficultyWeights.application * 100
  )}% application/problem-solving

- Learning Checkpoints: ${checkpointRange} interactive pause points
  • ${Math.round(
    config.checkpoints.typeWeights.quickQuiz * 100
  )}% quickQuiz (test recall)
  • ${Math.round(
    config.checkpoints.typeWeights.reflection * 100
  )}% reflection (self-explanation)
  • ${Math.round(
    config.checkpoints.typeWeights.prediction * 100
  )}% prediction (anticipate next)
  • ${Math.round(
    config.checkpoints.typeWeights.application * 100
  )}% application (hands-on)

TEXT CONSTRAINTS:
- Concept titles: max ${config.concepts.maxTitleLength} chars
- Descriptions: max ${config.concepts.maxDescriptionLength} chars  
- Visual elements: max ${config.concepts.maxVisualElementsLength} chars
`;
}

/**
 * Generate the response format example
 */
function generateResponseFormat(config: AIContentConfig): string {
  return `
RESPONSE FORMAT (PURE JSON, NO MARKDOWN):
{
  "transcript": [
    { "text": "Welcome to Build with Google Cloud where we build things.", "timestamp": 0 },
    { "text": "Reference architectures that can help you make your Google Cloud journey a little bit easier.", "timestamp": 3 },
    { "text": "In this episode, we are going to see how you can build a tiny bank on Google Cloud.", "timestamp": 8 }
  ],
  "concepts": [
    {
      "concept": "REST API Fundamentals",
      "timestamp": 120,
      "transcriptSnippet": "Now let's talk about REST APIs. REST stands for Representational State Transfer, and it's a way for different applications to talk to each other over the internet using standard HTTP methods. You'll use GET to retrieve data, POST to create new data, PUT to update, and DELETE to remove data.",
      "description": "REST (Representational State Transfer) uses HTTP methods to perform CRUD operations on resources",
      "importance": "core",
      "conceptType": "main",
      "visualEmphasis": false
    },
    {
      "concept": "GET Request Anatomy",
      "timestamp": 145,
      "transcriptSnippet": "Let me show you what a GET request looks like. Here we have the fetch function, and you can see the URL we're requesting, followed by the headers object where we specify content type and authorization.",
      "description": "Shows the anatomy of a GET request with URL, headers, and query parameters",
      "importance": "supporting",
      "conceptType": "sub",
      "parentId": "120-0",
      "visualEmphasis": true,
      "visualElements": "Code editor showing fetch() with URL and headers highlighted"
    },
    {
      "concept": "Authentication Strategies",
      "timestamp": 300,
      "transcriptSnippet": "Moving on to security - there are several ways to authenticate API requests. We have token-based authentication, session cookies, and OAuth for third-party access.",
      "description": "Different methods to secure API endpoints including tokens, sessions, and OAuth",
      "importance": "core",
      "conceptType": "main",
      "visualEmphasis": false
    },
    {
      "concept": "JWT Token Implementation",
      "timestamp": 330,
      "transcriptSnippet": "Let me walk you through implementing JWT tokens. Here's how we generate a token with the user payload, sign it with our secret key, and then verify it on subsequent requests.",
      "description": "Implementing JSON Web Tokens for stateless authentication",
      "importance": "supporting",
      "conceptType": "sub",
      "parentId": "300-2",
      "visualEmphasis": true,
      "visualElements": "Live coding JWT generation and verification"
    }
  ],
  "quiz": [
    {
      "question": "What is the primary purpose of REST APIs?",
      "options": [
        "To create graphical interfaces",
        "To enable communication between systems using HTTP",
        "To store data in databases",
        "To compile code"
      ],
      "correctAnswer": 1,
      "explanation": "REST APIs use HTTP methods to enable different systems to communicate and exchange data",
      "relatedConcept": "Understanding REST APIs"
    }
  ],
  "checkpoints": [
    {
      "timestamp": 180,
      "type": "quickQuiz",
      "prompt": "What HTTP method retrieves data without modifying it?",
      "options": ["GET", "POST", "PUT", "DELETE"],
      "correctAnswer": 0,
      "relatedConcept": "REST API Fundamentals",
      "contextStartTimestamp": 105,
      "pauseDelaySeconds": 0.5
    },
    {
      "timestamp": 450,
      "type": "reflection",
      "prompt": "Pause and explain in your own words: Why is REST called 'stateless'?",
      "relatedConcept": "REST Architecture Principles",
      "contextStartTimestamp": 430,
      "pauseDelaySeconds": 0.25
    }
  ],
  "summary": "...",
  "duration": 694
}

⚠️ CRITICAL TIMESTAMP ACCURACY REQUIREMENTS:
1. Measure the ACTUAL video duration in seconds from start to finish
2. EVERY timestamp in concepts, checkpoints, and quiz must be < duration
3. DO NOT hallucinate timestamps beyond the video end
4. Stay conservative - last timestamp should be at least 10 seconds before duration
5. Double-check: If duration is 694s, NO timestamp should exceed 684s

VALIDATION CHECKLIST - Before submitting, verify:
✅ "duration" field contains the ACTUAL video length in seconds (not 0, not a guess)
✅ ALL timestamps (concepts + checkpoints) are LESS than duration
✅ Last timestamp is at least 10 seconds before duration (safety margin)
✅ NO timestamps are hallucinated beyond video end
✅ ALL concepts have "conceptType" field ("main" or "sub")
✅ ALL concepts have "transcriptSnippet" field (what instructor says during that concept)
✅ ALL sub-concepts have "parentId" field (format: "timestamp-index")
✅ ALL concepts have "visualEmphasis" field (true/false)
✅ Main concepts do NOT have parentId
✅ Main concepts are CLEARLY DISTINCT from each other (different topics, not variations)
✅ Main concept titles signal clear TOPIC TRANSITIONS (students can see when subject changes)
✅ No overlapping or redundant main concepts (combine similar topics into one)
✅ At least ${Math.round(
    config.concepts.hierarchyWeights.subConcepts * 100
  )}% are sub-concepts
✅ Sub-concepts grouped under related main concepts
✅ Checkpoint "quickQuiz" has options array + correctAnswer
✅ "checkpoints" array exists and has ${config.checkpoints.targetCount.min}-${
    config.checkpoints.targetCount.max
  } items (CRITICAL - DO NOT SKIP)
✅ **CHECKPOINT TIMING**: quickQuiz/reflection/application checkpoints are placed AFTER their related concept is explained (use transcriptSnippet to verify)
✅ **CHECKPOINT TIMING**: prediction checkpoints can be placed BEFORE their concept
✅ Every checkpoint includes "contextStartTimestamp" - the absolute timestamp where meaningful context begins
✅ Every checkpoint includes "pauseDelaySeconds" within ${
    config.checkpoints.pauseDelaySeconds.min
  }-${config.checkpoints.pauseDelaySeconds.max} seconds
✅ Response includes ALL required sections: concepts, quiz, checkpoints, transcript, summary, duration

CRITICAL: Return ONLY valid JSON. No markdown, no explanations.`;
}

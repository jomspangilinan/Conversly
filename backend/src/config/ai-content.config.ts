/**
 * AI Learning Content Generation Configuration
 *
 * This file contains the "secret sauce" - tunable parameters that control
 * how our AI generates educational content. Adjust these to optimize for
 * different learning styles, content types, and pedagogical approaches.
 */

export interface AIContentConfig {
  // Concept Generation Parameters
  concepts: {
    // How many concepts to generate (min-max range)
    targetCount: { min: number; max: number };

    // Importance distribution (should sum to ~1.0)
    importanceWeights: {
      high: number; // Critical concepts that must be understood
      medium: number; // Important but not critical
      low: number; // Nice-to-know, optional details
    };

    // Concept type distribution
    hierarchyWeights: {
      mainConcepts: number; // Top-level topics (0.6 = 60% of concepts)
      subConcepts: number; // Details under main topics (0.4 = 40%)
    };

    // Visual emphasis detection
    visualEmphasisThreshold: number; // 0-1, higher = more selective about marking visuals

    // Text length constraints (enforced on AI output)
    maxTitleLength: number;
    maxDescriptionLength: number; // Reduced to 150 for conversational brevity
    maxVisualElementsLength: number;
  };

  // Visual Highlight Detection
  visualHighlights: {
    enabled: boolean;
    targetCount: { min: number; max: number };

    // Type preferences (which visual types to prioritize)
    typeWeights: {
      code: number; // Code snippets, terminal commands
      diagram: number; // Architecture, flow charts, mind maps
      demo: number; // Live demonstrations, screen recordings
      formula: number; // Mathematical formulas, equations
      chart: number; // Graphs, data visualizations
    };

    // Minimum duration between highlights (seconds)
    minSpacing: number;
  };

  // Quiz Generation
  quiz: {
    targetCount: { min: number; max: number };

    // Question difficulty distribution
    difficultyWeights: {
      recall: number; // Simple recall questions
      comprehension: number; // Understanding questions
      application: number; // Apply knowledge questions
    };

    // Distractor quality (how tricky wrong answers should be)
    distractorSimilarity: number; // 0-1, higher = more similar to correct answer
  };

  // Learning Checkpoints (Interactive Question Markers)
  checkpoints: {
    enabled: boolean;
    targetCount: { min: number; max: number };

    // How long to let the video play past the checkpoint timestamp before pausing (to avoid harsh cutoffs)
    pauseDelaySeconds: {
      default: number; // Default tail after timestamp
      min: number;
      max: number;
    };

    // When to place checkpoints
    placementStrategy: {
      afterMajorConcept: number; // Weight for placing after high-importance concepts
      midConcept: number; // Weight for placing during complex explanations
      beforeTransition: number; // Weight for placing before topic changes
      afterVisualDemo: number; // Weight for placing after key visual moments
    };

    // Checkpoint types distribution
    typeWeights: {
      quickQuiz: number; // Single multiple choice question
      reflection: number; // "What did you learn?" prompt
      prediction: number; // "What happens next?" question
      application: number; // "Try it yourself" challenge
    };

    // Minimum spacing between checkpoints (seconds)
    minSpacing: number;

    // Maximum concepts before forcing a checkpoint
    maxConceptsBeforeCheckpoint: number;
  };

  // Audio-Visual Sync Analysis
  audioVisualSync: {
    enabled: boolean;

    // How closely audio and visual should be connected
    correlationWeight: number; // 0-1, higher = require stronger connection

    // Time window for linking audio to visual (seconds)
    syncWindow: number;
  };

  // Transcript Enhancement
  transcript: {
    includeTimestamps: boolean;
    timestampInterval: number; // Seconds between timestamps
    cleanupFiller: boolean; // Remove "um", "uh", etc.
  };
}

/**
 * Default Configuration - Optimized for Technical Education
 */
export const defaultAIConfig: AIContentConfig = {
  concepts: {
    targetCount: { min: 5, max: 12 },
    importanceWeights: {
      high: 0.25, // 25% high importance (critical concepts)
      medium: 0.5, // 50% medium (core material)
      low: 0.25, // 25% low (supplementary)
    },
    hierarchyWeights: {
      mainConcepts: 0.65, // 65% main topics
      subConcepts: 0.35, // 35% sub-points
    },
    visualEmphasisThreshold: 0.7, // Only mark truly significant visuals
    maxTitleLength: 80,
    maxDescriptionLength: 150, // Reduced from 250 for conversational brevity
    maxVisualElementsLength: 150,
  },

  visualHighlights: {
    enabled: true,
    targetCount: { min: 2, max: 8 },
    typeWeights: {
      code: 1.2, // Prioritize code examples
      diagram: 1.1, // Prioritize diagrams
      demo: 1.0, // Normal priority
      formula: 0.9, // Slightly lower
      chart: 0.8, // Lowest priority
    },
    minSpacing: 15, // At least 15 seconds between highlights
  },

  quiz: {
    targetCount: { min: 4, max: 8 },
    difficultyWeights: {
      recall: 0.3, // 30% simple recall
      comprehension: 0.5, // 50% understanding
      application: 0.2, // 20% application
    },
    distractorSimilarity: 0.7, // Moderately tricky wrong answers
  },

  checkpoints: {
    enabled: true,
    targetCount: { min: 3, max: 6 },
    pauseDelaySeconds: {
      default: 0.35,
      min: 0.2,
      max: 1.0,
    },
    placementStrategy: {
      afterMajorConcept: 1.3, // Strongly prefer after important concepts
      midConcept: 0.6, // Lower priority during explanations
      beforeTransition: 1.1, // Good spot before switching topics
      afterVisualDemo: 1.2, // Great spot after demos/examples
    },
    typeWeights: {
      quickQuiz: 0.5, // 50% quick quiz questions
      reflection: 0.2, // 20% reflection prompts
      prediction: 0.15, // 15% prediction questions
      application: 0.15, // 15% try-it-yourself
    },
    minSpacing: 120, // Increased to 120s for less intrusive pacing (was 90s)
    maxConceptsBeforeCheckpoint: 3, // Force checkpoint after 3 concepts
  },

  audioVisualSync: {
    enabled: true,
    correlationWeight: 0.8, // Strong connection required
    syncWindow: 3, // ±3 seconds for audio-visual pairing
  },

  transcript: {
    includeTimestamps: true,
    timestampInterval: 30, // Every 30 seconds
    cleanupFiller: true,
  },
};

/**
 * Alternative: Math & Science Configuration
 */
export const mathScienceConfig: AIContentConfig = {
  ...defaultAIConfig,
  concepts: {
    ...defaultAIConfig.concepts,
    importanceWeights: {
      high: 0.35, // More critical concepts in math
      medium: 0.45,
      low: 0.2,
    },
  },
  visualHighlights: {
    ...defaultAIConfig.visualHighlights,
    typeWeights: {
      code: 0.8,
      diagram: 1.3, // Diagrams very important in math
      demo: 0.9,
      formula: 1.4, // Formulas critical
      chart: 1.1,
    },
  },
};

/**
 * Alternative: Creative/Design Configuration
 */
export const creativeConfig: AIContentConfig = {
  ...defaultAIConfig,
  concepts: {
    ...defaultAIConfig.concepts,
    importanceWeights: {
      high: 0.2, // Fewer "must know" concepts
      medium: 0.5,
      low: 0.3, // More exploratory content
    },
  },
  visualHighlights: {
    ...defaultAIConfig.visualHighlights,
    typeWeights: {
      code: 0.6,
      diagram: 1.0,
      demo: 1.4, // Demos very important in creative
      formula: 0.5,
      chart: 0.7,
    },
  },
};

/**
 * Helper function to generate prompt instructions based on config
 */
export function generatePromptInstructions(config: AIContentConfig): string {
  const conceptRange = `${config.concepts.targetCount.min}-${config.concepts.targetCount.max}`;
  const quizRange = `${config.quiz.targetCount.min}-${config.quiz.targetCount.max}`;
  const visualRange = config.visualHighlights.enabled
    ? `${config.visualHighlights.targetCount.min}-${config.visualHighlights.targetCount.max}`
    : "0";

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

- Visual Highlights: ${visualRange} standalone visual moments
  • Prioritize: ${Object.entries(config.visualHighlights.typeWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type]) => type)
    .join(", ")}
  • Minimum ${config.visualHighlights.minSpacing}s spacing between highlights

- Quiz Questions: ${quizRange} questions
  • ${Math.round(config.quiz.difficultyWeights.recall * 100)}% recall/definition
  • ${Math.round(
    config.quiz.difficultyWeights.comprehension * 100
  )}% comprehension/understanding  
  • ${Math.round(
    config.quiz.difficultyWeights.application * 100
  )}% application/problem-solving

- Learning Checkpoints: ${config.checkpoints.targetCount.min}-${
    config.checkpoints.targetCount.max
  } interactive pause points
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
  • Placement: afterMajorConcept (${
    config.checkpoints.placementStrategy.afterMajorConcept
  }x), afterVisualDemo (${
    config.checkpoints.placementStrategy.afterVisualDemo
  }x), beforeTransition (${
    config.checkpoints.placementStrategy.beforeTransition
  }x)
  • Minimum ${config.checkpoints.minSpacing}s spacing, max ${
    config.checkpoints.maxConceptsBeforeCheckpoint
  } concepts before checkpoint

AUDIO-VISUAL SYNC: ${config.audioVisualSync.enabled ? "ENABLED" : "DISABLED"}
${
  config.audioVisualSync.enabled
    ? `- Connect visual elements within ±${config.audioVisualSync.syncWindow}s of related audio
- Only mark visuals that ADD information beyond audio (correlation weight: ${config.audioVisualSync.correlationWeight})`
    : ""
}

TEXT CONSTRAINTS:
- Concept titles: max ${config.concepts.maxTitleLength} chars
- Descriptions: max ${config.concepts.maxDescriptionLength} chars  
- Visual elements: max ${config.concepts.maxVisualElementsLength} chars
`;
}

/**
 * AI Refinement Prompt Template
 * Used to analyze existing content and suggest improvements
 */
export function buildRefinementPrompt(
  existingConcepts: any[],
  existingCheckpoints: any[],
  existingQuiz: any[],
  videoMetadata: any,
  engagementAnalysis?: any,
  focusArea?: string
): string {
  const formatSeconds = (seconds?: number) => {
    if (typeof seconds !== "number" || Number.isNaN(seconds)) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${seconds} seconds (~${mins}:${String(secs).padStart(2, "0")})`;
  };

  const durationDisplay = formatSeconds(videoMetadata?.duration) || "Unknown";

  const engagementContext = engagementAnalysis
    ? `

ENGAGEMENT ANALYSIS REPORT:
This video has been analyzed for learning effectiveness. Use these insights to guide your refinement suggestions.

**Engagement Score**: ${engagementAnalysis.engagementRate?.score || "N/A"}/100
- Strengths: ${
        engagementAnalysis.engagementRate?.strengths?.join(", ") ||
        "None identified"
      }
- Weaknesses: ${
        engagementAnalysis.engagementRate?.weaknesses?.join(", ") ||
        "None identified"
      }

**Active/Passive Balance**: ${
        engagementAnalysis.activePassiveBalance?.score || "N/A"
      }/100 (${
        engagementAnalysis.activePassiveBalance?.activePercentage || 0
      }% active, ${
        engagementAnalysis.activePassiveBalance?.passivePercentage || 0
      }% passive)
- Analysis: ${
        engagementAnalysis.activePassiveBalance?.analysis ||
        "No analysis available"
      }

**Learning Rate Graph** (Attention retention across video):
${
  engagementAnalysis.learningRateGraph?.segments
    ?.map(
      (seg: any, i: number) =>
        `  Segment ${i + 1} (${seg.timeRange}): ${seg.score}/100`
    )
    .join("\n") || "No data available"
}
- Critical Drops: ${
        engagementAnalysis.learningRateGraph?.criticalDrops
          ?.map(
            (drop: any) =>
              `${drop.timeRange} (${drop.score}/100) - ${drop.reason}`
          )
          .join("; ") || "None"
      }
- Analysis: ${
        engagementAnalysis.learningRateGraph?.analysis ||
        "No analysis available"
      }

**Accessibility Score**: ${
        engagementAnalysis.accessibilityScore?.score || "N/A"
      }/100
- Prerequisites: ${
        engagementAnalysis.accessibilityScore?.prerequisites?.join(", ") ||
        "None"
      }
- Barriers: ${
        engagementAnalysis.accessibilityScore?.barriers?.join(", ") ||
        "None identified"
      }

**Teaching Quality**: ${engagementAnalysis.pedagogicalScore?.score || "N/A"}/100
`
    : "";

  const focusContext = focusArea
    ? `

**CREATOR FOCUS**: The creator specifically wants to improve: "${focusArea}"
Prioritize suggestions that address this focus area. Make these suggestions actionable and specific.
`
    : "";

  return `You are an expert educational content analyzer. Review the existing learning content (concepts, checkpoints, quizzes) from this video and suggest improvements.

⚠️ CRITICAL REQUIREMENTS:
1. TIME UNITS: All timestamps MUST be numeric seconds (not mm:ss)
2. TIMESTAMP VALIDATION: Video duration is ${
    videoMetadata?.duration || 0
  } seconds
   - ALL suggested timestamps MUST be less than ${
     videoMetadata?.duration || 0
   } seconds
   - DO NOT suggest timestamps beyond video end
   - Keep 10-second safety margin from video end
3. Any mm:ss shown below is just for human readability - output numeric seconds only

VIDEO METADATA:
- Duration: ${durationDisplay}
- Title: ${
    videoMetadata?.title || "Untitled"
  }${engagementContext}${focusContext}

EXISTING CONCEPTS (${existingConcepts.length} total):
${existingConcepts
  .map(
    (c, i) =>
      `${i + 1}. [${Math.floor(c.timestamp / 60)}:${String(
        Math.floor(c.timestamp % 60)
      ).padStart(2, "0")}] ${c.concept} (${c.conceptType || "main"}, ${
        c.importance
      })
   Description: ${c.description}`
  )
  .join("\n\n")}

EXISTING CHECKPOINTS (${existingCheckpoints.length} total):
${existingCheckpoints
  .map(
    (cp, i) =>
      `${i + 1}. [${Math.floor(cp.timestamp / 60)}:${String(
        Math.floor(cp.timestamp % 60)
      ).padStart(2, "0")}] ${cp.type} ${
        cp.type === "prediction"
          ? "(OK BEFORE concept)"
          : "(MUST BE AFTER concept)"
      }
   Prompt: ${cp.prompt}
   Related Concept: ${cp.relatedConcept || "None specified"}
   Context Start Timestamp: ${cp.contextStartTimestamp ?? "(missing)"}
   Pause Delay Seconds: ${cp.pauseDelaySeconds ?? "(missing)"}`
  )
  .join("\n\n")}

EXISTING QUIZ QUESTIONS (${existingQuiz.length} total):
${existingQuiz
  .map(
    (q, i) =>
      `${i + 1}. ${q.question}
   Options: ${q.options.join(", ")}
   Correct: ${q.options[q.correctAnswer]}`
  )
  .join("\n\n")}

YOUR TASK:
Analyze ALL content above and provide SEVEN types of suggestions:

1. **Concepts to Add**: Are there important topics/concepts from the video that are MISSING? Consider:
   - Major topics not covered in the timeline
   - Important examples or details that should be separate concepts
   - Critical transitions between topics

2. **Concepts to Improve**: Which existing concepts could be enhanced? Consider:
   - Unclear or vague concept titles
   - Descriptions that don't capture the essence
   - Incorrect importance levels
   - Missing visual context

3. **Timeline Gaps**: Are there large time gaps with no concepts? Identify:
   - Time ranges (e.g., 5:30 - 8:45) with no concepts
   - Why these gaps might be problematic
   - What content might be in those gaps

4. **Checkpoints to Add**: Suggest strategic moments for learning checkpoints:
   - After major concepts for quick quizzes
   - Before complex topics for predictions
   - During transitions for reflections
   - **IMPORTANT**: Ensure variety - avoid consecutive checkpoints of the same type
   - Check existing checkpoint timestamps and types to avoid duplicates
   - Space out checkpoints by at least 30-60 seconds
  - For each suggested checkpoint, include "contextStartTimestamp" (absolute timestamp where context begins) and "pauseDelaySeconds" (${
    defaultAIConfig.checkpoints.pauseDelaySeconds.min
  }-${defaultAIConfig.checkpoints.pauseDelaySeconds.max}, default ${
    defaultAIConfig.checkpoints.pauseDelaySeconds.default
  })

5. **Checkpoints to Improve**: Enhance existing checkpoints:
   - Better prompts or questions
   - More appropriate types (quickQuiz, reflection, prediction, application)
   - Better timing in the video
   - **CRITICAL TIMING CHECK**: If checkpoint type is quickQuiz/reflection/application:
     * Find the related concept's timestamp
     * Verify checkpoint timestamp is AFTER concept explanation completes (usually concept timestamp + 20-90 seconds)
     * If checkpoint is BEFORE or too close to concept, suggest moving it later
     * Example: If "Open Banking" concept is at 75s and checkpoint asking about it is at 85s, move checkpoint to ~135s (after 60s explanation)
   - **prediction type**: These CAN be before the concept (that's the point)
   - **IMPORTANT**: If changing type, ensure it doesn't create consecutive same-type checkpoints
   - If you suggest moving/keeping a checkpoint, also set "contextStartTimestamp" and "pauseDelaySeconds"

6. **Quiz Questions to Add**: Suggest additional quiz questions:
   - Cover important concepts not in current quiz
   - Test deeper understanding
   - Include practical applications
   - **IMPORTANT**: Avoid questions that are too similar to existing ones
   - Each question should test a distinct concept or skill

7. **Quiz Questions to Improve**: Enhance existing questions:
   - Clearer wording
   - Better distractors (wrong options)
   - More accurate explanations
   - **IMPORTANT**: Ensure improved questions remain distinct from other quiz questions

RESPONSE FORMAT (JSON only):
{
  "conceptsToAdd": [
    {
      "concept": {
        "concept": "Title of new concept",
        "timestamp": 180,
        "description": "Clear description",
        "importance": "core" | "supporting" | "supplementary",
        "conceptType": "main" | "sub",
        "parentId": "optional parent concept title"
      },
      "reason": "Why this concept should be added"
    }
  ],
  "conceptsToImprove": [
    {
      "original": { ...existing concept... },
      "improved": { ...improved version... },
      "reason": "What's being improved and why"
    }
  ],
  "timelineGaps": [
    {
      "startTime": 330,
      "endTime": 510,
      "reason": "3-minute gap with no concepts - likely contains important content"
    }
  ],
  "checkpointsToAdd": [
    {
      "checkpoint": {
        "timestamp": 240,
        "type": "quickQuiz" | "reflection" | "prediction" | "application",
        "prompt": "Question or prompt text",
        "options": ["Option 1", "Option 2"],
        "correctAnswer": 0,
        "hint": "Optional hint",
        "relatedConcept": "Related concept title",
        "contextStartTimestamp": 220,
        "pauseDelaySeconds": 0.35
      },
      "reason": "Why this checkpoint would be valuable"
    }
  ],
  "checkpointsToImprove": [
    {
      "original": { ...existing checkpoint... },
      "improved": { ...improved version including contextStartTimestamp and pauseDelaySeconds... },
      "reason": "What's being improved and why"
    }
  ],
  "quizQuestionsToAdd": [
    {
      "question": {
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "explanation": "Why this is correct"
      },
      "reason": "Why this question is needed"
    }
  ],
  "quizQuestionsToImprove": [
    {
      "original": { ...existing question... },
      "improved": { ...improved version... },
      "reason": "What's being improved and why"
    }
  ]
}

IMPORTANT:
- Only suggest concepts that would genuinely improve learning
- Don't suggest changes for the sake of it
- Be specific about timestamps and improvements
- ALWAYS include "contextStartTimestamp" (absolute timestamp where context begins) and "pauseDelaySeconds" for any checkpoint you add or improve
  • contextStartTimestamp: The exact second where the related concept explanation begins (NOT a relative offset)
  • pauseDelaySeconds: ${defaultAIConfig.checkpoints.pauseDelaySeconds.min}-${
    defaultAIConfig.checkpoints.pauseDelaySeconds.max
  } (default ${defaultAIConfig.checkpoints.pauseDelaySeconds.default})
- If everything looks good, arrays can be empty
- Return ONLY valid JSON, no markdown formatting`;
}

/**
 * Engagement Analysis Prompt Template
 * Analyzes video's effectiveness for student learning
 */
export function buildEngagementPrompt(
  concepts: any[],
  checkpoints: any[],
  quiz: any[],
  videoMetadata: any
): string {
  const formatSeconds = (seconds?: number) => {
    if (typeof seconds !== "number" || Number.isNaN(seconds)) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${seconds} seconds (~${mins}:${String(secs).padStart(2, "0")})`;
  };

  const durationDisplay =
    formatSeconds(videoMetadata?.duration) || "Unknown seconds";

  return `You are an expert learning science analyst. Evaluate this educational video's effectiveness for student engagement and learning outcomes.

⚠️ CRITICAL REQUIREMENTS:
1. TIME UNITS: All timestamps MUST be numeric seconds (not mm:ss)
2. TIMESTAMP VALIDATION: Video duration is ${
    videoMetadata?.duration || 0
  } seconds
   - ALL timestamps MUST be less than ${videoMetadata?.duration || 0} seconds
   - DO NOT reference timestamps beyond video end
   - Keep 10-second safety margin from video end
3. Any mm:ss notation below is only for readability - output numeric seconds

VIDEO METADATA:
- Duration: ${durationDisplay}
- Title: ${videoMetadata?.title || "Untitled"}
- Concepts: ${concepts.length} total
- Checkpoints: ${checkpoints.length} interactive moments
- Quiz Questions: ${quiz.length} total
- Checkpoint pause delay range: ${
    defaultAIConfig.checkpoints.pauseDelaySeconds.min
  }-${defaultAIConfig.checkpoints.pauseDelaySeconds.max}s (default ${
    defaultAIConfig.checkpoints.pauseDelaySeconds.default
  }s)

CONTENT OVERVIEW:
${concepts
  .slice(0, 10)
  .map(
    (c, i) =>
      `${i + 1}. [${Math.floor(c.timestamp / 60)}:${String(
        Math.floor(c.timestamp % 60)
      ).padStart(2, "0")}] ${c.concept} (${c.importance})`
  )
  .join("\n")}
${concepts.length > 10 ? `... and ${concepts.length - 10} more concepts` : ""}

YOUR TASK:
Analyze this video across multiple learning dimensions and provide actionable insights. 
**IMPORTANT**: Use simple, clear language that any creator can understand. Avoid academic jargon.

1. **Engagement Rate (0-100)**: How engaging is this content for students?
   - Consider: Pacing, concept density, **interactive checkpoints**, variety
   - **IMPORTANT**: Checkpoints are designed to boost engagement through active learning
   - Higher checkpoint frequency = higher engagement scores
   - Identify: High-engagement moments and drop-off points
   - **USE PLAIN LANGUAGE**: Instead of "pedagogical scaffolding", say "step-by-step learning"
   
2. **Learning Accessibility (0-100)**: How accessible is this for different learners?
   - Consider: Prerequisite knowledge, concept clarity, scaffolding
   - **IMPORTANT**: Checkpoints help break down complex content and make it more accessible
   - Identify: Barriers for beginners, complexity jumps
   - **USE PLAIN LANGUAGE**: Instead of "cognitive load", say "too much at once"
   
3. **Active vs Passive Learning Balance (0-100)**: 
   - 0 = Purely passive (lecture-style, no interaction)
   - 100 = Purely active (hands-on, interactive)
   - **CRITICAL**: Each checkpoint and quiz question adds active learning
   - ${checkpoints.length} checkpoints and ${
    quiz.length
  } quiz questions should significantly increase the active learning score
   - Calculate active % based on: (checkpoint time + quiz time + discussion time) / total duration
   - Ideal range: 40-70 for most content
   
4. **Learning Rate Graph**: Map engagement/retention over time
   - Divide video into 10 equal segments
   - Rate each segment 0-100 for learning effectiveness
   - **BOOST scores near checkpoints**: Segments with checkpoints should have +10-20 higher scores
   - Identify where students might lose focus (long passive sections without checkpoints)
  - Consider whether checkpoints have gentle pause timing (pauseDelaySeconds) to support understanding
   - **USE PLAIN LANGUAGE**: Keep reasons short and actionable

5. **Pedagogical Score (0-100)**: Overall teaching quality
   - Consider: Concept scaffolding, examples, reinforcement, **checkpoint placement**, assessment alignment
   - **REWARD**: Well-timed checkpoints that reinforce learning = higher scores
   - **USE PLAIN LANGUAGE**: Write feedback like you're talking to a teacher, not an academic

**LANGUAGE RULES**:
- Keep sentences short (max 15 words when possible)
- Avoid terms like: "pedagogical scaffolding", "cognitive load", "metacognitive", "epistemological"
- Use simple words: "learning steps" not "scaffolding", "too complex" not "high cognitive demand"
- Be specific and actionable: "Add a checkpoint at 5:30 to test understanding" not "Consider implementing formative assessment touchpoints"

RESPONSE FORMAT (JSON only):
{
  "engagementRate": {
    "score": 75,
    "strengths": ["Clear examples", "Good pacing"],
    "weaknesses": ["Long lecture sections", "Few interactions"],
    "recommendations": ["Add checkpoint at 5:30", "Break down concept X"]
  },
  "accessibilityScore": {
    "score": 60,
    "prerequisites": ["Basic JavaScript", "HTTP concepts"],
    "barriers": ["Assumes React knowledge", "No intro to terminology"],
    "improvements": ["Add glossary", "Explain X before Y"]
  },
  "activePassiveBalance": {
    "score": 35,
    "activePercentage": 20,
    "passivePercentage": 80,
    "analysis": "Too lecture-heavy, needs more hands-on moments",
    "recommendations": ["Add coding checkpoints", "Include prediction questions"]
  },
  "learningRateGraph": {
    "segments": [
      { "timeRange": "0:00-1:00", "score": 85, "reason": "Strong intro, clear objectives" },
      { "timeRange": "1:00-2:00", "score": 70, "reason": "Good examples but dense" },
      { "timeRange": "2:00-3:00", "score": 45, "reason": "Complex section, no pause" },
      ...10 segments total
    ],
      "criticalDropPoints": [
        { "timestamp": 180, "reason": "Concept overload, needs checkpoint with 8s pre-roll and 0.4s pause delay" }
      ]
  },
  "pedagogicalScore": {
    "score": 72,
    "strengths": ["Good scaffolding", "Clear examples"],
    "gaps": ["Missing formative assessment", "No spaced repetition"],
    "improvements": ["Add recap at midpoint", "Include more practice"]
  },
  "overallAnalysis": {
    "totalScore": 67,
    "tier": "Good" | "Needs Improvement" | "Excellent" | "Poor",
    "topPriorities": [
      "Add interaction at 3:15 to break passive section",
      "Simplify concept X for better accessibility",
      "Include recap checkpoint at midpoint"
    ]
  }
}

IMPORTANT:
- Be specific with timestamps and actionable recommendations
- Base scores on learning science principles
- Identify concrete improvement opportunities
- Return ONLY valid JSON, no markdown formatting`;
}

// Backend tool configuration for proactive tutoring

export const proactiveTutorTools = {
  // Tool: Check if user should be prompted at checkpoint
  checkShouldPrompt: {
    name: "checkShouldPrompt",
    description:
      "Determines if the tutor should proactively prompt the student at a checkpoint based on their interaction history",
    parameters: {
      checkpointId: "string",
      checkpointType: "quickQuiz | reflection | prediction | application",
      userInteractionCount: "number", // how many times they've interacted this session
      completedCheckpoints: "number", // how many checkpoints they've completed
    },
  },

  // Tool: Get proactive prompt suggestion
  getProactivePrompt: {
    name: "getProactivePrompt",
    description:
      "Generate a contextual, proactive prompt for the student based on video content and their progress",
    parameters: {
      checkpoint: "object", // full checkpoint data
      recentConcepts: "array", // concepts covered recently
      struggleAreas: "array", // concepts user had trouble with
      timeWatched: "number", // minutes watched so far
    },
  },
};

// Proactive prompt templates based on checkpoint type and context
export const proactivePrompts = {
  quickQuiz: [
    "Before we move on, can you explain {concept} back to me in your own words?",
    "Quick check—what's the main idea of {concept}?",
    "Let's make sure you've got this: how would you describe {concept} to a friend?",
  ],
  reflection: [
    "This is a crucial concept. Want me to quiz you on {concept} to lock it in?",
    "I noticed we just covered {concept}. Should we test your understanding?",
    "This part about {concept} trips a lot of people up. Want to talk through it?",
  ],
  prediction: [
    "That was complex—any part of {concept} you want me to clarify?",
    "How are you feeling about {concept}? Need me to break it down differently?",
    "Before we continue, is {concept} making sense, or should we review?",
  ],
  application: [
    "That was complex—any part of {concept} you want me to clarify?",
    "How are you feeling about {concept}? Need me to break it down differently?",
    "Before we continue, is {concept} making sense, or should we review?",
  ],

  // Contextual prompts based on behavior
  struggling: [
    "I see you rewatched that section. Want me to explain {concept} a different way?",
    "That part seemed tricky. Let's work through {concept} together.",
  ],
  engaged: [
    "You're doing great! Ready for a quick challenge on {concept}?",
    "Nice progress! Want to test yourself on what we just learned?",
  ],
  firstCheckpoint: [
    "Hey! I'm here to help you master this material. Let's start by checking: did {concept} make sense?",
    "Welcome! I'll pop in at key moments to help. First up: can you explain {concept}?",
  ],
};

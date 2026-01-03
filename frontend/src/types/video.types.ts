/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Video {
  id: string;
  title: string;
  description?: string;
  filename: string;
  storagePath: string;
  uploadedAt: Date | string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  status: "uploading" | "processing" | "ready" | "error";
  processingStage?:
    | "initializing"
    | "uploading_to_gemini"
    | "analyzing_content"
    | "complete"
    | "failed";
  duration?: number;
  transcript?: TranscriptItem[];
  concepts?: Concept[];
  quiz?: QuizQuestion[];
  checkpoints?: LearningCheckpoint[];
  summary?: string;
  visualHighlights?: VisualHighlight[];
  error?: string;
  // Cached AI analysis
  aiAnalysisCompletedAt?: Date | string;
  aiAnalysisVersion?: string;
  // AI Refinement status
  refinementStatus?: "idle" | "refining" | "complete" | "error";
  refinementSuggestions?: {
    conceptsToAdd: Array<{
      concept: Concept;
      reason: string;
    }>;
    conceptsToImprove: Array<{
      original: Concept;
      improved: Concept;
      reason: string;
    }>;
    timelineGaps: Array<{
      startTime: number;
      endTime: number;
      reason: string;
    }>;
    checkpointsToAdd: Array<{
      checkpoint: LearningCheckpoint;
      reason: string;
    }>;
    checkpointsToImprove: Array<{
      original: LearningCheckpoint;
      improved: LearningCheckpoint;
      reason: string;
    }>;
    quizQuestionsToAdd: Array<{
      question: QuizQuestion;
      reason: string;
    }>;
    quizQuestionsToImprove: Array<{
      original: QuizQuestion;
      improved: QuizQuestion;
      reason: string;
    }>;
  };
  refinementCompletedAt?: Date | string;
  refinementError?: string;
  engagementStatus?: "idle" | "analyzing" | "complete" | "error";
  engagementAnalysis?: {
    engagementRate: any;
    accessibilityScore: any;
    activePassiveBalance: any;
    learningRateGraph: any;
    pedagogicalScore: any;
    overallAnalysis: any;
  };
  engagementAnalyzedAt?: Date | string;
  engagementError?: string;
}

export interface TranscriptItem {
  text: string;
  timestamp: number;
  endTime?: number;
}

export interface Concept {
  concept: string;
  description: string;
  timestamp: number;
  importance: "core" | "supporting" | "supplementary";
  visualElements?: string; // On-screen code, diagrams, or text
  parentId?: string; // For nested/child concepts under a main concept
  visualEmphasis?: boolean; // AI-detected important visual moment
  conceptType?: "main" | "sub"; // Main concept or sub-point
  // Optional fields used by some UI variants
  displayDurationSeconds?: number;
  transcriptSnippet?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  relatedConcept: string;
}

export interface LearningCheckpoint {
  timestamp: number; // Checkpoint trigger time in seconds
  type: "quickQuiz" | "reflection" | "prediction" | "application";
  prompt: string; // The question or prompt to show
  options?: string[]; // For quickQuiz type
  correctAnswer?: string; // For quickQuiz type (changed from number to string)
  hint?: string; // Optional hint for students
  relatedConcept?: string; // Link to concept this checkpoint reinforces
  contextStartTimestamp?: number; // Absolute timestamp (in seconds) where meaningful context begins for rewatching
  pauseDelaySeconds?: number; // Delay in seconds after timestamp before pausing to avoid abrupt cutoff
}

export interface VisualHighlight {
  timestamp: number;
  type: string; // 'code', 'diagram', 'text', 'demo', 'chart'
  content: string;
  description: string;
}

export interface UploadProgress {
  status: "idle" | "uploading" | "processing" | "complete" | "error";
  progress: number; // 0-100
  message?: string;
  error?: string;
  processingStage?: string;
}

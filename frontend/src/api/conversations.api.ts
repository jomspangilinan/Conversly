import apiClient from "./client";
import { getApiEndpoint } from "../utils/mock";
import type {
  Concept,
  TranscriptItem,
  LearningCheckpoint,
} from "../types/video.types";
import type { VideoInteraction } from "../components/student/InteractionLog";

export type TutorRole = "user" | "assistant";

export interface TutorMessage {
  role: TutorRole;
  text: string;
  timestamp: number;
}

export interface TutorContextSnapshot {
  currentTime: number;
  transcriptSnippet?: string;
  nearbyConcepts?: Array<Pick<Concept, "concept" | "timestamp" | "importance">>;
  allConcepts?: Array<
    Pick<
      Concept,
      "concept" | "timestamp" | "importance" | "conceptType" | "parentId"
    >
  >;
  nearbyCheckpoints?: Array<
    Pick<LearningCheckpoint, "timestamp" | "type" | "prompt" | "relatedConcept">
  >;
  allCheckpoints?: Array<
    Pick<LearningCheckpoint, "timestamp" | "type" | "prompt" | "relatedConcept">
  >;
  interactionSummary?: {
    windowSeconds: number;
    counts: Record<string, number>;
    lastCheckpointResult?: {
      isCorrect?: boolean;
      checkpointType?: string;
      checkpoint?: string;
      selectedAnswer?: string;
      correctAnswer?: string;
    };
  };
  recentMessages?: Array<Pick<TutorMessage, "role" | "text" | "timestamp">>;
}

export interface AskTutorRequest {
  videoId: string;
  question: string;
  timestamp?: number;
  context?: TutorContextSnapshot;
}

export interface AskTutorResponse {
  videoId: string;
  question: string;
  timestamp?: number;
  answer: string;
}

export interface ContextSummaryRequest {
  videoId: string;
  context: TutorContextSnapshot;
}

export interface ContextSummaryResponse {
  videoId: string;
  summary: string;
  error?: string;
}

export function buildTutorContextSnapshot(params: {
  currentTime: number;
  transcript?: TranscriptItem[];
  concepts?: Concept[];
  checkpoints?: LearningCheckpoint[];
  interactions?: VideoInteraction[];
  recentMessages?: TutorMessage[];
}): TutorContextSnapshot {
  const {
    currentTime,
    transcript = [],
    concepts = [],
    checkpoints = [],
    interactions = [],
    recentMessages = [],
  } = params;

  const transcriptWindowSeconds = 40;
  const snippetItems = transcript
    .filter(
      (t) => Math.abs(t.timestamp - currentTime) <= transcriptWindowSeconds
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 20);

  const transcriptSnippet = snippetItems.length
    ? snippetItems
        .map((t) => `[${Math.floor(t.timestamp)}s] ${t.text}`)
        .join("\n")
    : undefined;

  const nearbyConcepts = concepts
    .slice()
    .sort(
      (a, b) =>
        Math.abs(a.timestamp - currentTime) -
        Math.abs(b.timestamp - currentTime)
    )
    .slice(0, 5)
    .map((c) => ({
      concept: c.concept,
      timestamp: c.timestamp,
      importance: c.importance,
    }));

  const allConcepts = concepts
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 100)
    .map((c) => ({
      concept: c.concept,
      timestamp: c.timestamp,
      importance: c.importance,
      conceptType: c.conceptType,
      parentId: c.parentId,
    }));

  const nearbyCheckpoints = checkpoints
    .slice()
    .sort(
      (a, b) =>
        Math.abs(a.timestamp - currentTime) -
        Math.abs(b.timestamp - currentTime)
    )
    .slice(0, 5)
    .map((cp) => ({
      timestamp: cp.timestamp,
      type: cp.type,
      prompt: cp.prompt,
      relatedConcept: cp.relatedConcept,
    }));

  const allCheckpoints = checkpoints
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 100)
    .map((cp) => ({
      timestamp: cp.timestamp,
      type: cp.type,
      prompt: cp.prompt,
      relatedConcept: cp.relatedConcept,
    }));

  const interactionWindowSeconds = 180;
  const recentInteractions = interactions.filter(
    (i) => Math.abs(i.videoTime - currentTime) <= interactionWindowSeconds
  );

  const counts: Record<string, number> = {};
  for (const i of recentInteractions) {
    counts[i.type] = (counts[i.type] || 0) + 1;
  }

  const lastCheckpointComplete = interactions
    .slice()
    .reverse()
    .find((i) => i.type === "checkpoint_complete");

  const lastCheckpointResult = lastCheckpointComplete
    ? {
        isCorrect: lastCheckpointComplete.metadata?.isCorrect,
        checkpointType: lastCheckpointComplete.metadata?.checkpointType,
        checkpoint: lastCheckpointComplete.metadata?.checkpoint,
        selectedAnswer: lastCheckpointComplete.metadata?.selectedAnswer,
        correctAnswer: lastCheckpointComplete.metadata?.correctAnswer,
      }
    : undefined;

  const recentMessagesTrimmed = recentMessages.slice(-10).map((m) => ({
    role: m.role,
    text: m.text,
    timestamp: m.timestamp,
  }));

  return {
    currentTime,
    transcriptSnippet,
    nearbyConcepts,
    allConcepts: allConcepts.length ? allConcepts : undefined,
    nearbyCheckpoints,
    allCheckpoints: allCheckpoints.length ? allCheckpoints : undefined,
    interactionSummary: {
      windowSeconds: interactionWindowSeconds,
      counts,
      lastCheckpointResult,
    },
    recentMessages: recentMessagesTrimmed,
  };
}

export const conversationsAPI = {
  async askTutor(payload: AskTutorRequest): Promise<AskTutorResponse> {
    const endpoint = getApiEndpoint("/api/conversations/ask");
    const response = await apiClient.post<AskTutorResponse>(endpoint, payload);
    return response.data;
  },

  async summarizeContext(
    payload: ContextSummaryRequest
  ): Promise<ContextSummaryResponse> {
    const endpoint = getApiEndpoint("/api/conversations/context-summary");
    const response = await apiClient.post<ContextSummaryResponse>(
      endpoint,
      payload
    );
    return response.data;
  },
};

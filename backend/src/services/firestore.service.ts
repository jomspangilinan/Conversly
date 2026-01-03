import admin from "firebase-admin";
import { config } from "../config/env.js";
import type {
  VideoConcept,
  QuizQuestion,
  VideoAnalysisResult,
} from "./gemini.service.js";

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (config.server.env === "production") {
    // Use Application Default Credentials in production (Cloud Run)
    admin.initializeApp({
      projectId: config.gcp.projectId,
    });
  } else {
    // Use service account key file in development
    admin.initializeApp({
      credential: admin.credential.cert(config.gcp.serviceAccountPath),
      projectId: config.gcp.projectId,
    });
  }
}

const db = admin.firestore();
const CHECKPOINT_RESPONSES_COLLECTION = "checkpoint_responses";

const USERS_COLLECTION = "users";

// Collections
const VIDEOS_COLLECTION = "videos";
const PROGRESS_COLLECTION = "user_progress";
const CONVERSATIONS_COLLECTION = "conversations";

export interface Video {
  id: string;
  filename: string;
  storagePath: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  transcript?: string;
  concepts?: VideoConcept[];
  quiz?: QuizQuestion[];
  checkpoints?: Array<{
    timestamp: number;
    type: "quickQuiz" | "reflection" | "prediction" | "application";
    prompt: string;
    options?: string[];
    correctAnswer?: number;
    hint?: string;
    relatedConcept?: string;
  }>;
  summary?: string;
  duration?: number;
  uploadedBy?: string;
  uploadedAt: Date;
  processedAt?: Date;
  aiAnalysisCompletedAt?: Date;
  aiAnalysisVersion?: string;
  status: "uploading" | "processing" | "ready" | "error";
  processingStage?:
    | "initializing"
    | "uploading_to_gemini"
    | "analyzing_content";
  error?: string;
  refinementStatus?: "idle" | "refining" | "complete" | "error";
  refinementSuggestions?: {
    conceptsToAdd: Array<{
      concept: VideoConcept;
      reason: string;
    }>;
    conceptsToImprove: Array<{
      original: VideoConcept;
      improved: VideoConcept;
      reason: string;
    }>;
    timelineGaps: Array<{
      startTime: number;
      endTime: number;
      reason: string;
    }>;
    checkpointsToAdd: Array<{
      checkpoint: any;
      reason: string;
    }>;
    checkpointsToImprove: Array<{
      original: any;
      improved: any;
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
  refinementCompletedAt?: Date;
  refinementError?: string;
  refinementFocusArea?: string;
  createdAt?: Date;
  engagementStatus?: "idle" | "analyzing" | "complete" | "error";
  engagementAnalysis?: {
    engagementRate: any;
    accessibilityScore: any;
    activePassiveBalance: any;
    learningRateGraph: any;
    pedagogicalScore: any;
    overallAnalysis: any;
  };
  engagementAnalyzedAt?: Date;
  engagementError?: string;
}

export interface UserProgress {
  userId: string;
  videoId: string;
  watchedDuration: number;
  totalDuration: number;
  completionPercentage: number;
  lastWatchedAt: Date;
  quizScore?: number;
  quizAttempts?: number;
  conceptsViewed: string[];
}

export type UserRole = "student" | "creator";

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await db.collection(USERS_COLLECTION).doc(uid).get();
  if (!snapshot.exists) return null;
  return snapshot.data() as UserProfile;
}

export async function upsertUserProfile(data: {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
}): Promise<UserProfile> {
  const ref = db.collection(USERS_COLLECTION).doc(data.uid);
  const existing = await ref.get();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const payload: Record<string, unknown> = {
    uid: data.uid,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    role: data.role,
    updatedAt: now,
  };

  if (!existing.exists) {
    payload.createdAt = now;
  }

  await ref.set(payload, { merge: true });
  const updated = await ref.get();
  return updated.data() as UserProfile;
}

export interface Conversation {
  id: string;
  videoId: string;
  userId: string;
  question: string;
  answer: string;
  timestamp: Date;
}

export interface CheckpointResponse {
  userId: string;
  videoId: string;
  checkpointKey: string;
  checkpointType: string;
  prompt: string;
  timestamp: number;
  selectedIndex: number;
  isCorrect: boolean;
  answerText?: string;
  answeredAt: Date;
  videoTime?: number;
  options?: string[];
  studentName?: string;
}

/**
 * Create a new video record
 */
export async function createVideo(data: {
  filename: string;
  storagePath: string;
  uploadedBy?: string;
  title?: string;
  description?: string;
}): Promise<string> {
  const videoRef = db.collection(VIDEOS_COLLECTION).doc();

  const video: Record<string, unknown> = {
    filename: data.filename,
    storagePath: data.storagePath,
    uploadedAt: new Date(),
    status: "uploading",
  };

  // Only add optional fields if they're provided
  if (data.title) video.title = data.title;
  if (data.description) video.description = data.description;
  if (data.uploadedBy) video.uploadedBy = data.uploadedBy;

  await videoRef.set(video);
  return videoRef.id;
}

/**
 * Update video with analysis results
 */
export async function updateVideoAnalysis(
  videoId: string,
  analysis: VideoAnalysisResult,
  downloadUrl: string
): Promise<void> {
  const videoRef = db.collection(VIDEOS_COLLECTION).doc(videoId);

  const now = new Date();
  await videoRef.update({
    transcript: analysis.transcript,
    concepts: analysis.concepts,
    quiz: analysis.quiz,
    checkpoints: analysis.checkpoints || [],
    summary: analysis.summary,
    duration: analysis.duration,
    downloadUrl,
    processedAt: now,
    aiAnalysisCompletedAt: now,
    aiAnalysisVersion: "1.0.0", // Version identifier for AI prompt/config
    status: "ready",
  });
}

/**
 * Update video status
 */
export async function updateVideoStatus(
  videoId: string,
  status: Video["status"],
  error?: string
): Promise<void> {
  const videoRef = db.collection(VIDEOS_COLLECTION).doc(videoId);

  const updates: Partial<Video> = { status };
  if (error) {
    updates.error = error;
  }

  await videoRef.update(updates);
}

export async function saveCheckpointResponse(
  data: CheckpointResponse
): Promise<void> {
  const docId = `${data.userId}__${data.videoId}__${data.checkpointKey}`;
  const ref = db.collection(CHECKPOINT_RESPONSES_COLLECTION).doc(docId);

  const payload = {
    ...data,
    answeredAt: data.answeredAt || new Date(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.set(payload, { merge: true });
}

export async function getCheckpointResponsesForVideo(
  userId: string,
  videoId: string
): Promise<CheckpointResponse[]> {
  const snapshot = await db
    .collection(CHECKPOINT_RESPONSES_COLLECTION)
    .where("userId", "==", userId)
    .where("videoId", "==", videoId)
    .get();

  return snapshot.docs.map((d) => d.data() as CheckpointResponse);
}

/**
 * Update video with partial data
 */
export async function updateVideo(
  videoId: string,
  updates: Partial<Video>
): Promise<void> {
  const videoRef = db.collection(VIDEOS_COLLECTION).doc(videoId);
  await videoRef.update(updates);
}

/**
 * Get video by ID
 */
export async function getVideo(videoId: string): Promise<Video | null> {
  const videoRef = db.collection(VIDEOS_COLLECTION).doc(videoId);
  const doc = await videoRef.get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() } as Video;
}

/**
 * List all videos
 */
export async function listVideos(limit = 50): Promise<Video[]> {
  const videosRef = db
    .collection(VIDEOS_COLLECTION)
    .orderBy("uploadedAt", "desc")
    .limit(limit);

  const snapshot = await videosRef.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Video[];
}

/**
 * Delete video record
 */
export async function deleteVideo(videoId: string): Promise<void> {
  const videoRef = db.collection(VIDEOS_COLLECTION).doc(videoId);
  await videoRef.delete();
}

/**
 * Save or update user progress
 */
export async function saveUserProgress(
  progress: Omit<UserProgress, "lastWatchedAt">
): Promise<void> {
  const progressRef = db
    .collection(PROGRESS_COLLECTION)
    .doc(`${progress.userId}_${progress.videoId}`);

  await progressRef.set(
    {
      ...progress,
      lastWatchedAt: new Date(),
    },
    { merge: true }
  );
}

/**
 * Get user progress for a specific video
 */
export async function getUserProgress(
  userId: string,
  videoId: string
): Promise<UserProgress | null> {
  const progressRef = db
    .collection(PROGRESS_COLLECTION)
    .doc(`${userId}_${videoId}`);

  const doc = await progressRef.get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as UserProgress;
}

/**
 * Get all progress for a user
 */
export async function getUserAllProgress(
  userId: string
): Promise<UserProgress[]> {
  const progressRef = db
    .collection(PROGRESS_COLLECTION)
    .where("userId", "==", userId)
    .orderBy("lastWatchedAt", "desc");

  const snapshot = await progressRef.get();

  return snapshot.docs.map((doc) => doc.data()) as UserProgress[];
}

/**
 * Save conversation
 */
export async function saveConversation(
  conversation: Omit<Conversation, "id" | "timestamp">
): Promise<string> {
  const conversationRef = db.collection(CONVERSATIONS_COLLECTION).doc();

  await conversationRef.set({
    ...conversation,
    timestamp: new Date(),
  });

  return conversationRef.id;
}

/**
 * Get conversation history for a video
 */
export async function getConversationHistory(
  videoId: string,
  userId: string,
  limit = 20
): Promise<Conversation[]> {
  const conversationsRef = db
    .collection(CONVERSATIONS_COLLECTION)
    .where("videoId", "==", videoId)
    .where("userId", "==", userId)
    .orderBy("timestamp", "desc")
    .limit(limit);

  const snapshot = await conversationsRef.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Conversation[];
}

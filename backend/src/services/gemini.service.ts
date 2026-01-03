import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { config } from "../config/env.js";
import { defaultAIConfig } from "../config/ai-content.config.js";
import { generateVideoAnalysisPrompt } from "../config/prompt-templates.js";
import { Storage } from "@google-cloud/storage";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const fileManager = new GoogleAIFileManager(config.gemini.apiKey);

// Initialize Cloud Storage for downloading videos
const storage = new Storage({
  projectId: config.gcp.projectId,
  keyFilename: config.gcp.serviceAccountPath,
});

export interface VideoConcept {
  concept: string;
  timestamp: number;
  description: string;
  importance: "high" | "medium" | "low";
  visualElements?: string; // On-screen code, diagrams, or text
  conceptType?: "main" | "sub"; // Hierarchy level
  visualEmphasis?: boolean; // AI-detected important visual moment
  parentId?: string; // For nested concepts
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  relatedConcept: string;
}

export interface LearningCheckpoint {
  timestamp: number;
  type: "quickQuiz" | "reflection" | "prediction" | "application";
  prompt: string;
  options?: string[];
  correctAnswer?: number;
  hint?: string;
  relatedConcept?: string;
  contextStartTimestamp?: number; // Absolute timestamp (in seconds) where meaningful context begins for rewatching
  pauseDelaySeconds?: number;
}

function parseSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Match HH:MM:SS or MM:SS
    const parts = trimmed.split(":").map((p) => Number.parseInt(p, 10));
    if (parts.every((p) => Number.isFinite(p))) {
      if (parts.length === 3) {
        const [h, m, s] = parts;
        return h * 3600 + m * 60 + s;
      }
      if (parts.length === 2) {
        const [m, s] = parts;
        return m * 60 + s;
      }
    }
    const numeric = Number.parseFloat(trimmed.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

function clampSeconds(value: number | null, maxSeconds: number): number {
  if (value === null || Number.isNaN(value)) return 0;
  if (!Number.isFinite(maxSeconds)) return Math.max(0, value);
  return Math.max(0, Math.min(value, maxSeconds));
}

function clampNonNegative(value: number | null): number | undefined {
  if (value === null || Number.isNaN(value)) return undefined;
  return Math.max(0, value);
}

function sanitizeAnalysis(raw: any): VideoAnalysisResult {
  const safeDuration = parseSeconds(raw?.duration) ?? 0;
  const durationCap =
    safeDuration > 0 ? safeDuration : Number.POSITIVE_INFINITY;

  const sanitizeConcepts = Array.isArray(raw?.concepts)
    ? raw.concepts.map((c: any) => ({
        ...c,
        timestamp: clampSeconds(parseSeconds(c?.timestamp), durationCap),
      }))
    : [];

  const sanitizeCheckpoints = Array.isArray(raw?.checkpoints)
    ? raw.checkpoints.map((cp: any) => ({
        ...cp,
        timestamp: clampSeconds(parseSeconds(cp?.timestamp), durationCap),
        contextStartTimestamp: clampNonNegative(
          parseSeconds(cp?.contextStartTimestamp)
        ),
        pauseDelaySeconds: clampNonNegative(
          parseSeconds(cp?.pauseDelaySeconds)
        ),
      }))
    : [];

  const sanitizeQuiz = Array.isArray(raw?.quiz) ? raw.quiz : [];

  return {
    transcript: raw?.transcript || "",
    concepts: sanitizeConcepts,
    quiz: sanitizeQuiz,
    checkpoints: sanitizeCheckpoints,
    summary: raw?.summary || "",
    duration: safeDuration,
  };
}

export interface VideoAnalysisResult {
  transcript: string;
  concepts: VideoConcept[];
  quiz: QuizQuestion[];
  checkpoints: LearningCheckpoint[];
  summary: string;
  duration: number;
}

export interface VideoAnalysisOutput {
  analysis: VideoAnalysisResult;
  metadata: {
    promptUsed: string;
    rawResponse: string;
    aiConfigVersion: string;
    timestamp: string;
    videoPath: string;
  };
}

/**
 * Analyze a video file using Gemini AI
 * @param storagePath - Path to video file in Cloud Storage (e.g., 'videos/12345-example.mp4')
 * @returns Analysis results including transcript, concepts, and quiz
 */
export async function analyzeVideo(
  storagePath: string
): Promise<VideoAnalysisOutput> {
  try {
    // Download video from Cloud Storage to temporary file
    const tempFilePath = await downloadVideoToTemp(storagePath);

    try {
      // Upload video to Gemini File API
      console.log("📤 Uploading video to Gemini...");
      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: "video/mp4",
        displayName: path.basename(storagePath),
      });

      console.log(`✅ Video uploaded: ${uploadResult.file.uri}`);

      // Wait for video to be processed
      let file = await fileManager.getFile(uploadResult.file.name);
      while (file.state === "PROCESSING") {
        console.log("⏳ Waiting for video processing...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        file = await fileManager.getFile(uploadResult.file.name);
      }

      if (file.state === "FAILED") {
        throw new Error("Video processing failed");
      }

      console.log("✅ Video processing complete");

      // Generate analysis using Gemini
      const model = genAI.getGenerativeModel({ model: config.gemini.model });

      // Use our AI content configuration for the secret sauce
      // The prompt template is now in a separate file (prompt-templates.ts) for easier management
      const aiConfig = defaultAIConfig;
      const analysisPrompt = generateVideoAnalysisPrompt(aiConfig);

      const result = await model.generateContent([
        {
          fileData: {
            mimeType: uploadResult.file.mimeType,
            fileUri: uploadResult.file.uri,
          },
        },
        { text: analysisPrompt },
      ]);

      const response = result.response.text();
      console.log("📊 Analysis complete");

      // Clean up response - remove markdown code blocks if present
      let cleanedResponse = response.trim();

      // Remove markdown code fences (both ```json and ```)
      // Handle various formats: ```json, ```, and backticks at start/end
      if (cleanedResponse.startsWith("```")) {
        const lines = cleanedResponse.split("\n");
        lines.shift(); // Remove first line (```json or ```)
        if (lines.at(-1)?.trim() === "```") {
          lines.pop(); // Remove last line if it's ```
        }
        cleanedResponse = lines.join("\n").trim();
      }

      console.log("Parsing JSON response...");
      console.log("Response preview:", cleanedResponse.substring(0, 200));

      // Parse JSON response
      const analysis = sanitizeAnalysis(JSON.parse(cleanedResponse));

      // Clean up: delete file from Gemini
      await fileManager.deleteFile(uploadResult.file.name);

      // Return analysis with metadata
      return {
        analysis,
        metadata: {
          promptUsed: analysisPrompt,
          rawResponse: response,
          aiConfigVersion: "v1.0",
          timestamp: new Date().toISOString(),
          videoPath: storagePath,
        },
      };
    } finally {
      // Clean up: delete temporary file
      fs.unlinkSync(tempFilePath);
    }
  } catch (error) {
    console.error("❌ Error analyzing video:", error);
    throw new Error(
      `Failed to analyze video: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Download video from Cloud Storage to a temporary file
 * @param storagePath - Path in Cloud Storage
 * @returns Path to temporary file
 */
async function downloadVideoToTemp(storagePath: string): Promise<string> {
  const bucket = storage.bucket(config.storage.bucketName);
  const file = bucket.file(storagePath);

  // Create temp file path
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(
    tempDir,
    `video-${Date.now()}-${path.basename(storagePath)}`
  );

  console.log(`📥 Downloading video from Cloud Storage...`);
  await file.download({ destination: tempFilePath });
  console.log(`✅ Downloaded to ${tempFilePath}`);

  return tempFilePath;
}

/**
 * Generate a conversational response about video content
 * @param videoId - ID of the video being discussed
 * @param question - User's question about the video
 * @param context - Video transcript and concepts for context
 * @returns AI-generated answer
 */
export async function askAboutVideo(
  videoId: string,
  question: string,
  context: { transcript: string; concepts: VideoConcept[] }
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });

    const prompt = `You are a helpful learning assistant. A student is watching an educational video and has a question.

VIDEO CONTEXT:
Transcript: ${context.transcript.substring(0, 2000)}...
Key Concepts: ${context.concepts.map((c) => c.concept).join(", ")}

STUDENT QUESTION: ${question}

Provide a clear, concise answer (2-3 sentences) based on the video content. If the question is not related to the video, politely redirect the student to ask about the video content.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("❌ Error generating response:", error);
    throw new Error(
      `Failed to generate response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Summarize the current tutoring context into a short, human-readable briefing.
 * Intended for feeding into a downstream conversational system (e.g., ElevenLabs) as context.
 */
export async function summarizeTutorContext(context: {
  videoId: string;
  currentTime?: number;
  transcriptSnippet?: string;
  nearbyConcepts?: Array<{
    concept?: string;
    timestamp?: number;
    importance?: string;
  }>;
  allConcepts?: Array<{
    concept?: string;
    timestamp?: number;
    importance?: string;
    conceptType?: string;
  }>;
  nearbyCheckpoints?: Array<{
    timestamp?: number;
    type?: string;
    prompt?: string;
    relatedConcept?: string;
  }>;
  interactionSummary?: unknown;
  recentMessages?: Array<{ role?: string; text?: string; timestamp?: number }>;
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });

    const safeJson = (value: unknown, maxChars: number) => {
      const json = JSON.stringify(value ?? null);
      if (json.length <= maxChars) return json;
      return json.slice(0, maxChars) + "…";
    };

    const prompt = `You are a tutoring context summarizer.

Goal: Produce a short briefing that makes the topic and current segment obvious to the model that reads it.

Rules:
- Output plain text only.
- Max 900 characters.
- Include: (1) one-line topic label, (2) what section/time we are in, (3) what the student seems confused about (infer from recent messages), (4) 3-6 key concepts as bullet points.
- Do NOT ask the student what topic they mean.

INPUT CONTEXT (JSON snippets):
videoId: ${context.videoId}
currentTime: ${Math.floor(Number(context.currentTime || 0))}
transcriptSnippet: ${safeJson(context.transcriptSnippet || "", 1800)}
nearbyConcepts: ${safeJson(context.nearbyConcepts || [], 1400)}
allConcepts: ${safeJson((context.allConcepts || []).slice(0, 20), 1400)}
nearbyCheckpoints: ${safeJson(context.nearbyCheckpoints || [], 1400)}
interactionSummary: ${safeJson(context.interactionSummary || null, 800)}
recentMessages: ${safeJson((context.recentMessages || []).slice(-10), 1200)}

Now write the briefing.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text.length > 900 ? text.slice(0, 900) : text;
  } catch (error) {
    console.error("❌ Error summarizing tutor context:", error);
    throw new Error(
      `Failed to summarize tutor context: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Refine existing concepts, checkpoints, and quizzes with AI suggestions
 */
export async function refineConceptsWithAI(
  videoPath: string,
  existingConcepts: VideoConcept[],
  existingCheckpoints: any[],
  existingQuiz: QuizQuestion[],
  videoMetadata: any,
  engagementAnalysis?: any,
  focusArea?: string
): Promise<{
  conceptsToAdd: Array<{ concept: VideoConcept; reason: string }>;
  conceptsToImprove: Array<{
    original: VideoConcept;
    improved: VideoConcept;
    reason: string;
  }>;
  timelineGaps: Array<{ startTime: number; endTime: number; reason: string }>;
  checkpointsToAdd: Array<{ checkpoint: any; reason: string }>;
  checkpointsToImprove: Array<{ original: any; improved: any; reason: string }>;
  quizQuestionsToAdd: Array<{ question: QuizQuestion; reason: string }>;
  quizQuestionsToImprove: Array<{
    original: QuizQuestion;
    improved: QuizQuestion;
    reason: string;
  }>;
}> {
  try {
    console.log("🔍 Analyzing concepts for refinement...");

    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
    });

    // Use prompt template from config
    const { buildRefinementPrompt } = await import(
      "../config/ai-content.config.js"
    );
    const prompt = buildRefinementPrompt(
      existingConcepts,
      existingCheckpoints,
      existingQuiz,
      videoMetadata,
      engagementAnalysis,
      focusArea
    );

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log(
      "📝 Raw AI response (first 500 chars):",
      responseText.substring(0, 500)
    );

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ Failed to find JSON in response:", responseText);
      throw new Error("Failed to parse AI response");
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    console.log("✅ Refinement suggestions generated:", {
      conceptsToAdd: suggestions.conceptsToAdd?.length || 0,
      conceptsToImprove: suggestions.conceptsToImprove?.length || 0,
      timelineGaps: suggestions.timelineGaps?.length || 0,
      checkpointsToAdd: suggestions.checkpointsToAdd?.length || 0,
      checkpointsToImprove: suggestions.checkpointsToImprove?.length || 0,
      quizQuestionsToAdd: suggestions.quizQuestionsToAdd?.length || 0,
      quizQuestionsToImprove: suggestions.quizQuestionsToImprove?.length || 0,
    });

    return suggestions;
  } catch (error) {
    console.error("❌ Error refining concepts:", error);
    throw new Error(
      `Failed to refine concepts: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Analyze video engagement and learning effectiveness
 */
export async function analyzeEngagement(
  videoPath: string,
  concepts: VideoConcept[],
  checkpoints: any[],
  quiz: QuizQuestion[],
  videoMetadata: any
): Promise<{
  engagementRate: any;
  accessibilityScore: any;
  activePassiveBalance: any;
  learningRateGraph: any;
  pedagogicalScore: any;
  overallAnalysis: any;
}> {
  try {
    console.log("🔍 Analyzing engagement and learning effectiveness...");

    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
    });

    // Use prompt template from config
    const { buildEngagementPrompt } = await import(
      "../config/ai-content.config.js"
    );
    const prompt = buildEngagementPrompt(
      concepts,
      checkpoints,
      quiz,
      videoMetadata
    );

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log(
      "📝 Raw engagement analysis (first 500 chars):",
      responseText.substring(0, 500)
    );

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ Failed to find JSON in response:", responseText);
      throw new Error("Failed to parse AI response");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    console.log("✅ Engagement analysis complete:", {
      overallScore: analysis.overallAnalysis?.totalScore || 0,
      tier: analysis.overallAnalysis?.tier || "Unknown",
    });

    return analysis;
  } catch (error) {
    console.error("❌ Error analyzing engagement:", error);
    throw new Error(
      `Failed to analyze engagement: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

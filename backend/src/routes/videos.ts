import express, { Request, Response } from "express";
import admin from "firebase-admin";
import * as storageService from "../services/storage.service.js";
import * as geminiService from "../services/gemini.service.js";
import * as firestoreService from "../services/firestore.service.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /api/videos
 * List all videos
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const videos = await firestoreService.listVideos();
    res.json({ videos });
  } catch (error) {
    console.error("Error listing videos:", error);
    res.status(500).json({
      error: "Failed to list videos",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/videos/:id
 * Get video details by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log("📹 Fetching video:", id);
    const video = await firestoreService.getVideo(id);

    if (!video) {
      console.log("❌ Video not found in Firestore:", id);
      return res.status(404).json({ error: "Video not found" });
    }

    console.log("✅ Video found:", {
      id: video.id,
      filename: video.filename,
      storagePath: video.storagePath,
      hasDownloadUrl: !!video.downloadUrl,
      status: video.status,
    });

    // Generate fresh download URL on every request
    // Signed URLs are temporary and should not be cached
    if (video.storagePath) {
      try {
        console.log("🔗 Generating download URL for:", video.storagePath);
        const downloadUrl = await storageService.generateDownloadUrl(
          video.storagePath
        );
        video.downloadUrl = downloadUrl;
        console.log("✅ Download URL generated");
      } catch (error) {
        console.error("❌ Failed to generate download URL:", error);
        console.error(
          "This usually means the file doesn't exist in Cloud Storage"
        );
        // Continue without downloadUrl - frontend will show error
      }
    }

    res.json({ video });
  } catch (error) {
    console.error("Error getting video:", error);
    res.status(500).json({
      error: "Failed to get video",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/videos/upload-url
 * Generate a signed URL for uploading a video
 */
router.post("/upload-url", async (req: Request, res: Response) => {
  try {
    const { filename, title, description, uploadedBy } = req.body;

    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    console.log("📤 Generating upload URL for:", filename);

    // Generate upload URL
    const { uploadUrl, filePath } = await storageService.generateUploadUrl(
      filename
    );
    console.log("✅ Upload URL generated, path:", filePath);

    // Create video record in Firestore
    console.log("💾 Creating video record in Firestore...");
    const videoId = await firestoreService.createVideo({
      filename,
      storagePath: filePath,
      title,
      description,
      uploadedBy,
    });
    console.log("✅ Video record created:", videoId);

    res.json({
      videoId,
      uploadUrl,
      filePath,
    });
  } catch (error) {
    console.error("❌ Error generating upload URL:", error);
    console.error(
      "Stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    res.status(500).json({
      error: "Failed to generate upload URL",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/videos/:id/process
 * Process uploaded video with Gemini AI
 */
router.post("/:id/process", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get video from Firestore
    const video = await firestoreService.getVideo(id);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    if (video.status === "processing") {
      return res
        .status(409)
        .json({ error: "Video is already being processed" });
    }

    // Update status to processing
    await firestoreService.updateVideoStatus(id, "processing");

    // Process video asynchronously
    processVideoAsync(id, video.storagePath).catch(console.error);

    res.json({
      message: "Video processing started",
      videoId: id,
      status: "processing",
    });
  } catch (error) {
    console.error("Error starting video processing:", error);
    res.status(500).json({
      error: "Failed to start video processing",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/videos/:id
 * Delete a video
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await firestoreService.getVideo(id);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Delete from Cloud Storage
    await storageService.deleteVideo(video.storagePath);

    // Delete from Firestore
    await firestoreService.deleteVideo(id);

    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({
      error: "Failed to delete video",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Async function to process video with Gemini
 */
async function processVideoAsync(
  videoId: string,
  storagePath: string
): Promise<void> {
  try {
    console.log(`🎬 Starting video processing for ${videoId}...`);

    // Stage 1: Initializing
    await firestoreService.updateVideo(videoId, {
      status: "processing",
      processingStage: "initializing",
    });

    // Check if we already have cached AI analysis
    const video = await firestoreService.getVideo(videoId);
    const AI_VERSION = "1.0.0"; // Matches the version in firestore.service.ts

    if (
      video?.aiAnalysisCompletedAt &&
      video?.aiAnalysisVersion === AI_VERSION
    ) {
      console.log(
        `💾 Found cached AI analysis for ${videoId}, skipping Gemini call`
      );

      // Just regenerate download URL and mark as ready
      const downloadUrl = await storageService.generateDownloadUrl(storagePath);
      await firestoreService.updateVideo(videoId, {
        downloadUrl,
        status: "ready",
      });

      console.log(`✅ Video processing complete (from cache) for ${videoId}`);
      return;
    }

    console.log(`🤖 No cached analysis found, calling Gemini AI...`);

    // Stage 2: Uploading to Gemini
    await firestoreService.updateVideo(videoId, {
      processingStage: "uploading_to_gemini",
    });
    console.log("📤 Uploading to Gemini AI...");

    // Stage 3: AI Processing (this is where Gemini analyzes the video)
    await firestoreService.updateVideo(videoId, {
      processingStage: "analyzing_content",
    });
    console.log("🤖 Gemini AI analyzing video content...");

    // Analyze video with Gemini
    const { analysis, metadata } = await geminiService.analyzeVideo(
      storagePath
    );

    // Save complete output to output folder with video ID
    const fs = await import("node:fs");
    const path = await import("node:path");

    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${videoId}.json`);
    const completeOutput = {
      videoId,
      videoPath: storagePath,
      analysisDate: metadata.timestamp,
      aiConfigVersion: metadata.aiConfigVersion,
      prompt: metadata.promptUsed,
      rawResponse: metadata.rawResponse,
      parsedAnalysis: analysis,
    };

    fs.writeFileSync(
      outputPath,
      JSON.stringify(completeOutput, null, 2),
      "utf-8"
    );
    console.log(`📄 Complete analysis output saved to: output/${videoId}.json`);

    // Generate download URL
    const downloadUrl = await storageService.generateDownloadUrl(storagePath);

    // Update Firestore with results (includes aiAnalysisCompletedAt and aiAnalysisVersion)
    await firestoreService.updateVideoAnalysis(videoId, analysis, downloadUrl);

    console.log(`✅ Video processing complete for ${videoId}`);
  } catch (error) {
    console.error(`❌ Error processing video ${videoId}:`, error);

    // Update status to error
    await firestoreService.updateVideoStatus(
      videoId,
      "error",
      error instanceof Error ? error.message : "Processing failed"
    );
  }
}

/**
 * GET /api/videos/:id/refinement-status
 * Lightweight endpoint to check refinement status without fetching video URL
 */
router.get("/:id/refinement-status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await firestoreService.getVideo(id);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Only return refinement-related fields
    res.json({
      refinementStatus: video.refinementStatus || "idle",
      refinementSuggestions: video.refinementSuggestions || null,
      refinementCompletedAt: video.refinementCompletedAt || null,
      refinementError: video.refinementError || null,
    });
  } catch (error) {
    console.error("Error fetching refinement status:", error);
    res.status(500).json({
      error: "Failed to fetch refinement status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/videos/:id/engagement-status
 * Lightweight endpoint to check engagement analysis status without fetching video URL
 */
router.get("/:id/engagement-status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await firestoreService.getVideo(id);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Only return engagement-related fields
    res.json({
      engagementStatus: video.engagementStatus || "idle",
      engagementAnalysis: video.engagementAnalysis || null,
      engagementAnalyzedAt: video.engagementAnalyzedAt || null,
      engagementError: video.engagementError || null,
    });
  } catch (error) {
    console.error("Error fetching engagement status:", error);
    res.status(500).json({
      error: "Failed to fetch engagement status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/videos/:id/refine-concepts
 * Use AI to suggest improvements to existing concepts
 * Starts async refinement and returns immediately
 * Body: { focusArea?: string } - Optional focus area for refinement
 */
router.post("/:id/refine-concepts", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { focusArea } = req.body;

    console.log("🔍 Starting refinement for video:", id);
    if (focusArea) {
      console.log("🎯 Focus area:", focusArea);
    }
    const video = await firestoreService.getVideo(id);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    if (!video.concepts || video.concepts.length === 0) {
      return res.status(400).json({
        error: "No concepts found",
        message: "Video must have at least one concept to refine",
      });
    }

    // Set status to refining and clear old suggestions
    await firestoreService.updateVideo(id, {
      refinementStatus: "refining",
      refinementError: admin.firestore.FieldValue.delete() as any, // Clear previous errors
      refinementSuggestions: admin.firestore.FieldValue.delete() as any, // Clear old suggestions
      refinementFocusArea:
        focusArea || (admin.firestore.FieldValue.delete() as any),
    });

    // Fetch fresh video data with accepted changes
    const updatedVideo = await firestoreService.getVideo(id);

    // Start refinement async with fresh data (don't await)
    refineConceptsAsync(id, updatedVideo!).catch((error) => {
      console.error("Error in async refinement:", error);
    });

    // Return immediately
    res.json({
      status: "refining",
      videoId: id,
      message: "AI refinement started. Poll video status to get results.",
    });
  } catch (error) {
    console.error("Error starting refinement:", error);
    res.status(500).json({
      error: "Failed to start refinement",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Helper function to update output JSON file
 */
async function updateOutputJson(videoId: string) {
  try {
    const outputPath = path.join(__dirname, "../../output", `${videoId}.json`);

    // Check if file exists
    try {
      await fs.access(outputPath);
    } catch {
      console.log("📝 Output JSON file not found, skipping update");
      return;
    }

    // Get latest video data from Firestore
    const video = await firestoreService.getVideo(videoId);
    if (!video) return;

    // Read existing JSON
    const existingData = JSON.parse(await fs.readFile(outputPath, "utf8"));

    // Update with latest data
    const updatedData = {
      ...existingData,
      parsedAnalysis: {
        ...existingData.parsedAnalysis,
        concepts: video.concepts || existingData.parsedAnalysis.concepts,
        checkpoints:
          video.checkpoints || existingData.parsedAnalysis.checkpoints,
        quiz: video.quiz || existingData.parsedAnalysis.quiz,
      },
    };

    // Update output JSON file
    await updateOutputJson(videoId);

    // Add refinement data if exists
    if (video.refinementStatus === "complete" && video.refinementSuggestions) {
      updatedData.refinementStatus = video.refinementStatus;
      updatedData.refinementSuggestions = video.refinementSuggestions;
      updatedData.refinementCompletedAt = video.refinementCompletedAt;
      updatedData.refinementFocusArea = video.refinementFocusArea;
    }

    // Add engagement analysis if exists
    if (video.engagementStatus === "complete" && video.engagementAnalysis) {
      updatedData.engagementStatus = video.engagementStatus;
      updatedData.engagementAnalysis = video.engagementAnalysis;
      updatedData.engagementAnalyzedAt = video.engagementAnalyzedAt;
    }

    // Write updated JSON
    await fs.writeFile(outputPath, JSON.stringify(updatedData, null, 2));
    console.log("✅ Output JSON updated:", outputPath);
  } catch (error) {
    console.error("❌ Error updating output JSON:", error);
  }
}

/**
 * Async function to refine concepts using AI
 */
async function refineConceptsAsync(
  videoId: string,
  video: firestoreService.Video
) {
  try {
    console.log("🤖 Running AI refinement for video:", videoId);

    // Call Gemini service to get refinement suggestions
    const suggestions = await geminiService.refineConceptsWithAI(
      video.storagePath,
      video.concepts!,
      video.checkpoints || [],
      video.quiz || [],
      { duration: video.duration, title: video.title },
      video.engagementAnalysis,
      video.refinementFocusArea
    );

    console.log(
      "✅ Refinement complete:",
      JSON.stringify(suggestions, null, 2)
    );

    // Update video with results
    await firestoreService.updateVideo(videoId, {
      refinementStatus: "complete",
      refinementSuggestions: suggestions,
      refinementCompletedAt: new Date(),
    });
  } catch (error) {
    console.error("❌ Error in refinement:", error);

    // Update video with error
    await firestoreService.updateVideo(videoId, {
      refinementStatus: "error",
      refinementError: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * POST /api/videos/:id/apply-suggestion
 * Accept and apply a refinement suggestion to Firestore
 */
router.post("/:id/apply-suggestion", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { suggestionType, suggestion } = req.body;

    console.log(`📝 Applying ${suggestionType} suggestion to video:`, id);

    const video = await firestoreService.getVideo(id);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Apply the suggestion based on type
    let updatedVideo: any = { ...video };

    switch (suggestionType) {
      case "conceptAdd":
        updatedVideo.concepts = [...(video.concepts || []), suggestion.concept];
        break;

      case "conceptImprove":
        updatedVideo.concepts = (video.concepts || []).map((c: any) =>
          c.concept === suggestion.original.concept ? suggestion.improved : c
        );
        break;

      case "checkpointAdd":
        updatedVideo.checkpoints = [
          ...(video.checkpoints || []),
          suggestion.checkpoint,
        ];
        break;

      case "checkpointImprove":
        updatedVideo.checkpoints = (video.checkpoints || []).map(
          (cp: any, idx: number) =>
            idx === suggestion.originalIndex ? suggestion.improved : cp
        );
        break;

      case "quizAdd":
        updatedVideo.quiz = [...(video.quiz || []), suggestion.question];
        break;

      case "quizImprove":
        updatedVideo.quiz = (video.quiz || []).map((q: any) =>
          q.question === suggestion.original.question ? suggestion.improved : q
        );
        break;

      default:
        return res.status(400).json({ error: "Invalid suggestion type" });
    }

    // Update Firestore
    await firestoreService.updateVideo(id, {
      concepts: updatedVideo.concepts,
      checkpoints: updatedVideo.checkpoints,
      quiz: updatedVideo.quiz,
    });

    console.log("✅ Suggestion applied successfully");

    // Return updated video
    const updated = await firestoreService.getVideo(id);
    res.json({ video: updated });
  } catch (error) {
    console.error("Error applying suggestion:", error);
    res.status(500).json({
      error: "Failed to apply suggestion",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/videos/:id/analyze-engagement
 * Analyze video's learning effectiveness and engagement
 * Starts async analysis and returns immediately
 */
router.post("/:id/analyze-engagement", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log("🔍 Starting engagement analysis for video:", id);
    const video = await firestoreService.getVideo(id);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    if (!video.concepts || video.concepts.length === 0) {
      return res.status(400).json({
        error: "No concepts found",
        message: "Video must have at least one concept to analyze",
      });
    }

    // Set status to analyzing and clear old results
    await firestoreService.updateVideo(id, {
      engagementStatus: "analyzing",
      engagementError: admin.firestore.FieldValue.delete() as any, // Clear previous errors
      engagementAnalysis: admin.firestore.FieldValue.delete() as any, // Clear old analysis
    });

    // Fetch fresh video data with accepted changes
    const updatedVideo = await firestoreService.getVideo(id);

    // Start analysis async with fresh data (don't await)
    analyzeEngagementAsync(id, updatedVideo!).catch((error) => {
      console.error("Error in async engagement analysis:", error);
    });

    // Return immediately
    res.json({
      status: "analyzing",
      videoId: id,
      message: "Engagement analysis started. Poll video status to get results.",
    });
  } catch (error) {
    console.error("Error starting engagement analysis:", error);
    res.status(500).json({
      error: "Failed to start engagement analysis",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Async function to analyze engagement using AI
 */
async function analyzeEngagementAsync(
  videoId: string,
  video: firestoreService.Video
) {
  try {
    console.log("🤖 Running engagement analysis for video:", videoId);

    // Call Gemini service to get engagement analysis
    const analysis = await geminiService.analyzeEngagement(
      video.storagePath,
      video.concepts!,
      video.checkpoints || [],
      video.quiz || [],
      { duration: video.duration, title: video.title }
    );

    console.log(
      "✅ Engagement analysis complete:",
      JSON.stringify(analysis, null, 2)
    );

    // Update video with results
    await firestoreService.updateVideo(videoId, {
      engagementStatus: "complete",
      engagementAnalysis: analysis,
      engagementAnalyzedAt: new Date(),
    });

    // Update output JSON file
    await updateOutputJson(videoId);
  } catch (error) {
    console.error("❌ Error in engagement analysis:", error);

    // Update video with error
    await firestoreService.updateVideo(videoId, {
      engagementStatus: "error",
      engagementError: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * GET /api/videos/:id/watch
 * Get video for student viewing (simplified data)
 */
router.get("/:id/watch", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log("🎓 Student accessing video:", id);
    const video = await firestoreService.getVideo(id);

    if (!video) {
      console.log("❌ Video not found:", id);
      return res.status(404).json({ error: "Video not found" });
    }

    // Only allow videos that are fully processed
    if (video.status !== "ready") {
      console.log("❌ Video not ready for viewing:", video.status);
      return res.status(403).json({
        error: "Video not available",
        message: "This video is still being processed",
      });
    }

    // Generate fresh download URL
    if (video.storagePath) {
      try {
        const downloadUrl = await storageService.generateDownloadUrl(
          video.storagePath
        );
        video.downloadUrl = downloadUrl;
      } catch (error) {
        console.error("❌ Failed to generate download URL:", error);
        return res.status(500).json({ error: "Video file not accessible" });
      }
    }

    // Return only necessary data for students
    // Exclude internal fields like processingStage, refinementSuggestions, etc.
    const studentVideo = {
      id: video.id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      downloadUrl: video.downloadUrl,
      checkpoints: video.checkpoints || [],
      quiz: video.quiz || [],
      concepts: video.concepts || [],
      createdAt: video.createdAt,
    };

    console.log("✅ Video ready for student:", {
      id: video.id,
      checkpoints: studentVideo.checkpoints.length,
      quiz: studentVideo.quiz.length,
      concepts: studentVideo.concepts.length,
    });

    res.json({ video: studentVideo });
  } catch (error) {
    console.error("Error getting video for student:", error);
    res.status(500).json({
      error: "Failed to load video",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/videos/:id/cache-thumbnail
 * Cache a client-generated thumbnail (base64 data URL)
 */
router.post("/:id/cache-thumbnail", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { thumbnailDataUrl } = req.body;

    if (!thumbnailDataUrl || !thumbnailDataUrl.startsWith("data:image")) {
      return res
        .status(400)
        .json({ error: "Valid thumbnail data URL required" });
    }

    console.log("💾 Caching thumbnail for video:", id);

    const video = await firestoreService.getVideo(id);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Update video document with thumbnail data URL
    await firestoreService.updateVideo(id, { thumbnailUrl: thumbnailDataUrl });

    console.log("✅ Thumbnail cached to Firestore");
    res.json({ thumbnailUrl: thumbnailDataUrl });
  } catch (error) {
    console.error("Error caching thumbnail:", error);
    res.status(500).json({
      error: "Failed to cache thumbnail",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

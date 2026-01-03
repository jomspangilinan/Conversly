import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as firestoreService from "../services/firestore.service.js";
import * as storageService from "../services/storage.service.js";

const router = Router();

/**
 * Mock video processing endpoint for testing
 * Use this to test the frontend without uploading real videos
 */

// Mock video data
const MOCK_VIDEO_DATA = {
  title: "Introduction to Google Cloud Platform",
  duration: 1320, // 22 minutes
  transcript: `Welcome to this comprehensive introduction to Google Cloud Platform. In this video, we'll cover the fundamentals of GCP and how to get started with cloud computing.

First, let's talk about what Google Cloud Platform is. GCP is a suite of cloud computing services that runs on the same infrastructure that Google uses internally for its end-user products, such as Google Search, Gmail, and YouTube.

Now, let's discuss the key services available in GCP. The main categories include Compute, Storage, Databases, Networking, and Machine Learning...`,

  concepts: [
    {
      concept: "What is Google Cloud Platform",
      timestamp: 45,
      description:
        "Introduction to GCP as a suite of cloud computing services running on Google's infrastructure",
      importance: "high",
      visualElements: "Overview diagram showing GCP services architecture",
    },
    {
      concept: "Compute Engine Basics",
      timestamp: 180,
      description:
        "Virtual machines in the cloud with customizable configurations",
      importance: "high",
      visualElements: "Demonstrates creating a VM instance in the console",
    },
    {
      concept: "Cloud Storage Overview",
      timestamp: 420,
      description:
        "Object storage for any amount of data with high availability",
      importance: "medium",
      visualElements: "Shows bucket creation and file upload process",
    },
    {
      concept: "IAM and Security",
      timestamp: 680,
      description:
        "Identity and Access Management for controlling who has access to what resources",
      importance: "high",
      visualElements:
        "Live demo of setting up service accounts and permissions",
    },
    {
      concept: "Billing and Cost Management",
      timestamp: 920,
      description:
        "Understanding GCP pricing and how to monitor and control costs",
      importance: "medium",
      visualElements: "Walkthrough of billing dashboard and budget alerts",
    },
  ],

  quiz: [
    {
      question: "What infrastructure does Google Cloud Platform run on?",
      options: [
        "Dedicated cloud infrastructure",
        "The same infrastructure Google uses for its products",
        "Third-party data centers",
        "Hybrid on-premises servers",
      ],
      correctAnswer: 1,
      explanation:
        "GCP runs on the same infrastructure that powers Google Search, Gmail, YouTube, and other Google services.",
      relatedConcept: "What is Google Cloud Platform",
    },
    {
      question: "Which GCP service provides virtual machines?",
      options: [
        "Cloud Storage",
        "Cloud Functions",
        "Compute Engine",
        "App Engine",
      ],
      correctAnswer: 2,
      explanation:
        "Compute Engine is GCP's service for creating and managing virtual machine instances.",
      relatedConcept: "Compute Engine Basics",
    },
    {
      question: "What does IAM stand for in Google Cloud?",
      options: [
        "Internet Access Management",
        "Identity and Access Management",
        "Internal Application Monitor",
        "Integrated API Manager",
      ],
      correctAnswer: 1,
      explanation:
        "IAM stands for Identity and Access Management, which controls permissions and access to GCP resources.",
      relatedConcept: "IAM and Security",
    },
  ],

  summary:
    "This video provides a comprehensive introduction to Google Cloud Platform, covering the main services including Compute Engine, Cloud Storage, and IAM. The video demonstrates how to get started with GCP and includes practical examples of creating resources and managing security.",
};

/**
 * POST /api/mock/upload
 * Simulate video upload without actually uploading
 */
router.post("/upload", async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const videoId = uuidv4().substring(0, 20);

    console.log("🧪 Mock upload initiated:", { videoId, title });

    // Return mock video ID and signed URL (won't actually be used)
    res.json({
      videoId,
      uploadUrl: `https://mock-storage.googleapis.com/conversly-videos/${videoId}`,
      message: "Mock upload - no actual upload will occur",
    });
  } catch (error) {
    console.error("Mock upload error:", error);
    res.status(500).json({ error: "Mock upload failed" });
  }
});

/**
 * POST /api/mock/conversations/ask
 * Mock conversational tutor response for UI testing
 */
router.post("/conversations/ask", async (req: Request, res: Response) => {
  const { videoId, question, timestamp } = req.body || {};

  res.json({
    videoId: videoId || "mock-video",
    question: question || "",
    timestamp,
    answer:
      "(Mock Tutor) I can help explain this section. Try asking a specific question like: ‘What does this term mean?’ or ‘Can you summarize the last minute?’",
  });
});

/**
 * POST /api/mock/process/:videoId
 * Simulate video processing without calling Gemini
 */
router.post("/process/:videoId", async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    console.log("🧪 Mock processing initiated:", videoId);

    // Simulate processing delay (2 seconds)
    setTimeout(() => {
      console.log("🧪 Mock processing complete:", videoId);
    }, 2000);

    res.json({
      message: "Mock processing started - will complete in 2 seconds",
      videoId,
    });
  } catch (error) {
    console.error("Mock processing error:", error);
    res.status(500).json({ error: "Mock processing failed" });
  }
});

/**
 * GET /api/mock/videos/:videoId
 * Return mock video with REAL uploaded video file + MOCK analysis data
 * This allows testing the UI with actual uploaded videos without calling Gemini
 */
router.get("/videos/:videoId", async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    console.log("🧪 Mock video fetch:", videoId);

    // Try to fetch real video from Firestore first
    let realVideo;
    try {
      realVideo = await firestoreService.getVideo(videoId);
      if (realVideo) {
        console.log("✅ Found real video in Firestore:", {
          id: realVideo.id,
          filename: realVideo.filename,
          storagePath: realVideo.storagePath,
          downloadUrl: realVideo.downloadUrl,
          status: realVideo.status,
        });
      } else {
        console.log("⚠️ No video found with ID:", videoId);
      }
    } catch (error) {
      console.log("⚠️ Error fetching from Firestore:", error);
    }

    // Simulate processing states based on time
    const now = Date.now();
    const createdAt = now - 5000; // 5 seconds ago
    const elapsed = now - createdAt;

    let status = "ready";
    let processingStage = undefined;

    if (elapsed < 2000) {
      status = "processing";
      processingStage = "uploading_to_gemini";
    } else if (elapsed < 3000) {
      status = "processing";
      processingStage = "analyzing_content";
    }

    // Generate download URL if we have a storage path but no download URL
    let downloadUrl = realVideo?.downloadUrl;
    if (!downloadUrl && realVideo?.storagePath) {
      try {
        console.log("🔗 Generating signed URL for:", realVideo.storagePath);
        downloadUrl = await storageService.generateDownloadUrl(
          realVideo.storagePath
        );
        console.log("✅ Signed URL generated");
      } catch (error) {
        console.log(
          "⚠️ Failed to generate signed URL, using Big Buck Bunny fallback:",
          error
        );
        downloadUrl = undefined;
      }
    }

    const video = {
      id: videoId,
      title: realVideo?.title || MOCK_VIDEO_DATA.title,
      description: realVideo?.description || "Mock video for testing",
      status,
      processingStage,
      // USE REAL UPLOADED VIDEO if available, otherwise use Big Buck Bunny
      storagePath:
        realVideo?.storagePath ||
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      downloadUrl:
        downloadUrl ||
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      filename: realVideo?.filename || "mock-video.mp4",
      createdAt: realVideo?.uploadedAt || new Date(createdAt).toISOString(),
      duration: realVideo?.duration || MOCK_VIDEO_DATA.duration,
      ...(status === "ready"
        ? {
            // Always use mock concepts/quiz to avoid calling Gemini
            transcript: MOCK_VIDEO_DATA.transcript,
            concepts: MOCK_VIDEO_DATA.concepts,
            quiz: MOCK_VIDEO_DATA.quiz,
            summary: MOCK_VIDEO_DATA.summary,
          }
        : {}),
    };

    res.json({ video });
  } catch (error) {
    console.error("Mock video fetch error:", error);
    res.status(500).json({ error: "Mock video fetch failed" });
  }
});

/**
 * GET /api/mock/videos
 * Return list of mock videos
 */
router.get("/videos", async (req: Request, res: Response) => {
  try {
    console.log("🧪 Mock videos list");

    const videos = [
      {
        id: "mock-video-1",
        title: MOCK_VIDEO_DATA.title,
        description: "Mock video for testing",
        status: "ready",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        duration: MOCK_VIDEO_DATA.duration,
        conceptCount: MOCK_VIDEO_DATA.concepts.length,
      },
    ];

    res.json({ videos });
  } catch (error) {
    console.error("Mock videos list error:", error);
    res.status(500).json({ error: "Mock videos list failed" });
  }
});

export default router;

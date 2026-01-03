import express, { Request, Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  getCheckpointResponsesForVideo,
  saveCheckpointResponse,
} from "../services/firestore.service.js";

const router = express.Router();

// Get user progress
router.get("/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  // TODO: Query Firestore for progress
  res.json({
    userId,
    progress: [],
    message: "Progress tracking - Coming soon",
  });
});

// Update lesson progress
router.post("/update", async (req: Request, res: Response) => {
  const { userId, lessonId, progress } = req.body;

  // TODO: Update Firestore
  res.json({
    userId,
    lessonId,
    message: "Progress update - Coming soon",
  });
});

// Get dashboard data
router.get("/dashboard/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  // TODO: Aggregate progress data
  res.json({
    userId,
    stats: {},
    message: "Dashboard data - Coming soon",
  });
});

// Save checkpoint response
router.post(
  "/checkpoint-response",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userIdFromToken = authReq.user?.uid;
      if (!userIdFromToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const {
        videoId,
        checkpointKey,
        checkpointType,
        prompt,
        timestamp,
        selectedIndex,
        isCorrect,
        answerText,
        videoTime,
        options,
        studentName,
      } = req.body;

      if (!videoId || !checkpointKey) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const hasQuizFields =
        selectedIndex !== undefined && isCorrect !== undefined;
      const hasTextAnswer =
        typeof answerText === "string" && answerText.trim().length > 0;

      if (!hasQuizFields && !hasTextAnswer) {
        return res
          .status(400)
          .json({ message: "Missing required answer fields" });
      }

      await saveCheckpointResponse({
        userId: userIdFromToken,
        videoId,
        checkpointKey,
        checkpointType: checkpointType || "",
        prompt: prompt || "",
        timestamp: typeof timestamp === "number" ? timestamp : 0,
        selectedIndex: typeof selectedIndex === "number" ? selectedIndex : -1,
        isCorrect: typeof isCorrect === "boolean" ? isCorrect : false,
        answerText: hasTextAnswer ? String(answerText) : undefined,
        answeredAt: new Date(),
        videoTime,
        options,
        studentName,
      });

      res.json({ success: true });
    } catch (err) {
      console.error("Failed to save checkpoint response", err);
      res.status(500).json({ message: "Failed to save checkpoint response" });
    }
  }
);

// Load checkpoint responses for a user + video
router.get(
  "/checkpoint-responses",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.uid;
      const videoId = String(req.query.videoId || "");

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!videoId) {
        return res
          .status(400)
          .json({ message: "Missing required query params: videoId" });
      }

      const responses = await getCheckpointResponsesForVideo(userId, videoId);
      return res.json({ userId, videoId, responses });
    } catch (err) {
      console.error("Failed to load checkpoint responses", err);
      return res
        .status(500)
        .json({ message: "Failed to load checkpoint responses" });
    }
  }
);

export default router;

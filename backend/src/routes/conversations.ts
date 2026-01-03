import express, { Request, Response } from "express";
import {
  askAboutVideo,
  summarizeTutorContext,
  type VideoConcept,
} from "../services/gemini.service.js";

const router = express.Router();

// Ask AI a question
router.post("/ask", async (req: Request, res: Response) => {
  const { videoId, question, timestamp, context } = req.body || {};

  if (!videoId || !question) {
    return res.status(400).json({
      error: "Missing required fields: videoId, question",
    });
  }

  try {
    const transcript: string = String(
      context?.transcriptSnippet || context?.transcript || ""
    );

    let rawConcepts: any[] = [];
    if (Array.isArray(context?.nearbyConcepts)) {
      rawConcepts = context.nearbyConcepts;
    } else if (Array.isArray(context?.concepts)) {
      rawConcepts = context.concepts;
    }

    const concepts: VideoConcept[] = rawConcepts
      .map((c: any) => {
        const conceptText = typeof c === "string" ? c : c?.concept;
        if (!conceptText) return null;
        return {
          concept: String(conceptText),
          timestamp: Number(c?.timestamp || 0),
          description: String(c?.description || ""),
          importance:
            c?.importance === "high" || c?.importance === "low"
              ? c.importance
              : "medium",
        } as VideoConcept;
      })
      .filter(Boolean) as VideoConcept[];

    const answer = await askAboutVideo(videoId, question, {
      transcript,
      concepts,
    });

    return res.json({
      videoId,
      question,
      timestamp,
      answer,
    });
  } catch (error) {
    console.error("Conversation /ask error:", error);
    return res.status(500).json({
      videoId,
      question,
      timestamp,
      answer: "Sorry — I couldn't generate a response right now.",
    });
  }
});

// Summarize tutoring context into a short briefing for downstream agents (e.g., ElevenLabs)
router.post("/context-summary", async (req: Request, res: Response) => {
  const { videoId, context } = req.body || {};

  if (!videoId || !context) {
    return res.status(400).json({
      error: "Missing required fields: videoId, context",
    });
  }

  try {
    const summary = await summarizeTutorContext({
      videoId: String(videoId),
      currentTime: Number(context?.currentTime || 0),
      transcriptSnippet: context?.transcriptSnippet,
      nearbyConcepts: Array.isArray(context?.nearbyConcepts)
        ? context.nearbyConcepts
        : undefined,
      allConcepts: Array.isArray(context?.allConcepts)
        ? context.allConcepts
        : undefined,
      nearbyCheckpoints: Array.isArray(context?.nearbyCheckpoints)
        ? context.nearbyCheckpoints
        : undefined,
      interactionSummary: context?.interactionSummary,
      recentMessages: Array.isArray(context?.recentMessages)
        ? context.recentMessages
        : undefined,
    });

    return res.json({
      videoId,
      summary,
    });
  } catch (error) {
    console.error("Conversation /context-summary error:", error);
    return res.status(500).json({
      videoId,
      summary: "",
      error: "Sorry — I couldn't summarize the context right now.",
    });
  }
});

// Start conversational quiz
router.post("/quiz/start", async (req: Request, res: Response) => {
  const { lessonId } = req.body;

  // Placeholder response (Gemini-powered quiz generation not wired yet)
  res.json({
    lessonId,
    message: "Quiz generation - Coming soon",
  });
});

// Submit quiz answer
router.post("/quiz/answer", async (req: Request, res: Response) => {
  const { quizId } = req.body;

  // Placeholder response (Gemini-powered quiz evaluation not wired yet)
  res.json({
    quizId,
    message: "Quiz evaluation - Coming soon",
  });
});

export default router;

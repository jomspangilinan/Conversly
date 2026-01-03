import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /api/config/api-keys-required
 * Check if API keys are required (no env vars set)
 */
router.get("/api-keys-required", (req: Request, res: Response) => {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const elevenLabsConfigured = Boolean(process.env.ELEVENLABS_API_KEY);

  res.json({
    required: !geminiConfigured || !elevenLabsConfigured,
    gemini: geminiConfigured,
    elevenlabs: elevenLabsConfigured,
  });
});

export default router;

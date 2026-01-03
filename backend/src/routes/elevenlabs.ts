import express, { Request, Response } from "express";
import { config } from "../config/env.js";

const router = express.Router();

// ElevenLabs Scribe realtime token for SpeechInput component.
// Keep this server-side so the API key never reaches the browser.
router.post("/get-scribe-token", async (_req: Request, res: Response) => {
  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text/get-realtime-token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": config.elevenlabs.apiKey,
        },
        body: JSON.stringify({
          model_id: "scribe_v2_realtime",
          ttl_secs: 300,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return res.status(500).json({
        error: "Failed to generate Scribe token",
        status: response.status,
        details: text,
      });
    }

    const data = (await response.json()) as { token?: string };
    if (!data?.token) {
      return res.status(500).json({
        error: "Scribe token missing in response",
      });
    }

    return res.json({ token: data.token });
  } catch (error) {
    console.error("/get-scribe-token error:", error);
    return res.status(500).json({ error: "Failed to generate Scribe token" });
  }
});

// ElevenLabs Text-to-Speech
// Keeps the API key server-side; returns audio/mpeg bytes.
router.post("/tts", async (req: Request, res: Response) => {
  const { text, voiceId, modelId } = req.body || {};

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing required field: text" });
  }

  const chosenVoiceId =
    (typeof voiceId === "string" && voiceId.trim().length
      ? voiceId.trim()
      : null) ||
    (process.env.ELEVENLABS_VOICE_ID
      ? String(process.env.ELEVENLABS_VOICE_ID)
      : null);

  if (!chosenVoiceId) {
    return res.status(400).json({
      error:
        "Missing voiceId. Provide voiceId in request body or set ELEVENLABS_VOICE_ID in backend env.",
    });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        chosenVoiceId
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": config.elevenlabs.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id:
            typeof modelId === "string" && modelId
              ? modelId
              : config.elevenlabs.model,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return res.status(500).json({
        error: "Failed to generate TTS audio",
        status: response.status,
        details: errText,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("/tts error:", error);
    return res.status(500).json({ error: "Failed to generate TTS audio" });
  }
});

export default router;

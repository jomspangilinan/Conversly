import express, { Request, Response } from "express";

const router = express.Router();

// Health check endpoint
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

// API info endpoint
router.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Conversly API",
    version: "1.0.0",
    description: "Voice Learning Platform API",
    endpoints: {
      health: "GET /health",
      videos: "GET /api/videos",
      conversations: "POST /api/conversations",
      progress: "GET /api/progress",
    },
  });
});

export default router;

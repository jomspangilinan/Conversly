import { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "../config/env.js";

// CORS middleware with configuration
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list or is a local network IP
    const allowedOrigins = config.security.corsOrigins;
    const isLocalNetwork =
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
        origin
      );

    console.log(
      `🔍 CORS check - Origin: ${origin}, In allowed list: ${allowedOrigins.includes(
        origin
      )}, Matches local network: ${isLocalNetwork}`
    );

    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes("*") ||
      isLocalNetwork
    ) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Gemini-API-Key",
    "X-ElevenLabs-API-Key",
  ],
});

// Request logging middleware
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? "❌" : "✅";

    console.log(
      `${logLevel} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};

// Error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("❌ Error:", err.message);
  console.error("   Stack:", err.stack);

  // Don't expose internal errors in production
  const isDevelopment = config.server.env === "development";

  res.status(500).json({
    error: "Internal Server Error",
    message: isDevelopment ? err.message : "Something went wrong",
    ...(isDevelopment && { stack: err.stack }),
  });
};

// Not found middleware
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      "GET /health",
      "GET /api/videos",
      "POST /api/videos",
      "POST /api/conversations",
      "GET /api/progress",
    ],
  });
};

// Validation middleware helper
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    next();
  };
};

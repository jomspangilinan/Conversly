import express from "express";
import { config } from "./config/env.js";
import {
  corsMiddleware,
  requestLogger,
  errorHandler,
  notFoundHandler,
} from "./middleware/cors.js";
import healthRoutes from "./routes/health.js";
import videoRoutes from "./routes/videos.js";
import conversationRoutes from "./routes/conversations.js";
import progressRoutes from "./routes/progress.js";
import mockRoutes from "./routes/mock.js";
import elevenlabsRoutes from "./routes/elevenlabs.js";
import authRoutes from "./routes/auth.js";
import configRoutes from "./routes/config.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);
app.use(requestLogger);

// Routes
app.use("/", healthRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api", elevenlabsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/config", configRoutes);
app.use("/api/mock", mockRoutes); // Mock endpoints for testing

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.server.port;
const HOST = "0.0.0.0"; // Listen on all network interfaces

app.listen(PORT, HOST, () => {
  console.log("\n🚀 Conversly Backend API");
  console.log("=".repeat(50));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Network: http://<your-local-ip>:${PORT}`);
  console.log(`✅ Environment: ${config.server.env}`);
  console.log(`✅ Frontend URL: ${config.server.frontendUrl}`);
  console.log("\n📚 Available endpoints:");
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/api/videos`);
  console.log(`   POST http://localhost:${PORT}/api/conversations/ask`);
  console.log(`   GET  http://localhost:${PORT}/api/progress/:userId`);
  console.log(`\n🧪 Mock endpoints (for testing without uploads):`);
  console.log(`   POST http://localhost:${PORT}/api/mock/upload`);
  console.log(`   POST http://localhost:${PORT}/api/mock/process/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/mock/videos/:id`);
  console.log("\n" + "=".repeat(50) + "\n");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n👋 SIGINT received, shutting down gracefully...");
  process.exit(0);
});

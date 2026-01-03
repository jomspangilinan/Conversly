import * as dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Validate required environment variables (API keys are now optional - can come from user)
const requiredEnvVars = ["GCP_PROJECT_ID"];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error("\nPlease check your .env file");
  process.exit(1);
}

// Warn if API keys are not set (they can be provided by users via headers)
if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "⚠️  GEMINI_API_KEY not set - users must provide their own API keys"
  );
}
if (!process.env.ELEVENLABS_API_KEY) {
  console.warn(
    "⚠️  ELEVENLABS_API_KEY not set - users must provide their own API keys"
  );
}

// Export validated configuration
export const config = {
  server: {
    port: parseInt(process.env.PORT || "8080", 10),
    env: process.env.NODE_ENV || "development",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  },
  gcp: {
    projectId: process.env.GCP_PROJECT_ID!,
    region: process.env.GCP_REGION || "us-central1",
    serviceAccountPath:
      process.env.GCP_SERVICE_ACCOUNT_PATH || "./service-account.json",
  },
  storage: {
    bucketName: process.env.GCS_BUCKET_NAME!,
    signedUrlExpiry: parseInt(process.env.GCS_SIGNED_URL_EXPIRY || "3600", 10),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "", // Empty if not set - will use user's key
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || "8192", 10),
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || "", // Empty if not set - will use user's key
    model: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || "change-this-in-production",
    corsOrigins: process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:5173",
    ],
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },
} as const;

// Log configuration on startup (hide sensitive data)
if (config.server.env === "development") {
  console.log("📋 Configuration loaded:");
  console.log("   Environment:", config.server.env);
  console.log("   Port:", config.server.port);
  console.log("   Frontend URL:", config.server.frontendUrl);
  console.log("   GCP Project:", config.gcp.projectId);
  console.log("   Storage Bucket:", config.storage.bucketName);
  console.log("   Gemini Model:", config.gemini.model);
  console.log("   CORS Origins:", config.security.corsOrigins.join(", "));
  console.log("   ✅ All environment variables loaded\n");
}

// Helper to get API keys from request headers or env
export function getApiKeys(req?: any): { gemini: string; elevenlabs: string } {
  return {
    gemini: req?.headers?.["x-gemini-api-key"] || config.gemini.apiKey,
    elevenlabs:
      req?.headers?.["x-elevenlabs-api-key"] || config.elevenlabs.apiKey,
  };
}

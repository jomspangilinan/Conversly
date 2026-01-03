import { Storage } from "@google-cloud/storage";
import { config } from "../config/env.js";

// Cache signed URLs briefly to avoid regenerating them during frequent polls
const downloadUrlCache = new Map<
  string,
  {
    url: string;
    expiresAt: number;
  }
>();

// Initialize Cloud Storage client with explicit options
const isProduction = config.server.env === "production";

console.log("🔧 Initializing Cloud Storage with:", {
  projectId: config.gcp.projectId,
  environment: config.server.env,
  useADC: isProduction,
  bucketName: config.storage.bucketName,
});

let storage: Storage;
let bucket: any;

try {
  // In production (Cloud Run), use Application Default Credentials
  // In development, use service account key file
  if (isProduction) {
    storage = new Storage({
      projectId: config.gcp.projectId,
    });
    console.log("🔐 Using Application Default Credentials for Cloud Storage");
  } else {
    storage = new Storage({
      projectId: config.gcp.projectId,
      keyFilename: config.gcp.serviceAccountPath,
    });
    console.log("🔑 Using service account key file for Cloud Storage");
  }

  bucket = storage.bucket(config.storage.bucketName);
  console.log("✅ Cloud Storage initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Cloud Storage:", error);
  throw error;
}

/**
 * Generate a signed URL for uploading a video file
 * @param filename - Original filename from the client
 * @returns Object with upload URL and file path in storage
 */
export async function generateUploadUrl(filename: string): Promise<{
  uploadUrl: string;
  filePath: string;
}> {
  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const sanitizedFilename = filename.replaceAll(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `videos/${timestamp}-${sanitizedFilename}`;

  const file = bucket.file(filePath);

  // Generate signed URL for upload (valid for 1 hour)
  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + config.storage.signedUrlExpiry * 1000,
    contentType: "video/mp4", // Adjust based on your needs
  });

  return {
    uploadUrl,
    filePath,
  };
}

/**
 * Generate a signed URL for downloading/viewing a video file
 * @param filePath - Path to the file in Cloud Storage
 * @returns Signed download URL
 */
export async function generateDownloadUrl(filePath: string): Promise<string> {
  const file = bucket.file(filePath);

  // Reuse a still-valid signed URL to reduce duplicate generation
  const now = Date.now();
  const cached = downloadUrlCache.get(filePath);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  // Check if file exists
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Generate signed URL for download (valid for configured duration)
  const [downloadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + config.storage.signedUrlExpiry * 1000,
  });

  // Store with a small buffer to avoid returning nearly-expired URLs
  const bufferMs = 60_000; // 1 minute buffer
  const safeTtlMs = Math.max(
    60_000,
    config.storage.signedUrlExpiry * 1000 - bufferMs
  );
  downloadUrlCache.set(filePath, {
    url: downloadUrl,
    expiresAt: now + safeTtlMs,
  });

  return downloadUrl;
}

/**
 * Delete a video file from Cloud Storage
 * @param filePath - Path to the file in Cloud Storage
 */
export async function deleteVideo(filePath: string): Promise<void> {
  const file = bucket.file(filePath);

  const [exists] = await file.exists();
  if (exists) {
    await file.delete();
  }
}

/**
 * Get video metadata from Cloud Storage
 * @param filePath - Path to the file in Cloud Storage
 * @returns File metadata including size, content type, created date
 */
export async function getVideoMetadata(filePath: string): Promise<{
  size: number;
  contentType: string;
  created: string;
  updated: string;
}> {
  const file = bucket.file(filePath);

  const [metadata] = await file.getMetadata();

  return {
    size: Number.parseInt(String(metadata.size || "0"), 10),
    contentType: metadata.contentType || "video/mp4",
    created: metadata.timeCreated || new Date().toISOString(),
    updated: metadata.updated || new Date().toISOString(),
  };
}

/**
 * List all videos in the storage bucket
 * @param prefix - Optional prefix to filter videos (default: 'videos/')
 * @returns Array of file paths
 */
export async function listVideos(prefix = "videos/"): Promise<string[]> {
  const [files] = await bucket.getFiles({ prefix });

  return files.map((file: any) => file.name);
}

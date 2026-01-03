/**
 * Accepted video file types
 */
export const ACCEPTED_VIDEO_FORMATS = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
];

/**
 * Accepted video file extensions
 */
export const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi"];

/**
 * Maximum file size in bytes (500 MB)
 */
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * API base URL
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

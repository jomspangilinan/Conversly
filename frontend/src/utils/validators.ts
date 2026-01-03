import { ACCEPTED_VIDEO_FORMATS, MAX_FILE_SIZE } from "./constants";

export interface ValidationError {
  isValid: false;
  error: string;
}

export interface ValidationSuccess {
  isValid: true;
}

export type ValidationResult = ValidationError | ValidationSuccess;

/**
 * Validate video file
 */
export function validateVideoFile(file: File): ValidationResult {
  // Check file type
  if (!ACCEPTED_VIDEO_FORMATS.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Accepted formats: MP4, WebM, MOV, AVI`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File too large. Maximum size: 500 MB`,
    };
  }

  return { isValid: true };
}

/**
 * Check if file is a video
 */
export function isVideoFile(file: File): boolean {
  return ACCEPTED_VIDEO_FORMATS.includes(file.type);
}

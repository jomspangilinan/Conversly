import type { Video } from "./video.types";

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadUrlResponse {
  videoId: string;
  uploadUrl: string;
  filePath: string;
}

export interface VideoListResponse {
  videos: Video[];
}

export interface VideoDetailResponse {
  video: Video;
}

export interface UploadVideoRequest {
  filename: string;
  title?: string;
  description?: string;
}

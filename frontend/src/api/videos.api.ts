/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import apiClient from "./client";
import { MOCK_MODE, getApiEndpoint } from "../utils/mock";
import type {
  UploadUrlResponse,
  VideoListResponse,
  VideoDetailResponse,
  UploadVideoRequest,
} from "../types/api.types";
import type { Video } from "../types/video.types";

export const videosAPI = {
  /**
   * Get all videos
   */
  async getVideos(): Promise<VideoListResponse> {
    const endpoint = getApiEndpoint("/api/videos");
    const response = await apiClient.get<VideoListResponse>(endpoint);
    return response.data;
  },

  /**
   * Get single video with full details
   */
  async getVideo(id: string): Promise<VideoDetailResponse> {
    const endpoint = getApiEndpoint(`/api/videos/${id}`);
    const response = await apiClient.get<VideoDetailResponse>(endpoint);
    return response.data;
  },

  /**
   * Request upload URL from backend
   */
  async requestUploadUrl(data: UploadVideoRequest): Promise<UploadUrlResponse> {
    const endpoint = MOCK_MODE ? "/api/mock/upload" : "/api/videos/upload-url";
    const response = await apiClient.post<UploadUrlResponse>(endpoint, data);
    return response.data;
  },

  /**
   * Upload video file to Cloud Storage signed URL
   */
  async uploadToStorage(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // Skip actual upload in mock mode
    if (MOCK_MODE) {
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (onProgress) {
          onProgress(progress);
        }
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 100);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await axios.put(url, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },

  /**
   * Trigger video processing with Gemini AI
   */
  async processVideo(id: string): Promise<void> {
    const endpoint = MOCK_MODE
      ? `/api/mock/process/${id}`
      : `/api/videos/${id}/process`;
    await apiClient.post(endpoint);
  },

  /**
   * Delete video
   */
  async deleteVideo(id: string): Promise<void> {
    await apiClient.delete(`/api/videos/${id}`);
  },

  /**
   * Cache a client-generated thumbnail to Firestore
   */
  async cacheThumbnail(
    id: string,
    thumbnailDataUrl: string
  ): Promise<{ thumbnailUrl: string }> {
    const response = await apiClient.post<{ thumbnailUrl: string }>(
      `/api/videos/${id}/cache-thumbnail`,
      { thumbnailDataUrl }
    );
    return response.data;
  },

  /**
   * Refine concepts with AI suggestions
   */
  async refineConceptsWithAI(
    id: string,
    focusArea?: string
  ): Promise<{
    status: string;
    videoId: string;
    message: string;
  }> {
    const endpoint = getApiEndpoint(`/api/videos/${id}/refine-concepts`);
    console.log("🔍 Starting AI refinement for video:", id);
    if (focusArea) {
      console.log("🎯 Focus area:", focusArea);
    }
    // This now returns immediately, refinement happens async
    const response = await apiClient.post(endpoint, { focusArea });
    console.log("✅ Refinement started:", response.data);
    return response.data;
  },

  async getRefinementStatus(id: string): Promise<{
    refinementStatus: string;
    refinementSuggestions: any;
    refinementCompletedAt: Date | null;
    refinementError: string | null;
  }> {
    const endpoint = getApiEndpoint(`/api/videos/${id}/refinement-status`);
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  async applySuggestion(
    id: string,
    suggestionType: string,
    suggestion: any
  ): Promise<{ video: Video }> {
    const endpoint = getApiEndpoint(`/api/videos/${id}/apply-suggestion`);
    console.log("📝 Applying suggestion:", suggestionType);
    const response = await apiClient.post(endpoint, {
      suggestionType,
      suggestion,
    });
    return response.data;
  },

  async analyzeEngagement(id: string): Promise<{
    status: string;
    videoId: string;
    message: string;
  }> {
    const endpoint = getApiEndpoint(`/api/videos/${id}/analyze-engagement`);
    console.log("📊 Starting engagement analysis for video:", id);
    // This now returns immediately, analysis happens async
    const response = await apiClient.post(endpoint, {});
    console.log("✅ Engagement analysis started:", response.data);
    return response.data;
  },

  async getEngagementStatus(id: string): Promise<{
    engagementStatus: string;
    engagementAnalysis: any;
    engagementAnalyzedAt: Date | null;
    engagementError: string | null;
  }> {
    const endpoint = getApiEndpoint(`/api/videos/${id}/engagement-status`);
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  /**
   * Get video for student viewing (watch page)
   */
  async getVideoForStudent(id: string): Promise<{ video: Video }> {
    const endpoint = getApiEndpoint(`/api/videos/${id}/watch`);
    const response = await apiClient.get(endpoint);
    return response.data;
  },
};

/**
 * Helper function to get video by ID and return just the video object
 */
export async function getVideoById(id: string) {
  const response = await videosAPI.getVideo(id);
  return response.video;
}

export default videosAPI;

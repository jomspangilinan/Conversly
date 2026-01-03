import apiClient from "./client";

export interface CheckpointResponsePayload {
  userId: string;
  videoId: string;
  checkpointKey: string;
  checkpointType: string;
  prompt: string;
  timestamp: number;
  selectedIndex?: number;
  isCorrect?: boolean;
  answerText?: string;
  videoTime?: number;
  options?: string[];
  studentName?: string;
}

export interface CheckpointResponseRecord {
  userId: string;
  videoId: string;
  checkpointKey: string;
  checkpointType: string;
  prompt: string;
  timestamp: number;
  selectedIndex: number;
  isCorrect: boolean;
  answerText?: string;
  videoTime?: number;
  options?: string[];
  studentName?: string;
  answeredAt?: string;
  updatedAt?: unknown;
  createdAt?: unknown;
}

async function saveCheckpointResponse(payload: CheckpointResponsePayload) {
  const { data } = await apiClient.post(
    "/api/progress/checkpoint-response",
    payload
  );
  return data;
}

async function getCheckpointResponsesForVideo(userId: string, videoId: string) {
  const { data } = await apiClient.get("/api/progress/checkpoint-responses", {
    params: { userId, videoId },
  });
  return data as {
    userId: string;
    videoId: string;
    responses: CheckpointResponseRecord[];
  };
}

const progressAPI = {
  saveCheckpointResponse,
  getCheckpointResponsesForVideo,
};

export default progressAPI;

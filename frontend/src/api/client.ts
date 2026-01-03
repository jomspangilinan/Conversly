import axios, { type AxiosInstance, type AxiosError } from "axios";
import { getAuthToken } from "../auth/authTokenStore";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token and API keys if needed
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add API keys from sessionStorage if available
    const apiKeysStr = sessionStorage.getItem("apiKeys");
    if (apiKeysStr) {
      try {
        const apiKeys = JSON.parse(apiKeysStr);
        config.headers = config.headers ?? {};
        if (apiKeys.gemini) {
          config.headers["X-Gemini-API-Key"] = apiKeys.gemini;
        }
        if (apiKeys.elevenlabs) {
          config.headers["X-ElevenLabs-API-Key"] = apiKeys.elevenlabs;
        }
      } catch (e) {
        console.warn("Failed to parse API keys from sessionStorage");
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error("Network Error:", error.message);
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * Mock Mode Toggle
 *
 * Set VITE_MOCK_MODE=true in .env.local to use mock endpoints
 * This lets you test the UI without uploading real videos or calling Gemini
 */

export const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === "true";

export const getApiEndpoint = (endpoint: string): string => {
  if (MOCK_MODE) {
    // Replace /api/videos with /api/mock/videos
    if (endpoint.startsWith("/api/videos")) {
      return endpoint.replace("/api/videos", "/api/mock/videos");
    }
    // For other endpoints, just prefix with /api/mock
    return endpoint.replace("/api/", "/api/mock/");
  }
  return endpoint;
};

// Helper to show mock mode indicator
export const showMockIndicator = () => {
  if (MOCK_MODE) {
    console.log(
      "%c🧪 MOCK MODE ENABLED",
      "background: #fbbf24; color: #000; font-size: 16px; padding: 8px; font-weight: bold;"
    );
    console.log("Videos will not actually upload or process. Using mock data.");
  }
};

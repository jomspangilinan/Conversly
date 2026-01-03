#!/bin/bash

# Test Video Upload and Processing
# This script tests the complete video upload pipeline

BACKEND_URL="http://localhost:8080"
VIDEO_URL="https://www.youtube.com/watch?v=IeMYQ-qJeK4"
VIDEO_TITLE="Google Cloud Introduction"
VIDEO_DESCRIPTION="Introduction to Google Cloud Platform services"

echo "🎬 Testing Conversly Video Upload Pipeline"
echo "=========================================="

# Step 1: Download video from YouTube
echo ""
echo "📥 Step 1: Downloading video from YouTube..."
echo "URL: $VIDEO_URL"

# Check if yt-dlp is installed
if ! command -v yt-dlp &> /dev/null; then
    echo "❌ yt-dlp not found. Installing via brew..."
    brew install yt-dlp
fi

# Download video (max 720p, mp4 format, includes audio)
# Using -f 18 which is 720p MP4 with audio, or best available
yt-dlp -f "18/best[height<=720]" \
    --merge-output-format mp4 \
    -o "test-video.mp4" \
    "$VIDEO_URL"

if [ ! -f "test-video.mp4" ]; then
    echo "❌ Failed to download video"
    exit 1
fi

echo "✅ Video downloaded: test-video.mp4"
ls -lh test-video.mp4

# Step 2: Request upload URL from backend
echo ""
echo "📤 Step 2: Requesting upload URL from backend..."

UPLOAD_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/videos/upload-url" \
    -H "Content-Type: application/json" \
    -d "{
        \"filename\": \"test-video.mp4\",
        \"title\": \"$VIDEO_TITLE\",
        \"description\": \"$VIDEO_DESCRIPTION\",
        \"uploadedBy\": \"test-user\"
    }")

echo "Response: $UPLOAD_RESPONSE"

# Extract videoId and uploadUrl from response
VIDEO_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"videoId":"[^"]*' | cut -d'"' -f4)
UPLOAD_URL=$(echo "$UPLOAD_RESPONSE" | grep -o '"uploadUrl":"[^"]*' | cut -d'"' -f4)

if [ -z "$VIDEO_ID" ] || [ -z "$UPLOAD_URL" ]; then
    echo "❌ Failed to get upload URL"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

echo "✅ Upload URL received"
echo "Video ID: $VIDEO_ID"

# Step 3: Upload video to Cloud Storage
echo ""
echo "☁️  Step 3: Uploading video to Cloud Storage..."

UPLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT "$UPLOAD_URL" \
    -H "Content-Type: video/mp4" \
    --data-binary @test-video.mp4)

if [ "$UPLOAD_STATUS" != "200" ]; then
    echo "❌ Upload failed with status: $UPLOAD_STATUS"
    exit 1
fi

echo "✅ Video uploaded to Cloud Storage"

# Step 4: Trigger video processing
echo ""
echo "🤖 Step 4: Triggering video processing with Gemini AI..."

PROCESS_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/videos/$VIDEO_ID/process")

echo "Response: $PROCESS_RESPONSE"

echo ""
echo "✅ Processing started! Video ID: $VIDEO_ID"
echo ""
echo "📊 You can check the status with:"
echo "   curl $BACKEND_URL/api/videos/$VIDEO_ID"
echo ""
echo "🧹 Cleanup: Removing local video file..."
rm -f test-video.mp4

echo ""
echo "🎉 Test complete!"
echo "=========================================="
echo ""
echo "The video is now being processed by Gemini AI."
echo "This may take a few minutes depending on video length."
echo ""
echo "Monitor the backend logs to see processing progress."

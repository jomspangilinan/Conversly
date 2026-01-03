#!/usr/bin/env node

/**
 * Retrigger analysis for an existing video
 * Usage: node reanalyze-video.mjs <videoId> [--force] [--poll]
 *
 * Options:
 *   --force   Clear cached analysis to force fresh AI reanalysis
 *   --poll    Wait and poll for completion instead of exiting immediately
 */

const args = process.argv.slice(2);
const videoId =
  args.find((arg) => !arg.startsWith("--")) || "OIk3Ybyk1jLnAdwal70B";
const forceReanalysis = args.includes("--force");
const pollForCompletion = args.includes("--poll");

const API_BASE = "http://localhost:8080";

async function reanalyzeVideo() {
  try {
    console.log(`🔄 Retriggering analysis for video: ${videoId}`);
    console.log(
      `📝 This will use the NEW prompts with transcriptSnippet and improved checkpoint timing\n`
    );

    // First, get the video to get the YouTube URL
    const getResponse = await fetch(`${API_BASE}/api/videos/${videoId}`);

    if (!getResponse.ok) {
      console.error("❌ Failed to fetch video:", await getResponse.text());
      process.exit(1);
    }

    const video = await getResponse.json();

    console.log(`📹 Video: ${video.title || "Untitled"}`);
    console.log(`📊 Current status: ${video.status || "unknown"}`);
    console.log(`🔄 Force reanalysis: ${forceReanalysis ? "YES" : "NO"}\n`);

    // If force flag is set, clear the cached analysis fields
    if (forceReanalysis) {
      console.log(
        "🗑️  Clearing cached analysis to force fresh AI reanalysis..."
      );
      const clearResponse = await fetch(`${API_BASE}/api/videos/${videoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aiAnalysisCompletedAt: null,
          aiAnalysisVersion: null,
        }),
      });

      if (!clearResponse.ok) {
        console.error("❌ Failed to clear cache:", await clearResponse.text());
        process.exit(1);
      }
      console.log("✅ Cache cleared!\n");
    }

    // Trigger new analysis using the process endpoint
    const response = await fetch(`${API_BASE}/api/videos/${videoId}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Analysis request failed:", error);
      process.exit(1);
    }

    const result = await response.json();
    console.log("✅ Analysis started successfully!");
    console.log("📊 Status:", result);
    console.log("\n💡 The video will be re-analyzed with:");
    console.log("   ✅ transcriptSnippet field for each concept");
    console.log(
      "   ✅ Improved checkpoint timing (AFTER concepts, except predictions)"
    );
    console.log("   ✅ Better AI understanding of when concepts are explained");

    if (pollForCompletion) {
      console.log("\n⏳ Polling for completion...\n");
      await pollVideoStatus(videoId);
    } else {
      console.log("\n⏳ Analysis running in background...");
      console.log("   This will take 2-3 minutes to complete.");
      console.log(`\n📊 Check status: GET ${API_BASE}/api/videos/${videoId}`);
      console.log(
        `\n💡 Tip: Use --poll flag to wait for completion: node reanalyze-video.mjs ${videoId} --poll`
      );
    }
  } catch (error) {
    console.error("❌ Error retriggering analysis:", error);
    process.exit(1);
  }
}

async function pollVideoStatus(videoId) {
  const maxAttempts = 60; // 5 minutes max (5s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${API_BASE}/api/videos/${videoId}`);
      const video = await response.json();

      const status = video.status;
      const stage = video.processingStage || "";

      // Show progress
      if (status === "processing") {
        process.stdout.write(
          `\r⏳ Status: ${status} (${stage || "in progress"})...`
        );
      } else if (status === "ready") {
        console.log("\n\n✅ Analysis complete!");
        console.log(`📄 Output file: backend/output/${videoId}.json`);
        console.log(`\n💡 View results:`);
        console.log(
          `   cat backend/output/${videoId}.json | jq '.parsedAnalysis.concepts[0]'`
        );
        break;
      } else if (status === "failed") {
        console.log("\n\n❌ Analysis failed!");
        console.log("Error:", video.error || "Unknown error");
        process.exit(1);
      } else {
        console.log(`\n\n⚠️  Unexpected status: ${status}`);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s
      attempts++;
    } catch (error) {
      console.error("\n❌ Error polling status:", error);
      process.exit(1);
    }
  }

  if (attempts >= maxAttempts) {
    console.log("\n\n⏰ Timeout waiting for completion");
    console.log(`Check status manually: GET ${API_BASE}/api/videos/${videoId}`);
  }
}

reanalyzeVideo();

#!/usr/bin/env node

/**
 * Test script to trigger refinement with focus on checkpoint timing
 * Usage: node test-refinement-timing.mjs <videoId>
 */

const videoId = process.argv[2];

if (!videoId) {
  console.error("❌ Usage: node test-refinement-timing.mjs <videoId>");
  process.exit(1);
}

const API_BASE = "http://localhost:5001";

async function triggerRefinement() {
  try {
    console.log(`🔍 Triggering refinement for video: ${videoId}`);
    console.log(
      `📝 Focus area: Fix checkpoint timing - ensure checkpoints come AFTER concepts are explained\n`
    );

    const response = await fetch(`${API_BASE}/api/videos/${videoId}/refine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        focusArea:
          "Fix checkpoint timing - ensure checkpoints (except predictions) are placed AFTER their related concepts are fully explained. Check all checkpoints and move any that appear before their concept explanation.",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Refinement request failed:", error);
      process.exit(1);
    }

    const result = await response.json();
    console.log("✅ Refinement started successfully!");
    console.log("📊 Status:", result);
    console.log("\n💡 Monitor progress:");
    console.log(`   GET ${API_BASE}/api/videos/${videoId}/refinement-status`);
    console.log("\n⏳ Refinement running in background...");
    console.log("   This will take 1-2 minutes to complete.");
  } catch (error) {
    console.error("❌ Error triggering refinement:", error);
    process.exit(1);
  }
}

triggerRefinement();

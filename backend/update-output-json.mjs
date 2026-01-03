#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import admin from "firebase-admin";
import { readFileSync, writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "service-account.json"), "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "conversly-482008-videos",
});

const db = admin.firestore();

async function updateOutputJson(videoId) {
  console.log(`📝 Updating output JSON for video: ${videoId}`);

  // Get video from Firestore
  const videoDoc = await db.collection("videos").doc(videoId).get();

  if (!videoDoc.exists) {
    console.error("❌ Video not found in Firestore");
    process.exit(1);
  }

  const videoData = videoDoc.data();

  // Read existing output JSON
  const outputPath = join(__dirname, "output", `${videoId}.json`);
  let outputData;

  try {
    outputData = JSON.parse(readFileSync(outputPath, "utf8"));
  } catch (error) {
    console.error("❌ Could not read existing output JSON:", error.message);
    process.exit(1);
  }

  // Update with latest data from Firestore
  const updatedData = {
    ...outputData,
    parsedAnalysis: {
      ...outputData.parsedAnalysis,
      // Update concepts if they were refined
      concepts: videoData.concepts || outputData.parsedAnalysis.concepts,
      // Update checkpoints if they were refined
      checkpoints:
        videoData.checkpoints || outputData.parsedAnalysis.checkpoints,
      // Update quiz if refined
      quiz: videoData.quiz || outputData.parsedAnalysis.quiz,
    },
  };

  // Add refinement data if exists
  if (
    videoData.refinementStatus === "complete" &&
    videoData.refinementSuggestions
  ) {
    updatedData.refinementStatus = videoData.refinementStatus;
    updatedData.refinementSuggestions = videoData.refinementSuggestions;
    updatedData.refinementCompletedAt = videoData.refinementCompletedAt;
    updatedData.refinementFocusArea = videoData.refinementFocusArea;
  }

  // Add engagement analysis if exists
  if (
    videoData.engagementStatus === "complete" &&
    videoData.engagementAnalysis
  ) {
    updatedData.engagementStatus = videoData.engagementStatus;
    updatedData.engagementAnalysis = videoData.engagementAnalysis;
    updatedData.engagementAnalyzedAt = videoData.engagementAnalyzedAt;
  }

  // Write updated JSON
  writeFileSync(outputPath, JSON.stringify(updatedData, null, 2));

  console.log("✅ Output JSON updated successfully");
  console.log(`📊 Status:`);
  console.log(`   - Refinement: ${updatedData.refinementStatus || "not run"}`);
  console.log(
    `   - Engagement Analysis: ${updatedData.engagementStatus || "not run"}`
  );
  console.log(`   - Concepts: ${updatedData.parsedAnalysis.concepts.length}`);
  console.log(
    `   - Checkpoints: ${updatedData.parsedAnalysis.checkpoints.length}`
  );
  console.log(`   - Quiz: ${updatedData.parsedAnalysis.quiz.length}`);
}

// Get video ID from command line
const videoId = process.argv[2];

if (!videoId) {
  console.error("Usage: node update-output-json.mjs <videoId>");
  process.exit(1);
}

updateOutputJson(videoId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });

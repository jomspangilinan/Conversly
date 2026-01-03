/**
 * Import concepts from analysis JSON file to Firestore
 * Run: node import-concepts.mjs OIk3Ybyk1jLnAdwal70B
 */

import { readFileSync } from "fs";
import admin from "firebase-admin";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "service-account.json"), "utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function importConcepts(videoId) {
  try {
    console.log(`📚 Importing concepts for video: ${videoId}`);

    // Read analysis file
    const analysisPath = join(__dirname, "output", `${videoId}.json`);
    const analysisData = JSON.parse(readFileSync(analysisPath, "utf-8"));

    if (!analysisData.parsedAnalysis || !analysisData.parsedAnalysis.concepts) {
      console.error("❌ No concepts found in analysis file");
      process.exit(1);
    }

    const concepts = analysisData.parsedAnalysis.concepts;
    console.log(`✅ Found ${concepts.length} concepts in analysis file`);

    // Update Firestore
    const videoRef = db.collection("videos").doc(videoId);
    const doc = await videoRef.get();

    if (!doc.exists) {
      console.error("❌ Video not found in Firestore");
      process.exit(1);
    }

    await videoRef.update({
      concepts: concepts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `✅ Successfully imported ${concepts.length} concepts to Firestore`
    );
    console.log("\nConcepts imported:");
    concepts.forEach((c, i) => {
      console.log(
        `  ${i + 1}. [${c.conceptType}] ${c.concept} @ ${c.timestamp}s (${
          c.importance
        })`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error importing concepts:", error);
    process.exit(1);
  }
}

// Get video ID from command line
const videoId = process.argv[2];

if (!videoId) {
  console.error("Usage: node import-concepts.mjs <videoId>");
  process.exit(1);
}

importConcepts(videoId);

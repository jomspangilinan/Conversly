/**
 * Check what's in Firestore for a video
 * Run: node check-firestore.mjs OIk3Ybyk1jLnAdwal70B
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";
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

async function checkFirestore(videoId) {
  try {
    console.log(`🔍 Checking Firestore for video: ${videoId}\n`);

    const videoRef = db.collection("videos").doc(videoId);
    const doc = await videoRef.get();

    if (!doc.exists) {
      console.error("❌ Video not found in Firestore");
      process.exit(1);
    }

    const data = doc.data();

    console.log("📹 Video in Firestore:");
    console.log(`  ID: ${doc.id}`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Duration: ${data.duration}`);
    console.log(`  Has transcript: ${!!data.transcript}`);
    console.log(`  Has summary: ${!!data.summary}`);
    console.log(`  Concepts: ${data.concepts?.length || 0}`);
    console.log(`  Quiz questions: ${data.quiz?.length || 0}`);
    console.log(`  Checkpoints: ${data.checkpoints?.length || 0}`);
    console.log(
      `  AI analysis completed: ${data.aiAnalysisCompletedAt || "No"}`
    );
    console.log(`  Processed at: ${data.processedAt || "No"}`);

    if (data.concepts && data.concepts.length > 0) {
      console.log("\n✅ Concepts in Firestore:");
      data.concepts.forEach((c, i) => {
        console.log(
          `  ${i + 1}. [${c.conceptType || "?"}] ${c.concept} @ ${c.timestamp}s`
        );
      });
    } else {
      console.log("\n❌ NO CONCEPTS in Firestore!");
    }

    console.log("\n📄 Full document structure:");
    console.log(JSON.stringify(data, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking Firestore:", error);
    process.exit(1);
  }
}

const videoId = process.argv[2];

if (!videoId) {
  console.error("Usage: node check-firestore.mjs <videoId>");
  process.exit(1);
}

checkFirestore(videoId);

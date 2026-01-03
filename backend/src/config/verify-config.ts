import * as dotenv from "dotenv";
dotenv.config();

console.log("\n🔍 Configuration Verification\n" + "=".repeat(50));

const checks = {
  "✅ GCP Project ID": process.env.GCP_PROJECT_ID,
  "✅ GCP Region": process.env.GCP_REGION,
  "✅ Storage Bucket": process.env.GCS_BUCKET_NAME,
  "✅ Gemini API Key": process.env.GEMINI_API_KEY
    ? "✓ Configured"
    : "✗ Missing",
  "✅ ElevenLabs API Key": process.env.ELEVENLABS_API_KEY
    ? "✓ Configured"
    : "✗ Missing",
  "✅ Firebase Project": process.env.FIREBASE_PROJECT_ID,
  "✅ Service Account Path": process.env.GCP_SERVICE_ACCOUNT_PATH,
};

let allGood = true;
for (const [label, value] of Object.entries(checks)) {
  const status =
    value && value !== "your-project-id" && value !== "your-api-key"
      ? "✓"
      : "✗";
  console.log(`${status} ${label.replace("✅ ", "")}: ${value || "NOT SET"}`);
  if (status === "✗") allGood = false;
}

console.log("=".repeat(50));
console.log(
  allGood
    ? "\n✅ All configurations look good!\n"
    : "\n⚠️  Some configurations are missing!\n"
);

// Check if service account file exists
import * as fs from "fs";
const saPath = process.env.GCP_SERVICE_ACCOUNT_PATH || "./service-account.json";
if (fs.existsSync(saPath)) {
  console.log("✓ Service account file found");
} else {
  console.log("✗ Service account file NOT found at:", saPath);
}

console.log("\n📋 Next Steps:");
console.log("1. If all ✓ above, you're ready to test APIs!");
console.log("2. Run: npm run test:apis\n");

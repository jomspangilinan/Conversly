import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: "conversly-482008",
  keyFilename: "/Users/Joms/elevenlabs/backend/service-account.json",
});

const bucket = storage.bucket("conversly-482008-videos");
const filename = `test/sample-${Date.now()}.mp4`;
const file = bucket.file(filename);

console.log("🧪 Testing Cloud Storage Signed URL Generation");
console.log("==============================================");
console.log("Bucket:", "conversly-482008-videos");
console.log("File:", filename);
console.log("");

file
  .getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 3600000,
    contentType: "video/mp4",
  })
  .then(([url]) => {
    console.log("✅ Signed URL generated successfully!");
    console.log("URL length:", url.length);
    console.log("URL preview:", url.substring(0, 150) + "...");
    console.log("");
    console.log("✅ Cloud Storage authentication is working!");
  })
  .catch((error) => {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  });

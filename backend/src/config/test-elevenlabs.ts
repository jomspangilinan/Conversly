import * as dotenv from "dotenv";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

dotenv.config();

async function testElevenLabs() {
  console.log("\n🎙️  Testing ElevenLabs API\n" + "=".repeat(50));

  try {
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    // Test 1: Get user info
    console.log("Test 1: Fetching user info...");
    const user = await client.user.get();
    console.log("✅ User:", user.subscription?.tier || "Free tier");

    // Test 2: List available voices
    console.log("\nTest 2: Fetching available voices...");
    const voices = await client.voices.getAll();
    console.log(`✅ Found ${voices.voices.length} voices`);
    console.log(
      "Sample voices:",
      voices.voices
        .slice(0, 3)
        .map((v) => v.name)
        .join(", ")
    );

    // Test 3: Generate sample speech
    console.log("\nTest 3: Generating sample audio...");
    const audioStream = await client.textToSpeech.convert(
      voices.voices[0].voiceId,
      {
        text: "Hello from Conversly! This is a test of the ElevenLabs text to speech API.",
        modelId: "eleven_multilingual_v2",
      }
    );

    // Validate that we got a response
    if (!audioStream) {
      throw new Error("No audio stream received from ElevenLabs");
    }

    // Save audio to file
    const fs = await import("node:fs");
    const outputPath = "./test-audio.mp3";

    // Convert audio stream to buffer and save
    const chunks: Uint8Array[] = [];

    try {
      for await (const chunk of audioStream) {
        // Validate chunk before processing
        if (chunk && chunk instanceof Uint8Array) {
          chunks.push(chunk);
        } else {
          console.warn("Received invalid chunk, skipping...");
        }
      }

      // Check if we got any data
      if (chunks.length === 0) {
        throw new Error("No audio data received");
      }

      // Combine all chunks into a single buffer
      const buffer = Buffer.concat(chunks);

      // Validate buffer has content
      if (buffer.length === 0) {
        throw new Error("Generated audio buffer is empty");
      }

      // Save to file
      fs.writeFileSync(outputPath, buffer);

      console.log("✅ Audio generated successfully!");
      console.log(`   Voice: ${voices.voices[0].name}`);
      console.log(`   Saved to: ${outputPath}`);
      console.log(`   Size: ${(buffer.length / 1024).toFixed(2)} KB`);
      console.log(`   Chunks received: ${chunks.length}`);
    } catch (streamError: any) {
      throw new Error(`Failed to process audio stream: ${streamError.message}`);
    }
    console.log("\n✅ ElevenLabs API: ALL TESTS PASSED");
    return true;
  } catch (error: any) {
    console.error("❌ ElevenLabs API Error:", error.message);
    return false;
  }
}

// Run tests
testElevenLabs()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

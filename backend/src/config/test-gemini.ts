import * as dotenv from "dotenv";

dotenv.config();

async function testGemini() {
  console.log("\n🤖 Testing Gemini API\n" + "=".repeat(50));

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // Test 1: Simple text generation
    console.log("Test 1: Simple text generation...");
    // Using gemini-2.0-flash-exp based on your working curl command
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt =
      "Explain what a cloud zone is in Google Cloud Platform in one sentence.";
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    console.log("✅ Response:", response.substring(0, 100) + "...");

    // Test 2: Structured conversation
    console.log("\nTest 2: Testing conversation capabilities...");
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: "You are a helpful learning assistant for technical concepts.",
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "I understand. I'll help explain technical concepts clearly and concisely.",
            },
          ],
        },
      ],
    });

    const chatResult = await chat.sendMessage("What is serverless computing?");
    const chatResponse = chatResult.response.text();
    console.log("✅ Chat response:", chatResponse.substring(0, 100) + "...");

    // Test 3: Content analysis (simulating video transcript processing)
    console.log("\nTest 3: Testing content analysis...");
    const analysisPrompt = `Extract 3 key concepts from this text:
    "Google Cloud Platform provides various services including Compute Engine for virtual machines, 
    Cloud Storage for object storage, and BigQuery for analytics."
    
    Return as JSON: { "concepts": ["concept1", "concept2", "concept3"] }`;

    const analysisResult = await model.generateContent(analysisPrompt);
    const analysisResponse = analysisResult.response.text();
    console.log("✅ Analysis:", analysisResponse.substring(0, 150) + "...");

    console.log("\n✅ Gemini API: ALL TESTS PASSED");
    return true;
  } catch (error: any) {
    console.error("❌ Gemini API Error:", error.message);
    if (error.message.includes("API key")) {
      console.error("   Hint: Check your GEMINI_API_KEY in .env");
    }
    return false;
  }
}

// Run tests
testGemini()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

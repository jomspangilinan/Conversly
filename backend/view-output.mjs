#!/usr/bin/env node

/**
 * Utility to view and analyze Gemini output logs
 * Usage:
 *   node view-output.mjs list                    # List all outputs
 *   node view-output.mjs show <videoId>          # Show complete output
 *   node view-output.mjs prompt <videoId>        # Show only prompt used
 *   node view-output.mjs concepts <videoId>      # Show only concepts
 *   node view-output.mjs compare <id1> <id2>     # Compare two analyses
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "output");

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

function listOutputs() {
  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const filePath = path.join(outputDir, f);
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return {
        videoId: f.replace(".json", ""),
        date: data.analysisDate,
        concepts: data.parsedAnalysis.concepts.length,
        checkpoints: data.parsedAnalysis.checkpoints.length,
        modified: stats.mtime,
      };
    })
    .sort((a, b) => b.modified - a.modified);

  console.log("\n📁 Gemini Analysis Outputs:\n");
  files.forEach((f) => {
    console.log(`  ${f.videoId}`);
    console.log(`    Date: ${f.date}`);
    console.log(`    Concepts: ${f.concepts}, Checkpoints: ${f.checkpoints}`);
    console.log(`    Modified: ${f.modified.toLocaleString()}\n`);
  });
  console.log(`Total: ${files.length} analyses\n`);
}

function showOutput(videoId) {
  const filePath = path.join(outputDir, `${videoId}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No output found for video ID: ${videoId}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(JSON.stringify(data, null, 2));
}

function showPrompt(videoId) {
  const filePath = path.join(outputDir, `${videoId}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No output found for video ID: ${videoId}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log("\n📝 Prompt Used:\n");
  console.log(data.prompt);
  console.log("\n");
}

function showConcepts(videoId) {
  const filePath = path.join(outputDir, `${videoId}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No output found for video ID: ${videoId}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log("\n🎯 Concepts Generated:\n");
  data.parsedAnalysis.concepts.forEach((c, i) => {
    console.log(`${i + 1}. [${c.timestamp}s] ${c.concept}`);
    console.log(
      `   Type: ${c.conceptType || "NOT SET"}, Importance: ${c.importance}`
    );
    console.log(
      `   Visual: ${c.visualEmphasis ? "YES" : "NO"}${
        c.parentId ? ` (parent: ${c.parentId})` : ""
      }`
    );
    console.log(`   ${c.description.substring(0, 100)}...\n`);
  });
}

function compareOutputs(id1, id2) {
  const file1 = path.join(outputDir, `${id1}.json`);
  const file2 = path.join(outputDir, `${id2}.json`);

  if (!fs.existsSync(file1) || !fs.existsSync(file2)) {
    console.error("❌ One or both video IDs not found");
    process.exit(1);
  }

  const data1 = JSON.parse(fs.readFileSync(file1, "utf-8"));
  const data2 = JSON.parse(fs.readFileSync(file2, "utf-8"));

  console.log("\n🔄 Comparison:\n");
  console.log(`Video 1: ${id1} (${data1.analysisDate})`);
  console.log(`Video 2: ${id2} (${data2.analysisDate})\n`);

  console.log("Concepts:");
  console.log(`  Video 1: ${data1.parsedAnalysis.concepts.length}`);
  console.log(`  Video 2: ${data2.parsedAnalysis.concepts.length}\n`);

  console.log("Checkpoints:");
  console.log(`  Video 1: ${data1.parsedAnalysis.checkpoints.length}`);
  console.log(`  Video 2: ${data2.parsedAnalysis.checkpoints.length}\n`);

  console.log("Prompt lengths:");
  console.log(`  Video 1: ${data1.prompt.length} chars`);
  console.log(`  Video 2: ${data2.prompt.length} chars\n`);
}

switch (command) {
  case "list":
    listOutputs();
    break;
  case "show":
    if (!arg1) {
      console.error("Usage: node view-output.mjs show <videoId>");
      process.exit(1);
    }
    showOutput(arg1);
    break;
  case "prompt":
    if (!arg1) {
      console.error("Usage: node view-output.mjs prompt <videoId>");
      process.exit(1);
    }
    showPrompt(arg1);
    break;
  case "concepts":
    if (!arg1) {
      console.error("Usage: node view-output.mjs concepts <videoId>");
      process.exit(1);
    }
    showConcepts(arg1);
    break;
  case "compare":
    if (!arg1 || !arg2) {
      console.error(
        "Usage: node view-output.mjs compare <videoId1> <videoId2>"
      );
      process.exit(1);
    }
    compareOutputs(arg1, arg2);
    break;
  default:
    console.log("Gemini Output Viewer");
    console.log("\nUsage:");
    console.log(
      "  node view-output.mjs list                    # List all outputs"
    );
    console.log(
      "  node view-output.mjs show <videoId>          # Show complete output"
    );
    console.log(
      "  node view-output.mjs prompt <videoId>        # Show only prompt used"
    );
    console.log(
      "  node view-output.mjs concepts <videoId>      # Show only concepts"
    );
    console.log(
      "  node view-output.mjs compare <id1> <id2>     # Compare two analyses"
    );
    console.log("");
}

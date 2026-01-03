# Gemini Analysis Output Logs

This folder contains complete logs of every video analysis performed by Gemini AI.

## File Structure

Each video analysis creates a file named `{videoId}.json` with the following structure:

```json
{
  "videoId": "3MyyxH6rnySWsSBqV6Ba",
  "videoPath": "videos/test-video.mp4",
  "analysisDate": "2025-12-24T10:30:45.123Z",
  "aiConfigVersion": "v1.0",

  "prompt": "You are an expert educational content analyzer...",

  "rawResponse": "{\n  \"title\": \"Video Title\",\n  \"concepts\": [...],\n  ...\n}",

  "parsedAnalysis": {
    "title": "Video Title",
    "transcript": "Complete transcription...",
    "concepts": [
      {
        "concept": "Main Topic",
        "timestamp": 45,
        "description": "Explanation...",
        "importance": "high",
        "conceptType": "main",
        "visualEmphasis": true,
        "visualElements": "Code shown on screen"
      }
    ],
    "quiz": [...],
    "checkpoints": [...],
    "summary": "Brief overview...",
    "duration": 600
  }
}
```

## Purpose

These logs help you:

1. **Track prompt evolution** - See how prompt changes affect output quality
2. **Debug issues** - Compare raw response vs parsed result to find parsing errors
3. **Analyze trends** - Understand what Gemini generates for different video types
4. **Improve prompts** - Iterate on prompt engineering by reviewing actual outputs
5. **Version control** - Track which AI config version was used for each analysis

## Usage

### Find a specific video's analysis:

```bash
cat output/{videoId}.json | jq '.parsedAnalysis.concepts'
```

### Check what prompt was used:

```bash
cat output/{videoId}.json | jq -r '.prompt' | head -50
```

### Compare raw vs parsed:

```bash
# Raw response from Gemini
cat output/{videoId}.json | jq -r '.rawResponse' > raw.json

# Parsed result
cat output/{videoId}.json | jq '.parsedAnalysis' > parsed.json

# Compare
diff raw.json parsed.json
```

### Find analyses by date:

```bash
ls -lt output/*.json | head -10
```

## Notes

- Files are automatically generated during video processing
- One file per video (overwritten if video is re-analyzed)
- Files are excluded from git (see `.gitignore`)
- Keep files for debugging and prompt improvement iterations

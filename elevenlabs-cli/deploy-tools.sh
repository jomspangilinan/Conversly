#!/bin/bash
set -e

cd /Users/Joms/elevenlabs/elevenlabs-cli

echo "================================================"
echo "ElevenLabs Tools Deployment"
echo "================================================"
echo ""

# Check if authenticated
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "⚠️  No ELEVENLABS_API_KEY environment variable found."
    echo ""
    echo "Option 1: Set API key for this session:"
    echo "  export ELEVENLABS_API_KEY='your_api_key_here'"
    echo ""
    echo "Option 2: Interactive login:"
    echo "  npx -y @elevenlabs/cli auth login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ API key found"
echo ""

# Dry run first
echo "📋 Dry run - checking what will be pushed..."
npx -y @elevenlabs/cli tools push --no-ui --dry-run
echo ""

# Confirm
read -p "🚀 Push these tools to ElevenLabs? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 0
fi

# Push tools
echo ""
echo "⬆️  Pushing tools..."
npx -y @elevenlabs/cli tools push --no-ui

echo ""
echo "✅ Tools pushed successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Check tools.json for updated tool IDs"
echo "  2. Update agent config with new tool IDs"
echo "  3. Update agent system prompt"
echo ""

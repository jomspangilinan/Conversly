# ElevenLabs CLI — Tool Sync

This folder is a local “Agents as Code” workspace for the ElevenLabs CLI.

## What’s in here

- `tools.json`: Index of tools to push/pull
- `tool_configs/`: Individual tool config JSON files

## Push the client tools (requires auth)

These tool configs are ready to push:

- `getContext`
- `getContextBriefing`
- `seekToTime`
- `openTab`

### Option A — set an env var (recommended)

From this directory:

```bash
cd /Users/Joms/elevenlabs/elevenlabs-cli

# set once for this shell session
export ELEVENLABS_API_KEY="YOUR_KEY_HERE"

# dry-run first
npx -y @elevenlabs/cli tools push --no-ui --dry-run

# then push
npx -y @elevenlabs/cli tools push --no-ui
```

### Option B — interactive login

```bash
npx -y @elevenlabs/cli auth login
```

Then:

```bash
npx -y @elevenlabs/cli tools push --no-ui
```

## After pushing

- The CLI will write the created tool IDs back into `tools.json`.
- Make sure your ElevenLabs Agent is configured to use these tools (name match must be exact).
- Then you should start seeing your in-app logs like `clientTool.getContext` when the agent invokes a tool.

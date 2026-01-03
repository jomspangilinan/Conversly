# API Keys Feature

## Overview

Users can provide their own API keys for Gemini and ElevenLabs services. Keys are stored in browser `sessionStorage` and never saved to the server or database.

## User Flow

1. **Access Settings**: Click the "API Keys" button (⚙️) in any page header
2. **Enter Keys**:
   - Gemini API Key from https://aistudio.google.com/app/apikey
   - ElevenLabs API Key from https://elevenlabs.io/app/settings/api-keys
3. **Save**: Keys are stored in browser's sessionStorage
4. **Auto-Send**: All API requests automatically include keys in headers

## Privacy & Security

- **Session-Only**: Keys cleared when browser tab/window closes
- **Not Persistent**: Keys NOT saved to localStorage, cookies, or server
- **Header-Based**: Sent via `X-Gemini-API-Key` and `X-ElevenLabs-API-Key` headers
- **Fallback**: If user doesn't provide keys, backend's environment keys are used (if available)

## Technical Implementation

### Frontend

**ApiKeysContext.tsx**

```typescript
// Session-based storage for API keys
export const ApiKeysProvider = ({ children }) => {
  const [keys, setKeys] = useState<ApiKeys>(() => {
    const stored = sessionStorage.getItem("apiKeys");
    return stored ? JSON.parse(stored) : { gemini: "", elevenlabs: "" };
  });

  const saveKeys = (newKeys: ApiKeys) => {
    setKeys(newKeys);
    sessionStorage.setItem("apiKeys", JSON.stringify(newKeys));
  };
  // ...
};
```

**client.ts (API Interceptor)**

```typescript
// Automatically add keys to all requests
api.interceptors.request.use((config) => {
  const apiKeysStr = sessionStorage.getItem("apiKeys");
  if (apiKeysStr) {
    const apiKeys = JSON.parse(apiKeysStr);
    config.headers["X-Gemini-API-Key"] = apiKeys.gemini;
    config.headers["X-ElevenLabs-API-Key"] = apiKeys.elevenlabs;
  }
  return config;
});
```

### Backend

**env.ts**

```typescript
// API keys now optional
if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "⚠️  GEMINI_API_KEY not set - users must provide their own API keys"
  );
}

export function getApiKeys(req?: any): { gemini: string; elevenlabs: string } {
  return {
    gemini: req?.headers?.["x-gemini-api-key"] || config.gemini.apiKey,
    elevenlabs:
      req?.headers?.["x-elevenlabs-api-key"] || config.elevenlabs.apiKey,
  };
}
```

**Usage in Services**

```typescript
// Before
const response = await geminiAPI.analyze(video, config.gemini.apiKey);

// After
const { gemini, elevenlabs } = getApiKeys(req);
const response = await geminiAPI.analyze(video, gemini);
```

## Deployment Configuration

### Option 1: Admin Provides Keys (Traditional)

```bash
# backend/.env
GEMINI_API_KEY=AIza...
ELEVENLABS_API_KEY=sk_...
```

All users share the admin's API keys. Admin pays for all usage.

### Option 2: Users Provide Keys (New)

```bash
# backend/.env
# Leave empty or omit entirely
# GEMINI_API_KEY=
# ELEVENLABS_API_KEY=
```

Users must provide their own keys via Settings modal. Each user pays for their own usage.

### Option 3: Hybrid (Recommended)

```bash
# backend/.env
GEMINI_API_KEY=AIza...     # Fallback for free trial users
ELEVENLABS_API_KEY=sk_...  # Fallback for free trial users
```

Users can optionally provide their own keys to avoid rate limits.

## Where API Keys Button Appears

- ✅ **UploadPage** - Creator uploads videos (needs Gemini for analysis)
- ✅ **CreatorHomePage** - Creator dashboard
- ✅ **VideoHeader** - Creator video review page
- ✅ **StudentHomePage** - Student dashboard
- ✅ **StudentWatchPage** - Student watch page (needs ElevenLabs for voice tutor)

## Cost Implications

### Gemini API

- Free tier: 15 requests per minute, 1500 per day
- Pay-as-you-go: ~$0.075 per 1K tokens
- Video analysis: ~$0.05-0.15 per video

### ElevenLabs API

- Free tier: 10K characters per month
- Starter: $5/month for 30K characters
- Creator: $22/month for 100K characters
- Voice tutor session: ~2K-5K characters

## Testing

```bash
# Frontend - Test session storage
sessionStorage.setItem('apiKeys', JSON.stringify({
  gemini: 'test-gemini-key',
  elevenlabs: 'test-elevenlabs-key'
}));

# Backend - Test header parsing
curl -H "X-Gemini-API-Key: test-key" http://localhost:3000/api/videos
```

## Future Enhancements

- [ ] Auto-popup modal if backend has no keys configured
- [ ] Usage tracking per user API key
- [ ] Key validation on save (test API call)
- [ ] Support for organization-wide keys
- [ ] Admin dashboard to monitor API usage

# Mock Mode for Testing

## What is Mock Mode?

Mock mode lets you test the frontend UI without calling expensive Gemini AI APIs, but **still uses real uploaded videos**.

### What Mock Mode Does:

✅ **Uses real uploaded videos** from Google Cloud Storage  
✅ **Returns mock AI analysis** (concepts, quiz, transcript)  
✅ **Skips Gemini processing** (saves API costs)  
✅ **Allows full UI testing** (thumbnails, playback, editing)

### What Mock Mode Doesn't Do:

❌ Actually analyze video content with AI  
❌ Generate real concepts based on video  
❌ Create accurate quiz questions  
❌ Extract real transcripts

Perfect for:

- 🎨 UI development and design
- 🧪 Testing workflows without AI costs
- 🎥 Testing with your own videos
- 📐 Layout and interaction testing

## How It Works

1. **Upload a video** → Stored in Google Cloud Storage (REAL)
2. **Video ID created** → Saved in Firestore (REAL)
3. **Mock endpoint called** → Returns your video + fake concepts (MOCK)
4. **UI displays** → Your video with mock markers/quiz

## How to Enable Mock Mode

### Option 1: Environment Variable (Recommended)

1. Create `frontend/.env.local`:

```bash
cd frontend
cp .env.local.example .env.local
```

2. Edit `.env.local` and set:

```
VITE_MOCK_MODE=true
```

3. Restart the dev server:

```bash
npm run dev
```

4. You'll see a yellow banner at the top: "🧪 MOCK MODE"

### Option 2: Temporary (No File Changes)

```bash
cd frontend
VITE_MOCK_MODE=true npm run dev
```

## What Mock Mode Does

### Backend (`/api/mock/*`)

- `POST /api/mock/upload` - Returns fake video ID (no upload)
- `POST /api/mock/process/:id` - Simulates 2-second processing
- `GET /api/mock/videos/:id` - Returns mock video with test data
- `GET /api/mock/videos` - Returns list with one mock video

### Frontend

- Shows "🧪 MOCK MODE" banner at top
- Console shows mock indicator in yellow
- Upload "completes" in 1 second (fake progress)
- Processing takes 2-3 seconds (instead of minutes)
- Returns realistic test data:
  - 5 key concepts with timestamps
  - Full transcript
  - 3 quiz questions
  - Visual highlights

### Mock Data

Located in: `backend/src/routes/mock.ts`

**Mock Video**: "Introduction to Google Cloud Platform"

- Duration: 22 minutes (1320 seconds)
- 5 concepts (GCP intro, Compute Engine, Cloud Storage, IAM, Billing)
- 3 quiz questions
- Realistic transcript and descriptions

## When to Use Mock Mode

✅ **Use Mock Mode for:**

- Developing Creator Dashboard
- Testing video review page
- Building edit concept modal
- UI styling and layout
- Testing workflows without costs

❌ **Don't Use Mock Mode for:**

- Testing actual Gemini prompts
- Verifying video processing quality
- Cloud Storage integration testing
- Production or demo environments

## Cost Savings

**Real Mode:**

- Gemini 2.0 Flash: ~$0.30 per 22-min video
- Cloud Storage: ~$0.026/GB
- **Total per test upload: ~$0.35**

**Mock Mode:**

- Gemini API: $0 (not called)
- Cloud Storage: $0 (not used)
- **Total per test: $0** 💰

## Switching Back

To disable mock mode:

1. Edit `frontend/.env.local`:

```
VITE_MOCK_MODE=false
```

2. Or delete the file:

```bash
rm frontend/.env.local
```

3. Restart dev server

## Testing the Full Flow

With mock mode enabled:

1. Go to http://localhost:5173/
2. "Upload" a video (any file works, won't actually upload)
3. See fake progress complete in ~3 seconds
4. Video ID returned: `mock-video-1` or similar
5. Fetch video: GET /api/mock/videos/:id
6. See full mock data with concepts, transcript, quiz

## Troubleshooting

**Mock mode not working?**

- Check `.env.local` exists in `frontend/` folder
- Verify `VITE_MOCK_MODE=true` (exact spelling)
- Restart dev server (Vite needs restart for env changes)
- Check browser console for yellow "MOCK MODE ENABLED" message

**Still calling real APIs?**

- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
- Check Network tab - should see `/api/mock/` URLs
- Verify no requests to Cloud Storage

## Implementation Details

**Files changed:**

- `backend/src/routes/mock.ts` - Mock API endpoints
- `frontend/src/utils/mock.ts` - Mock mode utilities
- `frontend/src/api/videos.api.ts` - API client with mock support
- `frontend/src/main.tsx` - Mock indicator

**How it works:**

- `MOCK_MODE` constant checks `VITE_MOCK_MODE` env var
- `getApiEndpoint()` replaces `/api/videos` with `/api/mock`
- Backend returns static test data instantly
- Frontend simulates upload progress artificially

---

💡 **Tip**: Keep mock mode ON during UI development, turn OFF when testing AI quality!

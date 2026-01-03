# Conversly

**AI-Powered Video Learning Platform with Struggle Detection**

Conversly is an interactive video learning platform that uses AI to detect when students are struggling and provides context-aware tutoring through voice or text conversations. The system tracks student interactions (rewinds, pauses, checkpoint attempts) and proactively offers help when students need it most.

## 🎯 Features

- **Real-Time Struggle Detection**: Automatically detects when students rewind videos multiple times and offers help
- **Context-Aware AI Tutor**: Voice and text chat that knows exactly what the student is watching, their interaction history, and checkpoint performance
- **Interactive Checkpoints**: Multiple-choice questions embedded at key moments in videos
- **Full Interaction Awareness**: Tracks seeks, pauses, plays, and checkpoint results to understand student behavior
- **Dual-Mode Conversation**: Switch seamlessly between voice and text chat
- **Typing Animation**: ChatGPT-style character-by-character streaming for natural text responses
- **Concept Mapping**: AI analyzes videos to identify key concepts and timestamps
- **Timeline Navigation**: Visual timeline with concepts and checkpoints for easy navigation

## 🛠️ Tech Stack

**Frontend:**
- React + TypeScript
- Vite
- ElevenLabs React SDK (voice conversations)
- Firebase Hosting
- TailwindCSS + shadcn/ui

**Backend:**
- Node.js + Express + TypeScript
- Google Cloud Run
- Firebase Firestore (database)
- Firebase Storage (video storage)
- Google Gemini AI (video analysis)
- OpenAI API (concept extraction)

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase account with Blaze plan (for Cloud Functions/Storage)
- ElevenLabs API key (for voice conversations)
- OpenAI API key (for concept extraction)
- Google Cloud account (for Gemini API and Cloud Run deployment)

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/jomspangilinan/Conversly.git
cd Conversly
```

### 2. Backend Setup

```bash
cd backend
npm install
```

**Configure Environment Variables:**

```bash
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# API Keys
OPENAI_API_KEY=sk-proj-xxxxx
ELEVENLABS_API_KEY=sk_xxxxx
GEMINI_API_KEY=xxxxx

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
FIRESTORE_EMULATOR_HOST=localhost:8080  # Optional: for local development

# Server Configuration
PORT=3001
NODE_ENV=development
```

**Setup Firebase Service Account:**

1. Go to [Firebase Console](https://console.firebase.google.com/) → Project Settings → Service Accounts
2. Click "Generate New Private Key" and download the JSON file
3. Copy it to `backend/service-account.json`:

```bash
cp service-account.example.json service-account.json
# Replace with your downloaded service account JSON
```

**Start Backend Development Server:**

```bash
npm run dev
```

Backend will run on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

**Configure Environment Variables:**

```bash
cp .env.example .env
```

Edit `frontend/.env` with your credentials:

```env
# Backend API
VITE_API_URL=http://localhost:3001

# ElevenLabs Agent ID
VITE_ELEVENLABS_AGENT_ID=your-agent-id

# Firebase Config (from Firebase Console → Project Settings → General)
VITE_FIREBASE_API_KEY=xxxxx
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxx
VITE_FIREBASE_APP_ID=xxxxx
```

**Start Frontend Development Server:**

```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

### 4. ElevenLabs Agent Setup

1. Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Create a new agent with the system prompt from `docs/VOICE_TUTOR_AGENT_SYSTEM_PROMPT.md`
3. Configure client tools using JSON files in `elevenlabs-cli/tool_configs/`:
   - `getContext.json` - Gets video context and student state
   - `seekToTime.json` - Seeks video to specific timestamp
   - `pauseVideo-1.json` - Pauses video playback
   - `resumeVideo-1.json` - Resumes video playback
   - `replaySection.json` - Replays current section
   - `answerCheckpoint.json` - Submits checkpoint answers
   - `seekToCheckpoint.json` - Jumps to specific checkpoint
   - `getContextBriefing.json` - Gets briefing for new connections
4. Copy the Agent ID to `VITE_ELEVENLABS_AGENT_ID` in frontend/.env

## 🎮 Running Locally

1. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open Browser**: Navigate to `http://localhost:5173`

## 📦 Deployment

### Frontend (Firebase Hosting)

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend (Google Cloud Run)

```bash
cd backend
gcloud run deploy conversly-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=xxxxx,ELEVENLABS_API_KEY=xxxxx,GEMINI_API_KEY=xxxxx
```

Update `frontend/.env` with production backend URL:
```env
VITE_API_URL=https://conversly-backend-xxxxx.run.app
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌────────────────────┐      ┌─────────────────────────┐   │
│  │  Student View      │      │   Voice Tutor Widget    │   │
│  │  - Video Player    │◄────►│   - ElevenLabs SDK      │   │
│  │  - Checkpoints     │      │   - Context Aware       │   │
│  │  - Struggle Detect │      │   - Typing Animation    │   │
│  └────────────────────┘      └─────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────────┐
│                         Backend                              │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Video Upload  │  │  Gemini AI      │  │  OpenAI      │ │
│  │  Processing    ├─►│  Analysis       ├─►│  Concepts    │ │
│  └────────────────┘  └─────────────────┘  └──────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                      Firebase                                │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Firestore DB  │  │  Storage        │  │  Hosting     │ │
│  │  - Videos      │  │  - Video Files  │  │  - Frontend  │ │
│  │  - Concepts    │  │  - Transcripts  │  │  - Static    │ │
│  └────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**Struggle Detection System:**
- Monitors rewind count on video sections
- Shows persistent tooltip when threshold exceeded
- Sends detailed context to AI tutor with concept info

**Interaction Tracking:**
- Records all video interactions (seek, pause, play, checkpoint_complete)
- 3-minute rolling window for recent behavior
- Tracks checkpoint performance (correct/incorrect with answers)

**Context Building:**
- Current timestamp + transcript snippet
- Nearby concepts (within 30s)
- Recent checkpoints
- Interaction summary with counts
- Last checkpoint result
- Struggle state

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ElevenLabs](https://elevenlabs.io/) - Voice AI conversational platform
- [Google Gemini](https://deepmind.google/technologies/gemini/) - Video analysis AI
- [OpenAI](https://openai.com/) - Concept extraction and embeddings
- [Firebase](https://firebase.google.com/) - Backend infrastructure

---

Built with ❤️ for better learning experiences - AI-Powered Video Learning Platform

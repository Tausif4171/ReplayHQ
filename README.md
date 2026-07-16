<div align="center">

# ReplayHQ

**AI-powered internal knowledge replay platform for teams**

Turn scattered Zoom recordings into a searchable, organized knowledge base your team actually uses.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## The Problem

Most teams track internal learning sessions in a Google Doc — a list of Zoom links, dates, and presenters. Nobody watches them. Knowledge gets lost. New hires start from zero.

## The Solution

**ReplayHQ** transforms chaotic recording archives into an organized, searchable platform — like an internal YouTube built for engineering teams. AI-generated transcripts, smart search, and curated playlists make it effortless to find and learn from past sessions.

---

## Preview

> **Note:** The app currently runs with mock data. No backend services needed to explore the UI.

| Dashboard | Recordings | Video Player |
|:---------:|:----------:|:------------:|
| Stats, continue watching, recent uploads | Grid/list view with filters | Custom player with transcript & AI summary |

| Search | Upload | Analytics |
|:------:|:------:|:---------:|
| Full-text + transcript search | 3-step wizard with drag & drop | Team engagement metrics |

---

## Features

### Core
- **Recording Library** — Browse, filter, and search all team recordings in grid or list view
- **Video Player** — Custom-built player with playback speed, PiP, and fullscreen
- **AI Transcripts** — Timestamped, searchable transcripts synced to video
- **AI Summaries** — Auto-generated key takeaways, action items, and topic tags
- **Smart Search** — Search across titles, descriptions, and transcript content

### Organization
- **Series & Tags** — Group recordings by series (e.g., "Kubernetes Deep Dives") and tag by topic
- **Playlists** — Curate learning paths for onboarding, deep dives, or team training
- **Continue Watching** — Pick up where you left off

### Team
- **Analytics Dashboard** — Track watch time, engagement, and popular content
- **Comments** — Timestamped discussions on recordings
- **Upload Wizard** — Drag-and-drop upload with metadata and AI processing options

### Coming Soon
- Google SSO authentication
- MinIO-powered video storage
- BullMQ background processing pipeline
- Slack notifications for new uploads
- Vector search with pgvector embeddings

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5.7](https://typescriptlang.org/) |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Animations** | [Framer Motion](https://motion.dev/) |
| **State** | [Zustand](https://zustand.docs.pmnd.rs/) + [React Query](https://tanstack.com/query) |
| **Database** | [PostgreSQL](https://postgresql.org/) + [Prisma ORM](https://prisma.io/) |
| **Storage** | [MinIO](https://min.io/) (S3-compatible) |
| **Queue** | [BullMQ](https://bullmq.io/) + [Redis](https://redis.io/) |
| **Auth** | [NextAuth.js v5](https://authjs.dev/) (Google OAuth) |
| **AI** | OpenAI (transcription + summarization) |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **pnpm**
- **Docker** (optional — for database, Redis, MinIO)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/<your-username>/replayhq.git
cd replayhq

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app runs with mock data out of the box.

### Full Setup (with backend services)

```bash
# Copy environment variables
cp .env.example .env

# Start PostgreSQL, Redis, and MinIO
docker compose up -d

# Generate Prisma client and push schema
npm run db:generate
npm run db:push

# Start the dev server
npm run dev
```

### Local AI Stack (transcription)

Transcription runs entirely on your machine via [whisper.cpp](https://github.com/ggerganov/whisper.cpp) — no API keys, no cost, GPU-accelerated on Apple Silicon.

```bash
# Install runtime dependencies
brew install ffmpeg whisper-cpp

# Download a whisper model (large-v3 recommended for multilingual content)
mkdir -p ~/whisper-models
curl -L -o ~/whisper-models/ggml-large-v3.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin

# Point the worker at the model in .env
echo 'WHISPER_MODEL_PATH="'$HOME'/whisper-models/ggml-large-v3.bin"' >> .env

# In a second terminal, start the transcribe worker
npm run worker:transcribe
```

| Model | Size | Speed (M-series) | Best for |
|-------|------|------------------|----------|
| `ggml-base.en.bin` | 141 MB | ~35× realtime | English-only, fastest |
| `ggml-small.bin` | 465 MB | ~10× realtime | Multilingual, balanced |
| `ggml-large-v3.bin` | 2.9 GB | ~4× realtime | **Recommended** — best quality, including Hindi/non-English |

By default the worker auto-detects the source language and translates to English (matching Otter / YouTube auto-captions). Pass `translateToEnglish: false` to the `WhisperCppTranscriber` constructor for source-language transcripts.

---

## Project Structure

```
replayhq/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/         # Login page
│   │   ├── (dashboard)/
│   │   │   ├── analytics/     # Team analytics
│   │   │   ├── playlists/     # Curated playlists
│   │   │   ├── recordings/    # Browse + video player
│   │   │   ├── search/        # Smart search
│   │   │   ├── settings/      # User preferences
│   │   │   ├── upload/        # Upload wizard
│   │   │   ├── layout.tsx     # Dashboard shell
│   │   │   └── page.tsx       # Home / dashboard
│   │   ├── globals.css        # Theme + design tokens
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── layout/            # Sidebar, header
│   │   ├── recordings/        # Recording card variants
│   │   └── ui/                # shadcn/ui primitives
│   └── lib/
│       ├── mock-data.ts       # Sample data for development
│       └── utils.ts           # Utility functions
├── docker-compose.yml         # Dev infrastructure
├── tailwind.config.ts
└── package.json
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |

---

## Roadmap

- [x] **v1** — UI/UX foundation with all pages and mock data
- [x] **v2** — Auth, MinIO upload, AI transcription pipeline
- [ ] **v3** — Vector search, Slack integration, team analytics

---

## Contributing

This is currently an internal project. If you're interested in contributing, open an issue to start a discussion.

---

## License

MIT

---

<div align="center">

Built with care for teams who believe knowledge should be shared, not lost.

</div>

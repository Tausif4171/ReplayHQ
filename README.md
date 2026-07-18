<div align="center">

# ReplayHQ

**AI-powered internal video knowledge base for teams**

ReplayHQ turns team recordings into a searchable, organized knowledge hub with secure access, upload workflows, AI transcripts, AI summaries, and admin-controlled team access.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://prisma.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5-red)](https://bullmq.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## Why ReplayHQ

Teams often collect Zoom recordings, demos, onboarding sessions, and internal learning videos in scattered folders or documents. The recordings exist, but the knowledge inside them is hard to search, hard to revisit, and easy to lose.

ReplayHQ is an internal YouTube-style platform for team knowledge. It gives approved team members a central place to upload recordings, watch them back, search transcripts, read AI-generated summaries, and manage access safely.

---

## Product Preview

<p align="center">
  <img src="public/screenshots/dashboard.png" alt="ReplayHQ home dashboard with stats, continue watching, and recording cards" width="100%">
</p>

<p align="center">
  <strong>Team knowledge command center</strong><br>
  A dashboard for finding recordings, resuming learning, tracking activity, and moving from raw video to searchable team knowledge.
</p>

The screenshots below follow the core product journey: discover team knowledge, publish recordings, extract insight, and manage access safely.

| Browse The Library | Publish Recordings |
|---|---|
| <img src="public/screenshots/recording.png" alt="ReplayHQ recordings library in list view with filters, tags, and metadata"> | <img src="public/screenshots/upload.png" alt="ReplayHQ upload wizard for publishing a recording"> |
| Filter and scan the team recording library with tags, series, views, and metadata. | Guided upload workflow with metadata, thumbnail review, and publishing state. |

| Search The Transcript | Review The Summary |
|---|---|
| <img src="public/screenshots/recording-transcript.png" alt="ReplayHQ transcript view with searchable timestamped segments"> | <img src="public/screenshots/recording-summary.png" alt="ReplayHQ AI summary tab with TLDR, takeaways, and tags"> |
| Searchable timestamped transcript segments for jumping directly to important moments. | TLDR, key takeaways, suggested tags, and topic structure generated from the transcript. |

<p align="center">
  <img src="public/screenshots/team-access.png" alt="ReplayHQ admin team access page for invites, access requests, roles, and member lifecycle management" width="100%">
</p>

<p align="center">
  <strong>Admin-ready access control</strong><br>
  Invite members, approve requests, assign roles, resend setup links, suspend access, and keep team permissions auditable.
</p>

---


## Features

### Access And Identity

- **Google sign-in with approval gating** - only pre-approved users can sign in with Google.
- **Email/password login** - approved users can set or reset a ReplayHQ password.
- **Access requests** - new users can request access from the login screen.
- **RBAC roles** - `ADMIN`, `UPLOADER`, and `VIEWER` roles are modeled in Prisma and carried into the session.
- **Admin team access** - admins can review access requests, assign roles, trigger password setup emails, and manage members.

### Recording Workflow

- **Direct uploads** - browser uploads video files through presigned S3-compatible URLs.
- **Recording library** - browse and filter recordings with presenter, series, tags, views, and comments metadata.
- **Custom recording page** - video playback, speed controls, picture-in-picture, transcript search, comments, save, and copy link actions.
- **Admin delete** - destructive recording deletion is restricted to admins and cleans up storage objects when possible.

### AI Pipeline

- **BullMQ background processing** - upload and Zoom import jobs enqueue downstream processing through Redis.
- **Local transcription** - `whisper.cpp` extracts timestamped transcript segments from uploaded videos.
- **Local summarization** - Ollama generates summary, TLDR, key takeaways, and suggested tags.
- **Live processing state** - recording pages poll for transcript and summary completion without requiring a manual refresh.
- **Recovery worker** - the transcribe worker can recover `READY` recordings that are missing transcripts.

### Organization And Discovery

- **Series and tags** - recordings can be grouped into series and connected to topic tags.
- **Transcript-aware detail view** - timestamped transcript entries can jump the video to the matching moment.
- **Comments and watch history** - schema and APIs support engagement metadata.
- **Search, playlists, and analytics surfaces** - UI/product surfaces exist and are ready for deeper backend wiring.

### Integrations

- **Zoom OAuth integration** - users can connect Zoom, list cloud recordings, and import MP4 recordings.
- **Zoom import worker** - downloads Zoom recordings, stores them in S3-compatible storage, and chains into transcription.
- **Resend email delivery** - password setup/reset and access request notifications use Resend when configured.

---

## Architecture

```text
Browser upload
  -> presigned S3-compatible upload URL
  -> Recording row in PostgreSQL
  -> BullMQ transcribe job in Redis
  -> transcribe worker downloads video from storage
  -> ffmpeg extracts audio
  -> whisper.cpp writes transcript + timestamped segments
  -> BullMQ summarize job
  -> Ollama writes TLDR + summary + takeaways + tags
  -> recording page updates transcript/summary sections
```

### Runtime Pieces

| Area | Implementation |
|------|----------------|
| App | Next.js 15 App Router, React 19, TypeScript |
| Auth | Auth.js / NextAuth v5, Google OAuth, Prisma adapter, custom password sessions |
| Database | PostgreSQL, Prisma ORM, pgvector-ready schema |
| Storage | S3-compatible object storage through AWS SDK; local MinIO for development |
| Queues | BullMQ with Redis |
| Transcription | Local `whisper.cpp` worker with ffmpeg audio extraction |
| Summaries | Ollama worker, default model `qwen2.5:7b` |
| Email | Resend API for setup/reset/access request emails |
| UI | Tailwind CSS, Radix primitives, shadcn-style components, lucide-react icons |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Docker Desktop
- Homebrew on macOS for local AI dependencies
- Google OAuth credentials for full sign-in testing

### 1. Install Dependencies

```bash
git clone https://github.com/<your-username>/replayhq.git
cd replayhq
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Update at least these local values:

```env
DATABASE_URL="postgresql://replayhq:replayhq_dev@localhost:5433/replayhq"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-random-secret"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
REDIS_URL="redis://localhost:6379"
```

Email delivery is optional locally. If `RESEND_API_KEY` and `EMAIL_FROM` are not set, password setup/reset links are logged in development instead of being emailed.

### 3. Start Local Infrastructure

```bash
docker compose up -d
```

This starts:

- PostgreSQL with pgvector on `localhost:5433`
- Redis on `localhost:6379`
- MinIO API on `localhost:9000`
- MinIO console on `localhost:9001`

### 4. Apply Database Schema

```bash
npx prisma migrate deploy
```

For local seed/demo data:

```bash
npx prisma db seed
```

### 5. Start The App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Local AI Workers

Transcription and summaries run outside the Next.js server. Keep each worker running in its own terminal while testing uploads.

### Transcription Setup

```bash
brew install ffmpeg whisper-cpp
mkdir -p ~/whisper-models
curl -L -o ~/whisper-models/ggml-large-v3.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin
```

Set the model path in `.env`:

```env
WHISPER_MODEL_PATH="/Users/<you>/whisper-models/ggml-large-v3.bin"
```

Run the transcribe worker:

```bash
npm run worker:transcribe
```

### Summary Setup

Install and run Ollama, then pull the default model:

```bash
ollama pull qwen2.5:7b
```

Run the summarize worker:

```bash
npm run worker:summarize
```

Optional environment overrides:

```env
OLLAMA_BASE_URL="http://localhost:11434"
SUMMARIZE_MODEL="qwen2.5:7b"
```

### Worker Model Trade-offs

| Model | Size | Typical Use |
|-------|------|-------------|
| `ggml-base.en.bin` | 141 MB | Fast English-only transcription |
| `ggml-small.bin` | 465 MB | Balanced multilingual transcription |
| `ggml-large-v3.bin` | 2.9 GB | Best quality; recommended for demos |

---

## Production Notes

ReplayHQ can run on Vercel for the web app, with managed PostgreSQL, managed Redis, and S3-compatible storage. Long-running workers should run outside the web server because transcription and summarization are background jobs.

Production workers need the same database, Redis, storage, and AI environment variables as the web app. Run them as separate long-lived processes:

```bash
npm run worker:transcribe
```

```bash
npm run worker:summarize
```

Never commit production env files or secrets.

---

## Project Structure

```text
replayhq/
+-- prisma/
|   +-- migrations/          # Production-safe Prisma migrations
|   +-- schema.prisma        # Data model, roles, recordings, transcripts, access requests
|   +-- seed.ts              # Demo data
+-- src/
|   +-- app/
|   |   +-- (auth)/          # Login and password reset pages
|   |   +-- (dashboard)/     # Home, recordings, upload, search, playlists, analytics, settings
|   |   +-- api/             # Auth, uploads, recordings, admin, password, Zoom APIs
|   +-- components/
|   |   +-- layout/          # Dashboard shell
|   |   +-- recordings/      # Recording cards
|   |   +-- ui/              # Reusable UI primitives
|   +-- lib/                 # Auth, Prisma, queue, storage, AI, email, Zoom helpers
|   +-- types/               # NextAuth session types
|   +-- workers/             # BullMQ transcribe, summarize, and Zoom import workers
+-- docker-compose.yml       # Local Postgres, Redis, MinIO
+-- package.json
+-- README.md
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Generate Prisma client and build the production app |
| `npm run start` | Start the built Next.js app |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema directly to the database |
| `npm run db:migrate` | Create/apply a local Prisma migration |
| `npm run db:studio` | Open Prisma Studio |
| `npm run worker:transcribe` | Run the BullMQ transcription worker |
| `npm run worker:summarize` | Run the BullMQ summarization worker |
| `npm run worker:zoom` | Run the Zoom import worker |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App origin used by Auth.js and reset links |
| `NEXTAUTH_SECRET` | Auth/session signing secret |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `REDIS_URL` | BullMQ Redis connection |
| `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL` | S3-compatible storage endpoint |
| `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` | S3-compatible storage credentials and bucket |
| `WHISPER_MODEL_PATH` | Local whisper.cpp model path |
| `OLLAMA_BASE_URL`, `SUMMARIZE_MODEL` | Optional summarizer overrides |
| `RESEND_API_KEY`, `EMAIL_FROM`, `ACCESS_REQUEST_EMAIL` | Optional email delivery settings |
| `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` | Optional Zoom import integration |

---

## Roadmap

### Completed

- Auth.js Google OAuth with approved-user gating
- Email/password setup and reset flow
- RBAC roles and admin access management
- Direct uploads to S3-compatible storage
- BullMQ transcription and summarization pipeline
- Local `whisper.cpp` transcription
- Ollama AI summaries, TLDRs, takeaways, and tags
- Admin-only recording deletion
- Zoom OAuth and cloud recording import pipeline

### Next

- Production-hosted workers and queue observability
- Vector search over transcripts using pgvector embeddings
- Richer analytics backed by watch history
- Slack notifications for new uploads and completed AI processing
- More complete playlist and search backend behavior

---

## License

MIT

---

<div align="center">

Built for teams who believe recorded knowledge should be searchable, reusable, and alive.

</div>

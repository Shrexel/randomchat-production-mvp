# RandomChat — Production-style Omegle-like MVP

A 1-to-1 random text + video chat MVP using:

- Next.js + TypeScript + Tailwind
- Node.js + Express + Socket.IO
- WebRTC for audio/video
- PostgreSQL + Prisma for reports/blocks
- Optional Redis for rate limiting / future horizontal scaling
- Docker Compose for local PostgreSQL + Redis

## Important

This is a strong MVP foundation, not a finished public anonymous-chat service. Before public launch, add professional moderation, age-safety controls, abuse detection, TURN infrastructure, monitoring, legal/privacy review, and load testing.

## Requirements

- Node.js 20+
- npm
- Docker Desktop (recommended)

## Setup

### 1. Install

```bash
npm install
cd apps/web && npm install
cd ../server && npm install
cd ../..
```

### 2. Start PostgreSQL + Redis

```bash
docker compose up -d
```

### 3. Configure server

```bash
cp apps/server/.env.example apps/server/.env
```

Set a strong `JWT_SECRET` even though guest sessions are used.

### 4. Configure web

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

### 5. Create database tables

```bash
cd apps/server
npx prisma migrate dev --name init
cd ../..
```

### 6. Run both apps

Terminal 1:

```bash
npm run dev:server
```

Terminal 2:

```bash
npm run dev:web
```

Open http://localhost:3000 in two browser tabs/devices.

## WebRTC

For local development, a public STUN server is usually enough. Production should use a TURN server because some users cannot establish direct peer-to-peer connections.

Set:

```env
NEXT_PUBLIC_STUN_URL=stun:stun.l.google.com:19302
NEXT_PUBLIC_TURN_URL=
NEXT_PUBLIC_TURN_USERNAME=
NEXT_PUBLIC_TURN_CREDENTIAL=
```

Do not expose a long-lived TURN credential in a client bundle. For production, issue short-lived TURN credentials from your backend.

## Architecture

Browser A <-> Socket.IO signaling <-> Server <-> Socket.IO signaling <-> Browser B

After signaling, media normally flows peer-to-peer through WebRTC, or through TURN when direct connectivity is unavailable.

## Safety

The application includes report/block primitives, but public launch requires substantially stronger safety controls, including age-safety, automated moderation, rate limits, anti-bot controls, abuse review, audit logs, privacy controls, and incident response.
# Learnify – AI Powered Learning Platform

Create a course from any topic with AI, then get **chapter notes, flashcards, a quiz and Q&A** generated for it.

**Stack:** Next.js 15 (App Router) · Clerk (auth) · Neon Postgres + Drizzle ORM · Google Gemini · Tailwind 4 · (optional) Inngest

## Setup (5 steps)

1. `npm install`
2. Open `.env.local` and fill the values (see `.env.example` for where to get each one):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` → https://dashboard.clerk.com
   - `DATABASE_URL` → https://console.neon.tech (Connection string)
   - `GEMINI_API_KEY` → https://aistudio.google.com/apikey
3. `npm run db:push`  (creates the tables in Neon)
4. `npm run dev`
5. Open http://localhost:3000 → Sign up → Create New → generate a course

## How it works

1. **Create** → `/api/generate-course-outline` asks Gemini for a course outline, saves it, and starts notes generation in the background.
2. Dashboard card shows *Generating…* and updates automatically (polling) until *Ready*.
3. Course page → **Notes / Flashcard / Quiz / Q&A** cards. Click *Generate*, wait a few seconds, click *View*.
4. Free plan = 5 courses (`NEXT_PUBLIC_FREE_COURSE_LIMIT`). The Upgrade page is a **demo** (no payment gateway) – it just marks the user as a member.

## Background jobs & Inngest

By default (`USE_INNGEST=false`) generation runs inside the Next.js server right after the response – nothing else to start.
To use Inngest instead: set `USE_INNGEST=true`, `INNGEST_DEV=1`, run `npm run inngest` in a second terminal.

## AI models

Models are env based (`GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`). If the main model is rate-limited or retired, the app retries and falls back automatically.
Note: Google shuts down `gemini-2.5-*` on 16 Oct 2026, so the defaults are `gemini-3.5-flash` / `gemini-3.1-flash-lite`.

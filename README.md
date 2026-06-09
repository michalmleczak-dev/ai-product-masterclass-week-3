# Mood Journal — Phase 1

A minimal mood journal: pick a mood label, write a short reflection, see it visualized, browse past entries. Data is stored in `localStorage` (no backend).

Spec: see `../PRD.md`.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + shadcn-style components (Button, Card, Badge)
- **TipTap** rich text editor (bold, italic, lists)
- **localStorage** persistence under key `mood_journal_entries`

## Prerequisites

- **Node.js 18.18+** (or 20+) and **pnpm**.
  - Install Node from https://nodejs.org (LTS).
  - Enable pnpm via Corepack (ships with Node): `corepack enable && corepack prepare pnpm@latest --activate`.
  - Or install directly: `npm install -g pnpm`.

## Local development

```bash
cd "week-1/app"
pnpm install
pnpm dev
```

Open http://localhost:3000 — the root is Screen 1 (Today's Entry).

Build sanity check:

```bash
pnpm build
pnpm start
```

## Manual test plan

1. `/` — pick **Cheerful**, type a short reflection with **bold** and a list → Save.
2. `/result` — yellow full-bleed background, happy blob, recommendation copy for *Positive*, italic preview of first 100 chars.
3. Click **View all entries** → `/entries` shows one card.
4. Hard refresh — entry persists.
5. Go back to `/` — the form is pre-filled, button says **Update entry**. Change mood to **Anxious** → coral background, sad blob. List still has one entry (same date, updated).
6. `localStorage.clear()` in DevTools → `/entries` shows the empty state.

## Deploying to Vercel

1. Push the parent repository to GitHub.
2. In Vercel: **Import Project** → pick the repo.
3. Set **Root Directory** to `week-1/app`.
4. Build & Output Settings: leave defaults (Vercel auto-detects Next.js).
5. Deploy.

No environment variables are required in Phase 1.

## Project layout

```
src/
├── app/
│   ├── layout.tsx              max-w-[390px] wrapper + Inter font
│   ├── globals.css             Tailwind + TipTap styles
│   ├── page.tsx                Screen 1 — mood picker + TipTap
│   ├── result/page.tsx         Screen 2 — full-bleed visualization
│   └── entries/page.tsx        Screen 3 — list / empty state
├── components/
│   ├── ui/{button,card,badge}.tsx   shadcn-style primitives
│   ├── MoodPicker.tsx
│   ├── MoodPill.tsx
│   ├── TipTapEditor.tsx
│   ├── MoodBlob.tsx            4 inline SVG faces
│   └── EntryCard.tsx
├── hooks/
│   └── useJournal.ts           single source of truth for entries
└── lib/
    ├── moods.ts                taxonomy + colors + recommendation copy
    ├── date.ts                 todayISO + pretty formatters
    ├── html.ts                 stripHtml + truncate
    ├── storage.ts              localStorage read/write + Entry type
    └── utils.ts                cn()
```

## Out of scope (Phase 2)

- Supabase auth + DB
- Claude API summaries / personalised recommendations
- Mood trend charts
- Entry detail view (`/entries/[id]`)

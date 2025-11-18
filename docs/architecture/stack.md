# Architecture & Tech Stack

## Overview

- **Client:** React + TypeScript + Vite for fast DX, Tailwind + shadcn UI.
- **Backend:** Firebase Authentication, Firestore, Cloud Functions (TypeScript) with optional Cloud Run adapters for heavy jobs.
- **Shared Libraries:** `packages/core` (types, validation, utilities) and `packages/design-tokens` (theme primitives) consumed by both web and future mobile shells.
- **Tooling:** PNPM workspaces, ESLint + Prettier, Vitest, Playwright, Storybook, Firebase Emulator Suite.

## Monorepo Layout

```
/
├─ apps/
│  └─ web/              # React + Vite client
├─ packages/
│  ├─ core/             # Schemas, DTOs, helper hooks
│  └─ design-tokens/    # Tailwind preset + tokens JSON
├─ functions/           # Firebase Cloud Functions (TS)
├─ infra/
│  └─ firebase/         # Config, indexes, emulator seed scripts
└─ docs/
```

## Client Stack Details (`apps/web`)

- React Router for routing, TanStack Query for data/cache, Zustand for ephemeral UI state.
- Tailwind CSS with shadcn component primitives for rapid iteration.
- Mapbox GL JS for map surfaces, FullCalendar or similar for scheduling UI.
- Service Worker via Vite plugin `vite-plugin-pwa` for caching and background sync.

## Backend Stack Details (`functions/`)

- Cloud Functions written in TypeScript, bundled with `firebase-tools`.
- Use callable HTTPS functions for admin actions (report exports, calendar sync) and scheduled functions via Cloud Scheduler.
- Firestore personal-first structure: `/users/{uid}/{collection}/{docId}` with optional sharing links.
- Firebase Storage for attachments/screenshots.

## Shared Packages

### `packages/core`

- Zod schemas for Firestore documents, converters, and validation shared across client/functions.
- Utility helpers (date math, goal calculations, map clustering prep).
- Business logic (goal rollups, reminder scheduling) to be reused by future React Native/Capacitor shells.

### `packages/design-tokens`

- Central JSON/YAML tokens (color, typography, spacing).
- Tailwind preset export + CSS vars file for non-Tailwind consumers.
- Storybook stories ensure tokens render correctly.

## Infrastructure & Preview

- Keep Firebase project configs under `infra/firebase/{env}.json`.
- Provide scripts:
  - `pnpm dev` – runs Vite client + Firebase emulators with seed data.
  - `pnpm preview:full` – builds client and serves via Static hosting emulator + emulated Functions for stakeholder demos.
- CI (GitHub Actions):
  - Lint/test on every push.
  - Deploy preview channels (`firebase hosting:channel:deploy`) for each PR.
  - Comment preview URLs + seeded credentials on PR for instant review.

## Next Steps

1. Initialize PNPM workspace (`package.json` + `pnpm-workspace.yaml`).
2. Scaffold `apps/web`, `packages/core`, `packages/design-tokens`, and `functions`.
3. Set up Firebase project(s) and emulator configs under `infra/firebase`.


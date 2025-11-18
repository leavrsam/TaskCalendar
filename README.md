# TaskCalendar

TaskCalendar is an Areabook-inspired workspace focused on rapid preview loops, Firebase-first infrastructure, and a component system that can later be wrapped for native apps.

## Getting Started

```bash
pnpm install

# Run the Vite dev server
pnpm dev

# Run Storybook (component previews)
pnpm storybook

# Generate Firebase preview seed + start emulators
pnpm preview:full
```

The `preview:full` script regenerates the demo dataset (`infra/firebase/seed-data.json`) and boots the Firebase Emulator Suite (Auth, Firestore, Hosting). Open http://localhost:4173 to inspect the preview build served by Hosting.

### Environment variables

Copy the following into `.env.local` inside `apps/web/` (or use your preferred secrets manager):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_FIREBASE_EMULATORS=true
```

When running locally the app automatically connects to the Firebase emulators declared in `infra/firebase/firebase.json`.

## Workspaces

- `apps/web` – React + Vite client with Tailwind, TanStack Query, and React Router.
- `packages/core` – Shared Zod schemas and helpers reused by web, functions, and future mobile shells.
- `packages/design-tokens` – Design tokens + Tailwind preset for consistent styling.
- `infra/firebase` – Emulator + hosting config, security rules, and preview seed scripts.

## Preview & Collaboration

- Every PR will run lint/tests, Storybook static build, and Vite preview builds (CI pipeline TBD).
- Stakeholders can review UI slices through Vite previews (`pnpm preview`) or Storybook (`pnpm storybook`).
- Seeded Firebase emulator ensures feedback cycles without touching production.

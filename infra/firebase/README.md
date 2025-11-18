# Firebase Preview Stack

This directory contains the config and seed data required to spin up the Firebase Emulator Suite so that preview builds can be tested without hitting production.

## Files

- `firebase.json` – Shared config for Hosting, Firestore, Auth, Functions, and emulators.
- `firestore.rules` / `storage.rules` – Minimal multi-tenant security rules to keep org data isolated.
- `seed.ts` – Generates `seed-data.json` using the shared `@taskcalendar/core` schemas; this document can be imported into the Firestore emulator to populate preview data.
- `seed-data.json` – Latest generated preview payload (safe to commit; contains only demo data).

## Commands

From the repo root:

```bash
# 1. Generate/update the preview seed
pnpm tsx infra/firebase/seed.ts

# 2. Start emulators with seeded data
pnpm firebase:emulators
```

The default script starts Firestore, Auth, Functions, and Hosting emulators with the UI enabled. Hosting serves the production Vite build on port `4173`, matching `pnpm --filter web preview`.

## Preview Workflow

1. Run `pnpm tsx infra/firebase/seed.ts` whenever schemas change.
2. Launch emulators via `pnpm firebase:emulators`. The Firebase UI will show seeded collections for quick inspection.
3. In a second terminal, run `pnpm dev` (or open the Netlify/Vercel preview URL created by CI).
4. Stakeholders can log in with emulator accounts defined in the Auth UI to experience realistic data without touching prod.

## Deployment Targets

`.firebaserc` declares three logical projects:

- `preview` – ephemeral Hosting channels per PR.
- `dev` – shared QA environment.
- `prod` – production application (not provisioned yet).

Use `firebase use <alias>` before running deploy commands, or let CI provide `FIREBASE_TOKEN` and the target alias.


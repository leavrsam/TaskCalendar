# Preview & Collaboration Workflow

## Goals

- Stakeholders can interact with a hosted preview within hours of a merge.
- Engineers and designers share component-level previews (Storybook) for micro feedback.
- Reproducible local preview includes seeded Firebase data for demos.

## Tooling Summary

| Tool | Purpose |
| --- | --- |
| GitHub Actions | Run lint/tests, publish preview Hosting channels, comment URLs |
| Firebase Emulator Suite | Local full-stack preview (`auth`, `firestore`, `functions`, `hosting`) |
| Vercel/Netlify (optional) | Fast static hosting previews tied to pull requests |
| Storybook | Component gallery + visual regression tests |
| Playwright | Smoke tests against previews to ensure core flows never regress |

## Branch & CI Flow

1. Developer opens feature branch and pushes PR.
2. GitHub Actions workflow runs:
   - `pnpm lint && pnpm test`
   - `pnpm test:functions` using Firebase emulator.
   - `pnpm storybook:build` for static stories.
   - `firebase hosting:channel:deploy <branch>` to create preview URL.
   - `storybook-to-gh-pages` (or Chromatic) publishes component preview & snapshots.
3. Workflow comments on PR with:
   - Hosting preview URL + seeded credentials.
   - Storybook URL.
   - Latest Playwright report.
4. Stakeholders review and leave notes in Linear/Jira referencing PR.

## Local Preview Commands

Add to repository scripts (package.json):

- `pnpm dev` – runs Vite dev server + Firebase emulators with watch-mode functions.
- `pnpm preview:full` – builds client, starts Hosting emulator, runs seed script for demo data, opens browser tab.
- `pnpm storybook` – live Storybook server for component work.
- `pnpm storybook:build && pnpm storybook:preview` – static build used in CI.

Seed workflow (located under `infra/firebase/seeds.ts`):

1. Reads `.env.local` for Firebase emulator ports.
2. Creates a sample workspace with the owner plus a couple of collaborators, along with seeded contacts, lessons, and tasks.
3. Updates README with demo credentials for quick QA.

## Feedback Loop

- Schedule weekly “Preview Review” call; use latest preview URL.
- Capture feedback in Linear/Jira with labels (`preview`, `blocking`, `nice-to-have`).
- If a preview is rejected, keep channel alive but gate merges until fixes validated.

## Artifacts to Maintain

- `docs/changelog.md` – summary of each preview, who reviewed, decisions made.
- `docs/product/feedback.md` – backlog of stakeholder requests tied to preview IDs.
- Screenshots or Loom walkthroughs attached to PR description for asynchronous reviewers.


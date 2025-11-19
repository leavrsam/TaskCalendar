# Feature Delivery Slices

Each slice should end with a deployable preview channel + Storybook snapshot so stakeholders can test within hours of merge.

## Slice 1 – Project Skeleton

- Initialize PNPM workspace, Firebase config, and CI pipeline.
- Scaffold `apps/web` with auth-less shell (layout, routing, design tokens).
- Storybook baseline with typography, buttons, cards.

## Slice 2 – Auth & Workspace Setup

- Implement Firebase Auth (email/password) screens for sign-in + account creation.
- Personal workspace bootstrap with placeholder sharing controls.
- Seed script + preview instructions for demo accounts.
- Security rules MVP with emulator tests.

## Slice 3 – Contacts & Sharing

- Contacts board grouped by stage with personal notes/history.
- Workspace sharing sidecar (email invites with role selection, revoke/accept flows, collaborator status).
- Firestore hooks via TanStack Query; optimistic updates + validation from `packages/core`.

## Slice 4 – Lessons & Notes

- Lesson log form, commitments checklist, reminder scheduling.
- Notes timeline per contact with rich text (TipTap or Markdown).
- Scheduled Cloud Function to email reminders (optional flag).

## Slice 5 – Tasks & Calendar

- Drag/drop agenda (Google Calendar-style week view) synced to Firestore `tasks`.
- Task board with filters (priority, assignment, due date).
- Optional Google Calendar connector behind feature flag.
- Slot creation modal (title/status/priority) and backlog drag/drop onto the calendar.

## Slice 6 – Goals & Dashboard

- Goal creation wizard (metric, target, timeframe).
- Dashboard widgets for KPIs, follow-up alerts, workspace summary.
- Cloud Functions to roll up weekly stats.

## Slice 7 – Maps & Reporting

- Map view with Mapbox clusters, filters, and detail drawer linking back to contacts/tasks.
- Reporting screen: weekly PDF/email export via Functions.
- Stakeholder preview walkthrough + backlog triage for mobile shell.

## Slice 8 – Offline & Mobile-Ready Enhancements

- Service Worker caching + background sync queue.
- Responsive polish for tablet/mobile; audit components for React Native reuse.
- Document bridging plan for Capacitor wrapper.


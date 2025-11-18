# Product Requirements

## Personas

- **Workspace Owner** – sets up their personal planner, invites collaborators, reviews progress.
- **Collaborator** – helps teach, coordinate visits, and update shared notes/tasks.
- **Stakeholder/Coach** – monitors multiple workspaces, reads summaries, and supplies feedback without editing every record.

## Problem & Goals

Modern planning for small teams is fragmented across spreadsheets, calendars, and chat apps. We need a single workspace that:

1. Mirrors classic Areabook flows (contacts, lessons, goals, mapping) but works for any individual.
2. Enables rapid collaboration/preview so stakeholders can review changes within hours.
3. Scales from solo workspaces to shared oversight while keeping costs minimal (Firebase free tier).

## MVP Feature List

1. **Accounts & Sharing**
   - Email/password signup via Firebase Auth with sign-in and create-account screens.
   - Personal by default; optionally share the workspace with collaborators (invite placeholders, pending states).
2. **Contacts & Lessons**
   - CRUD contacts with tags, teaching stage, geolocation.
   - Lesson records with notes, commitments, follow-up reminders, attachments (Drive links).
3. **Schedules & Tasks**
   - Calendar-style agenda with drag/drop tasks, recurring appointments, Google Calendar optional sync.
   - Task list filtered by priority, due date, status.
4. **Goals & Analytics**
   - Weekly/monthly goals per workspace (lessons, contacts, service hours).
   - Dashboard widgets summarizing progress and surfacing follow-ups.
5. **Maps View**
   - Mapbox-integrated map of contacts/tasks with filters (stage, priority) and clustering.
6. **Reporting & Export**
   - Generate shareable PDFs/links summarizing week activity, email export for leadership.

## Non-Goals (v2 backlog)

- Native mobile apps (will wrap web later with Capacitor/React Native).
- Push notifications & SMS reminders.
- Offline-first sync beyond cached recent data.
- Deep Google Workspace integrations beyond calendar import/export.

## Constraints & Compliance

- Store only essential PII; support data export/delete on request (GDPR/CPRA readiness).
- Multi-tenant Firestore structure to isolate org data; enforce rules via security rules & custom claims.
- Aim to keep within Firebase free tier: favor batched reads, limit large aggregations, and archive old data to cold storage if needed.

## Success Metrics

- Stakeholders receive functioning preview URLs within 4 hours of merge to main.
- First cohort (≤5 orgs) can onboard without manual database edits.
- 90% of weekly planning actions (contact updates, lesson logs, task scheduling) completed inside the app.


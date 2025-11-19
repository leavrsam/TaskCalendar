# Data Model & Auth Strategy

## Auth Flow

1. Firebase Auth (email/password by default, optional Google OAuth later).
2. On sign-up the client writes a profile document `users/{uid}` with display name, email, and preference flags.
3. Sharing is optional. For now, records include a `sharedWith: string[]` field so the UI can reflect collaborators; a dedicated invite flow will land after Slice 5.

## Firestore Layout (personal-first)

```
users/{uid}
  - email
  - displayName
  - preferences

users/{uid}/contacts/{contactId}
users/{uid}/lessons/{lessonId}
users/{uid}/tasks/{taskId}
users/{uid}/invites/{inviteId}
```

### Key Document Shapes (Zod schemas in `packages/core`)

- `UserProfile`: `{ email, displayName?, createdAt }`
- `WorkspaceInvite`: `{ ownerUid, email, role (viewer/editor), status (pending/accepted/declined/revoked), createdAt, respondedAt?, acceptedBy? }`
- Mission data (contacts, lessons, goals, tasks) live under the authenticated user’s namespace and include `sharedWith: string[]` for future collaborators. Goals support focus areas such as physical, intellectual, social, financial, spiritual, emotional, career, and personal.

## Security Rules Highlights

- `users/{uid}`: only the authenticated owner can read/write.
- `users/{uid}` subcollections: owner can read/write; collaborators listed in `sharedWith` can be granted read/write as slices mature.
- `users/{uid}/invites/{inviteId}`: owner can manage; invitee (matching email) can read and mark accepted (status/response timestamp).
- Shared subcollections (future slices) will reference both UIDs and enforce that either side of the link can read/write according to their role.

## Indexing & Performance

- Composite indexes for personal collections (e.g. `users/{uid}/contacts` by `stage + updatedAt`, `users/{uid}/tasks` by `status + dueAt`).
- For sharing, we rely on per-record `sharedWith` arrays today; future dedicated `shares/{shareId}` docs can be introduced if array queries become hotspots.

## Storage & Attachments

- Use per-user buckets/prefixes `users/{uid}/attachments/{contactId}/{fileId}`; sharing simply grants read permissions to linked collaborators.

## Data Retention

- Soft-delete flag (`deletedAt`) on contacts/lessons/tasks; a scheduled Function can purge old records when requested.
- Export endpoint packages the authenticated user’s data (plus any shared datasets) as JSON/CSV for compliance requests.


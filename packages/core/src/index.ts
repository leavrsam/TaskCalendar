import { z } from 'zod'

export const uid = z.string().min(6, 'uid must be at least 6 characters')
export const contactId = z.string().min(4)
export const taskId = z.string().min(4)
export const goalId = z.string().min(4)
export const lessonId = z.string().min(4)
export const noteId = z.string().min(4)
export const inviteId = z.string().min(6)

const timestampString = z.string()

export const contactStageSchema = z.enum([
  'new',
  'teaching',
  'progressing',
  'member',
  'dropped',
])

export type ContactStage = z.infer<typeof contactStageSchema>

export const CONTACT_STAGE_LABELS: Record<ContactStage, string> = {
  new: 'New',
  teaching: 'Teaching',
  progressing: 'Progressing',
  member: 'Member',
  dropped: 'Archived',
}

export const CONTACT_STAGE_ORDER: ContactStage[] = [
  'new',
  'teaching',
  'progressing',
  'member',
  'dropped',
]

export const contactSchema = z.object({
  id: contactId,
  ownerUid: uid,
  name: z.string().min(2),
  stage: contactStageSchema,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  lastContactedAt: z.string().nullable(),
  nextVisitAt: z.string().nullable(),
  sharedWith: z.array(uid).default([]),
  createdAt: timestampString,
  updatedAt: timestampString,
})

export type Contact = z.infer<typeof contactSchema>

export const lessonSchema = z.object({
  id: lessonId,
  ownerUid: uid,
  contactId,
  taughtAt: timestampString,
  type: z.enum(['restoration', 'plan', 'gospel', 'commandments', 'laws']),
  commitments: z.array(z.string()).default([]),
  notes: z.string().optional(),
  taughtBy: z.array(z.string()),
  followUpAt: z.string().nullable(),
  sharedWith: z.array(uid).default([]),
  createdAt: timestampString,
  updatedAt: timestampString,
})

export type Lesson = z.infer<typeof lessonSchema>

export const goalSchema = z.object({
  id: goalId,
  ownerUid: uid,
  metric: z.enum([
    'physical',
    'intellectual',
    'social',
    'financial',
    'spiritual',
    'emotional',
    'career',
    'personal',
  ]),
  title: z.string().min(2),
  target: z.number().nonnegative(),
  progress: z.number().nonnegative().default(0),
  unit: z.string().default('sessions'),
  periodStart: timestampString,
  periodEnd: timestampString,
  sharedWith: z.array(uid).default([]),
  createdAt: timestampString,
  updatedAt: timestampString,
})

export type Goal = z.infer<typeof goalSchema>

export const taskSchema = z.object({
  id: taskId,
  ownerUid: uid,
  contactId: contactId.optional(),
  title: z.string(),
  status: z.enum(['todo', 'inProgress', 'done']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueAt: z.string().nullable(),
  assignedTo: z.array(z.string()),
  notes: z.string().optional(),
  scheduledStart: z.string().nullable().optional(),
  scheduledEnd: z.string().nullable().optional(),
  sharedWith: z.array(uid).default([]),
  createdAt: timestampString,
  updatedAt: timestampString,
})

export type Task = z.infer<typeof taskSchema>

const inviteRoleSchema = z.enum(['viewer', 'editor'])
const inviteStatusSchema = z.enum(['pending', 'accepted', 'declined', 'revoked'])

export const inviteSchema = z.object({
  id: inviteId,
  ownerUid: uid,
  email: z.string().email(),
  role: inviteRoleSchema,
  status: inviteStatusSchema,
  createdAt: timestampString,
  respondedAt: timestampString.optional(),
  acceptedBy: uid.optional(),
})

export type WorkspaceInvite = z.infer<typeof inviteSchema>

export const contactNoteSchema = z.object({
  id: noteId,
  ownerUid: uid,
  contactId,
  content: z.string().min(2),
  sharedWith: z.array(uid).default([]),
  createdAt: timestampString,
  updatedAt: timestampString,
})

export type ContactNote = z.infer<typeof contactNoteSchema>

export const userProfileSchema = z.object({
  id: uid,
  email: z.string().email(),
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  createdAt: timestampString,
})

export type UserProfile = z.infer<typeof userProfileSchema>

export const previewSeed = z.object({
  owner: userProfileSchema,
  contacts: z.array(contactSchema),
  lessons: z.array(lessonSchema),
  contactNotes: z.array(contactNoteSchema),
  goals: z.array(goalSchema),
  tasks: z.array(taskSchema),
  invites: z.array(inviteSchema),
})

export type PreviewSeed = z.infer<typeof previewSeed>


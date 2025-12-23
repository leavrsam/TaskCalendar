import { z } from 'zod'

export const uid = z.string().min(6, 'uid must be at least 6 characters')
export const contactId = z.string().min(4)
export const taskId = z.string().min(4)
export const goalId = z.string().min(4)
export const visitId = z.string().min(4)
export const lessonId = visitId
export const noteId = z.string().min(4)
export const inviteId = z.string().min(6)

const timestampString = z.string()

export const contactStageSchema = z.enum([
  'new',
  'teaching',
  'progressing',
  'member',
  'family', // Moved before dropped
  'dropped',
])

export type ContactStage = z.infer<typeof contactStageSchema>

export const CONTACT_STAGE_LABELS: Record<ContactStage, string> = {
  new: 'New',
  teaching: 'Teaching',
  progressing: 'Progressing',
  member: 'Member',
  family: 'Family',
  dropped: 'Archived',
}

export const CONTACT_STAGE_ORDER: ContactStage[] = [
  'new',
  'teaching',
  'progressing',
  'member',
  'family',
  'dropped',
]

// Contact Goals schema (with sub-goals support)
export const contactSubGoalSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  isCompleted: z.boolean().default(false),
})

export type ContactSubGoal = z.infer<typeof contactSubGoalSchema>

export const contactGoalSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  isCompleted: z.boolean().default(false),
  progress: z.number().min(0).max(100).optional(),
  subGoals: z.array(contactSubGoalSchema).default([]),
  createdAt: timestampString,
  updatedAt: timestampString,
})

export type ContactGoal = z.infer<typeof contactGoalSchema>

export const contactSchema = z.object({
  id: contactId,
  ownerUid: uid,
  name: z.string().min(2),
  stage: contactStageSchema,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).nullable().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  birthday: z.string().optional(), // YYYY-MM-DD format
  goals: z.array(contactGoalSchema).default([]),
  lastContactedAt: z.string().nullable(),
  nextVisitAt: z.string().nullable(),
  sharedWith: z.array(uid).default([]),
  isFavorite: z.boolean().default(false),
  createdAt: timestampString,
  updatedAt: timestampString,
})

export type Contact = z.infer<typeof contactSchema>

export const visitSchema = z.object({
  id: visitId,
  ownerUid: uid,
  contactId,
  visitedAt: timestampString,
  type: z.enum(['social', 'spiritual', 'service', 'casual', 'deep']),
  commitments: z.array(z.string()).default([]),
  notes: z.string().optional(),
  visitedBy: z.array(z.string()),
  followUpAt: z.string().nullable(),
  sharedWith: z.array(uid).default([]),
  createdAt: timestampString,
  updatedAt: timestampString,
})

export type Visit = z.infer<typeof visitSchema>

export const VISIT_TYPE_LABELS: Record<Visit['type'], string> = {
  social: 'Social',
  spiritual: 'Spiritual',
  service: 'Service',
  casual: 'Casual',
  deep: 'Deep',
}

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
  contactId: contactId.optional(), // Legacy single contact (for backward compatibility)
  contactIds: z.array(contactId).default([]), // Multiple contacts
  title: z.string(),
  status: z.enum(['todo', 'inProgress', 'done']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueAt: z.string().nullable(),
  assignedTo: z.array(z.string()),
  notes: z.string().optional(),
  scheduledStart: z.string().nullable().optional(),
  scheduledEnd: z.string().nullable().optional(),
  isAllDay: z.boolean().default(false),
  isBackup: z.boolean().default(false),
  color: z.string().nullable().optional(),
  sharedWith: z.array(uid).default([]),
  // Location fields
  address: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).nullable().optional(),
  // Recurrence fields
  recurrence: z.object({
    frequency: z.enum(['none', 'daily', 'weekly', 'monthly', 'annually', 'weekday', 'custom']),
    interval: z.number().default(1),
    endDate: z.string().nullable().optional(),
    count: z.number().nullable().optional(),
    byDay: z.array(z.number()).optional(), // 0-6 (Sun-Sat)
    byMonthDay: z.number().nullable().optional(),
    byMonth: z.number().nullable().optional(),
  }).nullable().optional(),
  // Instance tracking fields
  recurringEventId: z.string().nullable().optional(),
  originalStart: z.string().nullable().optional(),
  isRecurringInstance: z.boolean().default(false),
  isModified: z.boolean().default(false),
  // Google Calendar sync fields
  googleEventId: z.string().optional(),
  calendarEmail: z.string().optional(),
  createdAt: timestampString,
  updatedAt: timestampString,
})

export type Task = z.infer<typeof taskSchema>
export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'annually' | 'weekday' | 'custom'

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

export const lessonSchema = visitSchema
export type Lesson = Visit

export const previewSeed = z.object({
  owner: userProfileSchema,
  contacts: z.array(contactSchema),
  visits: z.array(visitSchema),
  contactNotes: z.array(contactNoteSchema),
  goals: z.array(goalSchema),
  tasks: z.array(taskSchema),
  invites: z.array(inviteSchema),
})

export type PreviewSeed = z.infer<typeof previewSeed>


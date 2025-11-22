import type { Meta, StoryObj } from '@storybook/react'

import type { Task } from '@taskcalendar/core'

import { TaskCard } from './task-card'

const baseTask: Task = {
  id: 'task-123',
  ownerUid: 'demo-owner',
  title: 'Confirm lesson with Maria',
  status: 'todo',
  priority: 'high',
  dueAt: new Date().toISOString(),
  assignedTo: ['demo-owner'],
  notes: 'Coordinate with fellowship.',
  sharedWith: ['avery-demo'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  contactId: 'contact-maria',
  scheduledStart: null,
  scheduledEnd: null,
  isAllDay: false,
  isBackup: false,
}

const meta: Meta<typeof TaskCard> = {
  title: 'Tasks/TaskCard',
  component: TaskCard,
  args: {
    task: baseTask,
  },
}

export default meta
type Story = StoryObj<typeof TaskCard>

export const Default: Story = {}

export const Scheduled: Story = {
  args: {
    task: {
      ...baseTask,
      status: 'inProgress',
      scheduledStart: new Date().toISOString(),
      scheduledEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  },
}

export const Overdue: Story = {
  args: {
    task: {
      ...baseTask,
      status: 'inProgress',
      scheduledStart: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      scheduledEnd: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
  },
}

export const Backup: Story = {
  args: {
    task: {
      ...baseTask,
      notes: '[backup] Contingency visit',
    },
  },
}


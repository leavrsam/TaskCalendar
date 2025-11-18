import type { Meta, StoryObj } from '@storybook/react'

import type { TaskEvent } from '@/features/tasks/api'
import { CalendarEvent } from '@/routes/sections/schedule-route'

const baseEvent: TaskEvent = {
  id: 'event-1',
  title: 'Lesson with Maria',
  start: new Date(),
  end: new Date(Date.now() + 60 * 60 * 1000),
  resource: {
    id: 'task-1',
    ownerUid: 'demo-owner',
    title: 'Lesson with Maria',
    status: 'todo',
    priority: 'high',
    dueAt: new Date().toISOString(),
    assignedTo: ['demo-owner'],
    sharedWith: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contactId: 'contact-maria',
    notes: 'Bring fellowshipping family.',
  },
}

const meta: Meta<typeof CalendarEvent> = {
  title: 'Calendar/Event',
  component: CalendarEvent,
  args: {
    event: baseEvent,
  },
}

export default meta
type Story = StoryObj<typeof CalendarEvent>

export const Default: Story = {}

export const InProgress: Story = {
  args: {
    event: {
      ...baseEvent,
      resource: {
        ...baseEvent.resource,
        status: 'inProgress',
      },
    },
  },
}

export const Overdue: Story = {
  args: {
    event: {
      ...baseEvent,
      resource: {
        ...baseEvent.resource,
        status: 'inProgress',
        scheduledStart: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    },
  },
}

export const Backup: Story = {
  args: {
    event: {
      ...baseEvent,
      resource: {
        ...baseEvent.resource,
        notes: '[backup] optional exchange',
      },
    },
  },
}



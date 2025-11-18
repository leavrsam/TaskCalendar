import type { Task } from '@taskcalendar/core'

export const isBackupEvent = (task: Task) => task.notes?.includes('[backup]') ?? false

export const isOverdueEvent = (task: Task) => {
  if (!task.scheduledEnd) return false
  return new Date(task.scheduledEnd).getTime() < Date.now() && task.status !== 'done'
}



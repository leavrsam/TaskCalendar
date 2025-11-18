import clsx from 'clsx'

import type { Task } from '@taskcalendar/core'

import { isBackupEvent, isOverdueEvent } from './event-badge.utils'

export function CalendarEventBadge({ task }: { task: Task }) {
  const overdue = isOverdueEvent(task)
  const backup = isBackupEvent(task)
  return (
    <div
      className={clsx(
        'rounded-md border px-2 py-1 text-xs font-semibold shadow-sm',
        task.status === 'done' && 'border-emerald-300 bg-emerald-50 text-emerald-700',
        task.status === 'inProgress' && 'border-sky-300 bg-sky-50 text-sky-700',
        task.status === 'todo' && 'border-slate-200 bg-white text-slate-700',
        backup && 'opacity-60 border-dashed',
        overdue && 'border-rose-400 text-rose-700',
      )}
    >
      {backup ? 'Backup' : task.status}
    </div>
  )
}


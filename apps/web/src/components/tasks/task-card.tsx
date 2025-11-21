import clsx from 'clsx'
import { User } from 'lucide-react'

import type { Task } from '@taskcalendar/core'

import { CollaboratorStack } from '@/components/collaborators/collaborator-stack'
import { useContactsQuery } from '@/features/contacts/api'

type TaskCardProps = {
  task: Task
  onStatusChange?: (status: Task['status']) => void
  onSchedule?: () => void
}

const priorityTone: Record<Task['priority'], string> = {
  high: 'text-rose-600 bg-rose-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-emerald-600 bg-emerald-50',
}

export function TaskCard({ task, onStatusChange, onSchedule }: TaskCardProps) {
  const contactsQuery = useContactsQuery()
  const contacts = contactsQuery.data ?? []
  const contact = task.contactId ? contacts.find((c) => c.id === task.contactId) : null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{task.title}</p>
          {contact && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <User className="h-3 w-3" />
              <span>{contact.name}</span>
            </div>
          )}
          {task.dueAt && (
            <p className="text-xs text-slate-500">
              Due {new Date(task.dueAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
            priorityTone[task.priority],
          )}
        >
          {task.priority}
        </span>
      </div>

      {task.notes && (
        <p className="mt-2 text-sm text-slate-600 line-clamp-3">{task.notes}</p>
      )}
      {task.sharedWith && task.sharedWith.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <CollaboratorStack uids={task.sharedWith} />
          <p className="text-xs font-semibold text-slate-500">
            {task.sharedWith.length} collaborator{task.sharedWith.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {['todo', 'inProgress', 'done'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusChange?.(status as Task['status'])}
            className={clsx(
              'rounded-full border px-3 py-1 font-semibold transition',
              task.status === status
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-slate-200 text-slate-500 hover:border-brand-200',
            )}
          >
            {status}
          </button>
        ))}
        <button
          type="button"
          onClick={onSchedule}
          className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-slate-500 hover:border-brand-300"
        >
          {task.scheduledStart ? 'Reschedule' : 'Add to agenda'}
        </button>
      </div>
    </div>
  )
}



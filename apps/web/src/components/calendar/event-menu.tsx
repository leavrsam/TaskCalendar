import { useState } from 'react'

import type { Task } from '@taskcalendar/core'

type EventMenuProps = {
  task: Task
  onChange: (data: Partial<Task>) => void
}

export function EventMenu({ task, onChange }: EventMenuProps) {
  const [open, setOpen] = useState(false)
  const toggleStatus = (status: Task['status']) => {
    onChange({ status })
  }
  const toggleBackup = () => {
    const hasTag = task.notes?.includes('[backup]')
    const nextNotes = hasTag
      ? task.notes?.replace('[backup]', '').trim()
      : `[backup] ${task.notes ?? ''}`.trim()
    onChange({ notes: nextNotes })
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-full border border-slate-200 px-2 py-1 text-xs"
        onClick={() => setOpen((prev) => !prev)}
      >
        Actions
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-lg">
          <div className="space-y-1">
            {['todo', 'inProgress', 'done'].map((status) => (
              <button
                key={status}
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50"
                onClick={() => toggleStatus(status as Task['status'])}
              >
                <span>{status}</span>
                {task.status === status && (
                  <span className="text-brand-600">✓</span>
                )}
              </button>
            ))}
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50"
              onClick={toggleBackup}
            >
              <span>Backup</span>
              {task.notes?.includes('[backup]') && (
                <span className="text-brand-600">✓</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


import { formatDistanceToNow } from 'date-fns'
import { useMemo } from 'react'

import { useContactsQuery } from '@/features/contacts/api'
import { useLessonsQuery } from '@/features/lessons/api'
import { useTasksQuery } from '@/features/tasks/api'

export function DashboardRoute() {
  const tasksQuery = useTasksQuery()
  const contactsQuery = useContactsQuery()
  const lessonsQuery = useLessonsQuery()

  const upcomingTask = tasksQuery.data?.find((task) => task.scheduledStart)

  const sharedCount = useMemo(() => {
    const shared = new Set<string>()
    ;(tasksQuery.data ?? []).forEach((task) =>
      task.sharedWith?.forEach((uid) => shared.add(uid)),
    )
    ;(contactsQuery.data ?? []).forEach((contact) =>
      contact.sharedWith?.forEach((uid) => shared.add(uid)),
    )
    ;(lessonsQuery.data ?? []).forEach((lesson) =>
      lesson.sharedWith?.forEach((uid) => shared.add(uid)),
    )
    return shared.size
  }, [tasksQuery.data, contactsQuery.data, lessonsQuery.data])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Slice overview</p>
        <h1 className="text-2xl font-semibold text-slate-900">Workspace snapshot</h1>
        <p className="text-sm text-slate-600">
          Track personal contacts, lessons, and tasks—then loop in collaborators when you're ready
          to share.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Active contacts"
          value={contactsQuery.data?.length ?? 0}
          hint="Across all stages"
        />
        <StatCard
          label="Lessons logged this week"
          value={lessonsQuery.data?.length ?? 0}
          hint="Based on emulator seed"
        />
        <StatCard label="Open tasks" value={tasksQuery.data?.length ?? 0} hint="Includes backlog" />
      </section>
      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming block</p>
          {upcomingTask ? (
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{upcomingTask.title}</h3>
              <p className="text-sm text-slate-500">
                {formatDistanceToNow(new Date(upcomingTask.scheduledStart as string), {
                  addSuffix: true,
                })}
              </p>
              {upcomingTask.notes && <p className="mt-2 text-sm text-slate-600">{upcomingTask.notes}</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No scheduled tasks. Drag one onto the calendar.</p>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Sharing status</p>
            <p className="text-sm text-slate-600">
              {sharedCount > 0
                ? `You currently share this workspace with ${sharedCount} collaborator${
                    sharedCount > 1 ? 's' : ''
                  }.`
                : 'Only you can view this workspace. Invite someone when you want help.'}
            </p>
            <button
              type="button"
              className="mt-4 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300"
            >
              Manage sharing (coming soon)
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fast links</p>
            <ul className="mt-3 space-y-2 text-sm text-brand-600">
              <li>
                <a className="hover:underline" href="/contacts">
                  Manage contacts
                </a>
              </li>
              <li>
                <a className="hover:underline" href="/lessons">
                  Log a lesson
                </a>
              </li>
              <li>
                <a className="hover:underline" href="/schedule">
                  Open calendar
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

type StatCardProps = {
  label: string
  value: number
  hint: string
}

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  )
}


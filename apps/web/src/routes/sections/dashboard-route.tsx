import { formatDistanceToNow } from 'date-fns'
import { useMemo } from 'react'

import { QuickActions } from '@/components/dashboard/quick-actions'
import { RecentVisitsWidget } from '@/components/dashboard/recent-visits-widget'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'
import { useContactsQuery } from '@/features/contacts/api'
import { useLessonsQuery } from '@/features/lessons/api'
import { useTasksQuery } from '@/features/tasks/api'
import { useGoalsQuery } from '@/features/goals/api'
import { useAuth } from '@/hooks/use-auth'

export function DashboardRoute() {
  const { user } = useAuth()
  const tasksQuery = useTasksQuery()
  const contactsQuery = useContactsQuery()
  const lessonsQuery = useLessonsQuery()
  const goalsQuery = useGoalsQuery()

  const upcomingTask = tasksQuery.data?.find((task) => task.scheduledStart)

  const sharedCount = useMemo(() => {
    const shared = new Set<string>()
      ; (tasksQuery.data ?? []).forEach((task) =>
        task.sharedWith?.forEach((uid) => shared.add(uid)),
      )
      ; (contactsQuery.data ?? []).forEach((contact) =>
        contact.sharedWith?.forEach((uid) => shared.add(uid)),
      )
      ; (lessonsQuery.data ?? []).forEach((lesson) =>
        lesson.sharedWith?.forEach((uid) => shared.add(uid)),
      )
    return shared.size
  }, [tasksQuery.data, contactsQuery.data, lessonsQuery.data])

  const goalStats = useMemo(() => {
    const goals = goalsQuery.data ?? []
    if (goals.length === 0) {
      return { total: 0, onTrack: 0, needsAttention: 0, nextGoal: undefined }
    }
    const onTrack = goals.filter((goal) => goal.progress / goal.target >= 0.75).length
    const needsAttention = goals.filter((goal) => goal.progress / goal.target < 0.5).length
    return {
      total: goals.length,
      onTrack,
      needsAttention,
      nextGoal: goals[0],
    }
  }, [goalsQuery.data])

  const contacts = contactsQuery.data?.map((c) => ({ id: c.id, name: c.name })) ?? []

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CollaboratorAvatar
              collaborator={{
                uid: user?.uid ?? 'me',
                email: user?.email ?? '',
                label: user?.displayName || user?.email || 'You',
              }}
              size="lg"
              photoURL={user?.photoURL ?? undefined}
            />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Command Center</p>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Here's what's happening in your natural life today.
              </p>
            </div>
          </div>
        </div>
      </header>

      <QuickActions />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Active contacts"
          value={contactsQuery.data?.length ?? 0}
          hint="Across all stages"
        />
        <StatCard
          label="Visits this week"
          value={lessonsQuery.data?.length ?? 0}
          hint="Interactions logged"
        />
        <StatCard label="Open tasks" value={tasksQuery.data?.length ?? 0} hint="Includes backlog" />
        <StatCard label="Active goals" value={goalStats.total} hint="Across all focus areas" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Today's Focus</p>
            {upcomingTask ? (
              <div className="mt-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{upcomingTask.title}</h3>
                <p className="text-sm text-slate-500">
                  {formatDistanceToNow(new Date(upcomingTask.scheduledStart as string), {
                    addSuffix: true,
                  })}
                </p>
                {upcomingTask.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{upcomingTask.notes}</p>}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No scheduled tasks. You're free!</p>
            )}
          </div>

          <RecentVisitsWidget visits={lessonsQuery.data ?? []} contacts={contacts} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Goals focus</p>
            {goalStats.total === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No personal goals yet. Create one to begin.</p>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {goalStats.onTrack} on track • {goalStats.needsAttention} need attention
                </p>
                {goalStats.nextGoal && (
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Next to focus
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {goalStats.nextGoal.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {Math.round(
                        (goalStats.nextGoal.progress / goalStats.nextGoal.target) * 100,
                      )}
                      % complete · due{' '}
                      {formatDistanceToNow(new Date(goalStats.nextGoal.periodEnd), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-brand-600">
                  <a className="hover:underline" href="/goals">
                    View all goals
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Sharing status</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {sharedCount > 0
                ? `You currently share this workspace with ${sharedCount} collaborator${sharedCount > 1 ? 's' : ''
                }.`
                : 'Only you can view this workspace. Invite someone when you want help.'}
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/settings'
              }}
              className="mt-4 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:border-brand-300"
            >
              Manage sharing
            </button>
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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  )
}


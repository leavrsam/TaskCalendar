import { useState } from 'react'
import { addDays, formatISO } from 'date-fns'

import { GoalCard } from '@/components/goals/goal-card'
import { useGoalsQuery, useCreateGoal, useUpdateGoal } from '@/features/goals/api'
import { useToast } from '@/hooks/use-toast'

const categories = [
  'physical',
  'intellectual',
  'social',
  'financial',
  'spiritual',
  'emotional',
  'career',
  'personal',
] as const

export function GoalsRoute() {
  const goalsQuery = useGoalsQuery()
  const updateGoal = useUpdateGoal()
  const createGoal = useCreateGoal()
  const { success: showSuccessToast } = useToast()

  const goals = goalsQuery.data ?? []
  const [form, setForm] = useState({
    metric: 'physical' as (typeof categories)[number],
    title: 'Morning run',
    target: 10,
    unit: 'sessions',
    periodStart: formatISO(new Date(), { representation: 'date' }),
    periodEnd: formatISO(addDays(new Date(), 14), { representation: 'date' }),
  })

  const handleCreate = async () => {
    await createGoal.mutateAsync({
      ...form,
      target: Number(form.target),
      periodStart: new Date(form.periodStart).toISOString(),
      periodEnd: new Date(form.periodEnd).toISOString(),
    })
    showSuccessToast({ title: 'Goal created', description: 'Stay consistent and track progress.' })
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Slice 6</p>
        <h1 className="text-2xl font-semibold text-slate-900">Personal Goals</h1>
        <p className="text-sm text-slate-600">
          Track physical, intellectual, spiritual and financial goals in one dashboard.
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {goalsQuery.isLoading && (
            <p className="text-sm text-slate-500">Loading goals...</p>
          )}
          {!goalsQuery.isLoading && goals.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No goals yet. Create one to start building momentum.
            </p>
          )}
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onProgressChange={(progress) =>
                updateGoal.mutate({ id: goal.id, data: { progress } })
              }
            />
          ))}
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add a goal</h2>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Category</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.metric}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    metric: e.target.value as (typeof categories)[number],
                  }))
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Target</label>
                <input
                  type="number"
                  value={form.target}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, target: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Unit</label>
                <input
                  value={form.unit}
                  onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Starts</label>
                <input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm((prev) => ({ ...prev, periodStart: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Ends</label>
                <input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm((prev) => ({ ...prev, periodEnd: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleCreate()
              }}
              disabled={createGoal.isPending}
              className="w-full rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {createGoal.isPending ? 'Saving…' : 'Create goal'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}


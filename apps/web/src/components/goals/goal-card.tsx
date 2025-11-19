import type { Goal } from '@taskcalendar/core'
import { format } from 'date-fns'
import clsx from 'clsx'

type GoalCardProps = {
  goal: Goal
  onProgressChange?: (progress: number) => void
  onEdit?: () => void
}

const categoryColors: Record<Goal['metric'], string> = {
  physical: 'bg-rose-50 text-rose-700 border-rose-200',
  intellectual: 'bg-sky-50 text-sky-700 border-sky-200',
  social: 'bg-amber-50 text-amber-700 border-amber-200',
  financial: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  spiritual: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  emotional: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  career: 'bg-slate-50 text-slate-700 border-slate-200',
  personal: 'bg-teal-50 text-teal-700 border-teal-200',
}

export function GoalCard({ goal, onProgressChange, onEdit }: GoalCardProps) {
  const completion = Math.min(Math.round((goal.progress / goal.target) * 100) || 0, 100)
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={clsx(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize',
              categoryColors[goal.metric],
            )}
          >
            {goal.metric}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{goal.title}</h3>
          <p className="text-sm text-slate-500">
            {goal.progress} / {goal.target} {goal.unit}
          </p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            Edit
          </button>
        )}
      </div>
      <div className="space-y-2">
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-brand-500 transition"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          Due {format(new Date(goal.periodEnd), 'MMM d')} • {completion}% complete
        </p>
      </div>
      {onProgressChange && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={goal.target}
            value={goal.progress}
            onChange={(e) => onProgressChange(Number(e.target.value))}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => onProgressChange(goal.target)}
            className="text-xs font-semibold text-brand-600 hover:text-brand-800"
          >
            Mark done
          </button>
        </div>
      )}
    </div>
  )
}


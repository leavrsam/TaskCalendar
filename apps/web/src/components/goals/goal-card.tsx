import type { Goal } from '@taskcalendar/core'
import { format, differenceInDays } from 'date-fns'
import clsx from 'clsx'
import {
  Dumbbell,
  BookOpen,
  Users,
  DollarSign,
  Sparkles,
  Heart,
  Briefcase,
  Star,
  Trash2,
  Edit2
} from 'lucide-react'

type GoalCardProps = {
  goal: Goal
  onProgressChange?: (progress: number) => void
  onEdit?: () => void
  onDelete?: () => void
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

const categoryIcons: Record<Goal['metric'], React.ReactNode> = {
  physical: <Dumbbell className="h-4 w-4" />,
  intellectual: <BookOpen className="h-4 w-4" />,
  social: <Users className="h-4 w-4" />,
  financial: <DollarSign className="h-4 w-4" />,
  spiritual: <Sparkles className="h-4 w-4" />,
  emotional: <Heart className="h-4 w-4" />,
  career: <Briefcase className="h-4 w-4" />,
  personal: <Star className="h-4 w-4" />,
}

const progressBarColors: Record<Goal['metric'], string> = {
  physical: 'bg-rose-500',
  intellectual: 'bg-sky-500',
  social: 'bg-amber-500',
  financial: 'bg-emerald-500',
  spiritual: 'bg-indigo-500',
  emotional: 'bg-fuchsia-500',
  career: 'bg-slate-500',
  personal: 'bg-teal-500',
}

export function GoalCard({ goal, onProgressChange, onEdit, onDelete }: GoalCardProps) {
  const completion = Math.min(Math.round((goal.progress / goal.target) * 100) || 0, 100)
  const daysRemaining = differenceInDays(new Date(goal.periodEnd), new Date())
  const isOverdue = daysRemaining < 0
  const isCompleted = completion >= 100

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${goal.title}"?`)) {
      onDelete?.()
    }
  }

  return (
    <div className="group space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
                categoryColors[goal.metric],
              )}
            >
              {categoryIcons[goal.metric]}
              {goal.metric}
            </p>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                ✓ Complete
              </span>
            )}
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{goal.title}</h3>
          <p className="text-sm text-slate-500">
            {goal.progress} / {goal.target} {goal.unit}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Edit goal"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              title="Delete goal"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className={clsx(
              'h-2 rounded-full transition-all duration-500',
              progressBarColors[goal.metric],
            )}
            style={{ width: `${completion}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <p className="text-slate-500">
            Due {format(new Date(goal.periodEnd), 'MMM d')} • {completion}% complete
          </p>
          {!isCompleted && (
            <p
              className={clsx(
                'font-semibold',
                isOverdue ? 'text-rose-600' : daysRemaining <= 3 ? 'text-amber-600' : 'text-slate-500',
              )}
            >
              {isOverdue
                ? `${Math.abs(daysRemaining)} days overdue`
                : daysRemaining === 0
                  ? 'Due today'
                  : `${daysRemaining} days left`}
            </p>
          )}
        </div>
      </div>
      {onProgressChange && !isCompleted && (
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


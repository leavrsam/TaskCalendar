import { format } from 'date-fns'

import type { Visit } from '@taskcalendar/core'

type LessonCardProps = {
  visit: Visit
}

export function LessonCard({ visit }: LessonCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {visit.type.charAt(0).toUpperCase()}
            {visit.type.slice(1)} visit
          </p>
          <p className="text-xs text-slate-500">
            {format(new Date(visit.visitedAt), 'MMM d, h:mm a')}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {visit.visitedBy.join(' • ')}
        </span>
      </div>
      {visit.notes && <p className="mt-2 text-sm text-slate-600">{visit.notes}</p>}
      {visit.commitments.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
          {visit.commitments.map((commitment) => (
            <li key={commitment}>{commitment}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

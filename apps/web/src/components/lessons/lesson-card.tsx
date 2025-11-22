import { format } from 'date-fns'

import type { Lesson } from '@taskcalendar/core'

type LessonCardProps = {
  lesson: Lesson
}

export function LessonCard({ lesson }: LessonCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {lesson.type.charAt(0).toUpperCase()}
            {lesson.type.slice(1)} lesson
          </p>
          <p className="text-xs text-slate-500">
            {format(new Date(lesson.taughtAt), 'MMM d, h:mm a')}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {lesson.taughtBy.join(' • ')}
        </span>
      </div>
      {lesson.notes && <p className="mt-2 text-sm text-slate-600">{lesson.notes}</p>}
      {lesson.commitments.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
          {lesson.commitments.map((commitment) => (
            <li key={commitment}>{commitment}</li>
          ))}
        </ul>
      )}
    </div>
  )
}


type TimelineEntry = {
  id: string
  title: string
  body: string
  timestamp: string
}

type NoteTimelineProps = {
  entries: TimelineEntry[]
}

export function NoteTimeline({ entries }: NoteTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
        No notes yet. Log a lesson to seed the timeline.
      </div>
    )
  }

  return (
    <ol className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {entries.map((entry) => (
        <li key={entry.id} className="relative pl-6 text-sm">
          <span className="absolute left-0 top-1 h-3 w-3 rounded-full bg-brand-500" />
          <p className="font-semibold text-slate-900">{entry.title}</p>
          <p className="text-xs text-slate-500">{entry.timestamp}</p>
          <p className="mt-1 text-slate-600">{entry.body}</p>
        </li>
      ))}
    </ol>
  )
}


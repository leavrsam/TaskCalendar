import { format } from 'date-fns'

import { LessonCard } from '@/components/lessons/lesson-card'
import { LessonForm } from '@/components/lessons/lesson-form'
import { NoteTimeline } from '@/components/lessons/note-timeline'
import { useContactsQuery } from '@/features/contacts/api'
import { useLessonsQuery } from '@/features/lessons/api'

export function LessonsRoute() {
  const contactsQuery = useContactsQuery()
  const lessonsQuery = useLessonsQuery()

  const timelineEntries =
    lessonsQuery.data?.map((lesson) => ({
      id: lesson.id,
      title: `${lesson.contactId} • ${lesson.type}`,
      body: lesson.notes ?? 'No notes captured.',
      timestamp: format(new Date(lesson.taughtAt), 'MMM d, h:mm a'),
    })) ?? []

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Slice 4</p>
        <h1 className="text-2xl font-semibold text-slate-900">Lessons & Notes</h1>
        <p className="text-sm text-slate-600">
          Capture key takeaways, commitments, and follow-up plans for each teaching visit.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {lessonsQuery.isLoading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Loading lessons…
            </div>
          )}
          {!lessonsQuery.isLoading &&
            lessonsQuery.data?.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
        </div>
        <div className="space-y-4">
          <LessonForm
            contacts={
              contactsQuery.data?.map((contact) => ({
                id: contact.id,
                name: contact.name,
              })) ?? []
            }
            onSubmit={(values) => {
              console.info('Lesson logged', values)
            }}
          />
          <NoteTimeline entries={timelineEntries} />
        </div>
      </section>
    </div>
  )
}


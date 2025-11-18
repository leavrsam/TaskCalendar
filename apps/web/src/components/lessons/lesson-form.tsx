import { useForm } from 'react-hook-form'

import type { Lesson } from '@taskcalendar/core'

type LessonFormValues = {
  contactId: string
  type: Lesson['type']
  notes: string
}

type LessonFormProps = {
  onSubmit: (values: LessonFormValues) => void
  contacts: { id: string; name: string }[]
}

export function LessonForm({ onSubmit, contacts }: LessonFormProps) {
  const form = useForm<LessonFormValues>({
    defaultValues: {
      contactId: contacts[0]?.id ?? '',
      type: 'restoration',
      notes: '',
    },
  })

  const handleSubmit = form.handleSubmit(onSubmit)

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contact
        </label>
        <select
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          {...form.register('contactId')}
        >
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Lesson type
        </label>
        <select
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm capitalize"
          {...form.register('type')}
        >
          {['restoration', 'plan', 'gospel', 'commandments', 'laws'].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Lesson notes
        </label>
        <textarea
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          {...form.register('notes')}
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Log lesson
      </button>
    </form>
  )
}


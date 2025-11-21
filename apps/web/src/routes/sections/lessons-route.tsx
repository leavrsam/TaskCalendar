import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Lesson } from '@taskcalendar/core'

import { VisitCard } from '@/components/visits/visit-card'
import { VisitForm } from '@/components/visits/visit-form'
import { useContactsQuery } from '@/features/contacts/api'
import {
  useLessonsQuery,
  useCreateVisit,
  useUpdateVisit,
  useDeleteVisit,
} from '@/features/lessons/api'
import { useToast } from '@/hooks/use-toast'

export function LessonsRoute() {
  const contactsQuery = useContactsQuery()
  const lessonsQuery = useLessonsQuery()
  const createVisit = useCreateVisit()
  const updateVisit = useUpdateVisit()
  const deleteVisit = useDeleteVisit()
  const { success: showSuccessToast } = useToast()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingVisit, setEditingVisit] = useState<Lesson | null>(null)

  const contacts = contactsQuery.data?.map((c) => ({ id: c.id, name: c.name })) ?? []
  const visits = lessonsQuery.data ?? []

  const getContactName = (id: string) =>
    contacts.find((c) => c.id === id)?.name ?? 'Unknown Person'

  const handleCreate = async (data: Omit<Lesson, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => {
    await createVisit.mutateAsync(data)
    showSuccessToast({ title: 'Visit logged', description: 'Added to your timeline.' })
    setIsCreateModalOpen(false)
  }

  const handleUpdate = async (data: Omit<Lesson, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => {
    if (!editingVisit) return
    await updateVisit.mutateAsync({ id: editingVisit.id, data })
    showSuccessToast({ title: 'Visit updated', description: 'Changes saved successfully.' })
    setEditingVisit(null)
  }

  const handleDelete = async (id: string) => {
    await deleteVisit.mutateAsync(id)
    showSuccessToast({ title: 'Visit deleted', description: 'Removed from your timeline.' })
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Slice 4</p>
          <h1 className="text-2xl font-semibold text-slate-900">Visits & Interactions</h1>
          <p className="text-sm text-slate-600">
            Log your visits, track conversations, and remember next steps for every relationship.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Log Visit
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {lessonsQuery.isLoading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Loading timeline…
            </div>
          )}
          {!lessonsQuery.isLoading && visits.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              <p>No visits logged yet.</p>
              <p className="mt-1">Click "Log Visit" to record your first interaction.</p>
            </div>
          )}
          {!lessonsQuery.isLoading &&
            visits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                contactName={getContactName(visit.contactId)}
                onEdit={() => setEditingVisit(visit)}
                onDelete={() => handleDelete(visit.id)}
              />
            ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Recent Activity</p>
            <div className="mt-4 space-y-4">
              {visits.slice(0, 5).map((visit) => (
                <div key={visit.id} className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-slate-200">
                  <p className="text-sm font-medium text-slate-900">
                    Visited {getContactName(visit.contactId)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(visit.taughtAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {visits.length === 0 && (
                <p className="text-sm text-slate-500">Activity will appear here.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {isCreateModalOpen && (
        <VisitForm
          title="Log Visit"
          contacts={contacts}
          onSubmit={handleCreate}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {editingVisit && (
        <VisitForm
          title="Edit Visit"
          initialData={editingVisit}
          contacts={contacts}
          onSubmit={handleUpdate}
          onClose={() => setEditingVisit(null)}
        />
      )}
    </div>
  )
}


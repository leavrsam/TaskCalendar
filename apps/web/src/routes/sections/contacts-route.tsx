import { useState } from 'react'
import { Plus, Map as MapIcon, List } from 'lucide-react'
import type { Contact } from '@taskcalendar/core'

import { ContactCard } from '@/components/contacts/contact-card'
import { ContactForm } from '@/components/contacts/contact-form'
import { ContactDetail } from '@/components/contacts/contact-detail'
import { ContactsMap } from '@/components/contacts/contacts-map'
import {
  useContactsQuery,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from '@/features/contacts/api'
import { useToast } from '@/hooks/use-toast'

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  teaching: 'Visiting',
  progressing: 'Building Relationship',
  member: 'Friend',
  dropped: 'Archived',
}

export function ContactsRoute() {
  const contactsQuery = useContactsQuery()
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()
  const deleteContact = useDeleteContact()
  const { success: showSuccessToast } = useToast()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [view, setView] = useState<'list' | 'map'>('list')

  const contacts = contactsQuery.data ?? []
  console.log('Contacts loaded:', contacts)

  const handleCreate = async (data: Omit<Contact, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => {
    await createContact.mutateAsync(data)
    showSuccessToast({ title: 'Person added', description: 'Added to your contacts.' })
    setIsCreateModalOpen(false)
  }

  const handleUpdate = async (data: Omit<Contact, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => {
    if (!editingContact) return
    await updateContact.mutateAsync({ id: editingContact.id, data })
    showSuccessToast({ title: 'Contact updated', description: 'Changes saved successfully.' })
    setEditingContact(null)
  }

  const handleDelete = async (id: string) => {
    await deleteContact.mutateAsync(id)
    showSuccessToast({ title: 'Contact deleted', description: 'Removed from your contacts.' })
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Slice 3</p>
          <h1 className="text-2xl font-semibold text-slate-900">People & Relationships</h1>
          <p className="text-sm text-slate-600">
            Manage your contacts, track their progress, and build meaningful relationships.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setView('list')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List
              </div>
            </button>
            <button
              onClick={() => setView('map')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <MapIcon className="h-4 w-4" />
                Map
              </div>
            </button>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add Person
          </button>
        </div>
      </header>

      {view === 'map' ? (
        <ContactsMap contacts={contacts} />
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 lg:grid-cols-[3fr,1fr]">
          {/* Render columns based on stages */}
          {Object.entries(STAGE_LABELS).map(([stageKey, label]) => {
            const stageContacts = contacts.filter((c) => c.stage === stageKey)
            return (
              <div key={stageKey} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-semibold text-slate-700">{label}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {stageContacts.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {stageContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className="cursor-pointer"
                    >
                      <ContactCard
                        contact={contact}
                        onEdit={() => setEditingContact(contact)}
                        onDelete={() => handleDelete(contact.id)}
                      />
                    </div>
                  ))}
                  {stageContacts.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      No contacts in this stage
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {isCreateModalOpen && (
        <ContactForm
          title="Add Person"
          onSubmit={handleCreate}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {editingContact && (
        <ContactForm
          title="Edit Person"
          initialData={editingContact}
          onSubmit={handleUpdate}
          onClose={() => setEditingContact(null)}
        />
      )}

      {selectedContact && (
        <ContactDetail contact={selectedContact} onClose={() => setSelectedContact(null)} />
      )}
    </div>
  )
}

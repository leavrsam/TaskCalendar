import { useState, useEffect } from 'react'
import { Plus, Upload, X } from 'lucide-react'
import type { Contact } from '@taskcalendar/core'

import { ContactCard } from '@/components/contacts/contact-card'
import { ContactForm } from '@/components/contacts/contact-form'
import { ContactDetail } from '@/components/contacts/contact-detail'
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
  family: 'Family',
  dropped: 'Archived', // Moved family above
}

type ImportedContact = {
  name: string
  phone?: string
  email?: string
  address?: string
}

export function ContactsRoute() {
  const contactsQuery = useContactsQuery()
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()
  const deleteContact = useDeleteContact()
  const { success: showSuccessToast, error: showErrorToast } = useToast()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  /* View state with 4 options, persisted to localStorage */
  const [view, setView] = useState<'stages' | 'alphabetical' | 'recent' | 'favorites'>(() => {
    const saved = localStorage.getItem('contacts-view')
    return (saved as 'stages' | 'alphabetical' | 'recent' | 'favorites') || 'stages'
  })
  const [importPreview, setImportPreview] = useState<ImportedContact[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [supportsContactPicker, setSupportsContactPicker] = useState(false)

  const contactsRaw = contactsQuery.data ?? []
  // Filter out location pins from the people list
  const contacts = contactsRaw.filter(c => !c.tags.includes('pinned-location'))
  console.log('Contacts loaded:', contacts)

  useEffect(() => {
    // Check if Contact Picker API is available
    setSupportsContactPicker('contacts' in navigator)
  }, [])

  useEffect(() => {
    // Persist view preference to localStorage
    localStorage.setItem('contacts-view', view)
  }, [view])

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

  const handleToggleFavorite = async (contact: Contact) => {
    await updateContact.mutateAsync({
      id: contact.id,
      data: { isFavorite: !contact.isFavorite }
    })
  }

  const handleImportClick = async () => {
    try {
      const props = ['name', 'tel', 'email', 'address']
      const opts = { multiple: true }

      // @ts-expect-error - Contact Picker API types not in TypeScript yet
      const selectedContacts = await navigator.contacts.select(props, opts)

      const importedContacts: ImportedContact[] = selectedContacts.map((contact: any) => ({
        name: contact.name?.[0] || 'Unknown',
        phone: contact.tel?.[0],
        email: contact.email?.[0],
        address: contact.address?.[0]?.formattedAddress || contact.address?.[0],
      }))

      setImportPreview(importedContacts)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        showErrorToast({ title: 'Import failed', description: err.message })
      }
    }
  }

  const handleConfirmImport = async () => {
    setIsImporting(true)
    try {
      let successCount = 0
      for (const importedContact of importPreview) {
        await createContact.mutateAsync({
          name: importedContact.name,
          stage: 'new',
          phone: importedContact.phone,
          email: importedContact.email,
          address: importedContact.address,
          tags: [],
          lastContactedAt: null,
          nextVisitAt: null,
          sharedWith: [],
          goals: [],
          isFavorite: false,
        })
        successCount++
      }

      showSuccessToast({
        title: 'Contacts imported',
        description: `Successfully imported ${successCount} contact${successCount !== 1 ? 's' : ''}.`
      })
      setImportPreview([])
    } catch (err) {
      showErrorToast({
        title: 'Import error',
        description: 'Some contacts could not be imported.'
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-neutral-900 p-5 shadow-sm md:flex-row md:items-start md:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">People & Relationships</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {/* New View Toggles */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-1">
            <button
              onClick={() => setView('stages')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors sm:flex-none ${view === 'stages' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              Groups
            </button>
            <button
              onClick={() => setView('favorites')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors sm:flex-none ${view === 'favorites' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              ★ Favorites
            </button>
            <button
              onClick={() => setView('alphabetical')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors sm:flex-none ${view === 'alphabetical' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              A-Z
            </button>
            <button
              onClick={() => setView('recent')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors sm:flex-none ${view === 'recent' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              Recent
            </button>
          </div>
          {supportsContactPicker && (
            <button
              onClick={handleImportClick}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-neutral-900 px-5 py-3 text-sm font-semibold text-slate-900 dark:text-slate-50 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[48px]"
            >
              <Upload className="h-5 w-5" />
              Import
            </button>
          )}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 min-h-[48px]"
          >
            <Plus className="h-5 w-5" />
            Add Person
          </button>
        </div>
      </header>

      {/* Conditional Rendering based on View */}
      {view === 'stages' && (
        <section className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(STAGE_LABELS).map(([stageKey, label]) => {
            const stageContacts = contacts.filter((c) => c.stage === stageKey)
            return (
              <div key={stageKey} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300">{label}</h3>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
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
                        onToggleFavorite={() => handleToggleFavorite(contact)}
                      />
                    </div>
                  ))}
                  {stageContacts.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs text-slate-400">
                      No contacts in this stage
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {view === 'alphabetical' && (
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...contacts]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className="cursor-pointer"
              >
                <ContactCard
                  contact={contact}
                  onEdit={() => setEditingContact(contact)}
                  onDelete={() => handleDelete(contact.id)}
                  onToggleFavorite={() => handleToggleFavorite(contact)}
                />
              </div>
            ))}
        </section>
      )}

      {view === 'recent' && (
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...contacts]
            .sort((a, b) => {
              const dateA = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0
              const dateB = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0
              return dateB - dateA
            })
            .map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className="cursor-pointer"
              >
                <ContactCard
                  contact={contact}
                  onEdit={() => setEditingContact(contact)}
                  onDelete={() => handleDelete(contact.id)}
                  onToggleFavorite={() => handleToggleFavorite(contact)}
                />
              </div>
            ))}
        </section>
      )}

      {view === 'favorites' && (
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {contacts.filter((c) => c.isFavorite).length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
              <p className="text-sm text-slate-500">No favorites yet. Star some contacts to see them here!</p>
            </div>
          ) : (
            contacts
              .filter((c) => c.isFavorite)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className="cursor-pointer"
                >
                  <ContactCard
                    contact={contact}
                    onEdit={() => setEditingContact(contact)}
                    onDelete={() => handleDelete(contact.id)}
                    onToggleFavorite={() => handleToggleFavorite(contact)}
                  />
                </div>
              ))
          )}
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

      {/* Import Preview Modal */}
      {importPreview.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Confirm Import
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {importPreview.length} contact{importPreview.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <button
                onClick={() => setImportPreview([])}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
              {importPreview.map((contact, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3"
                >
                  <p className="font-medium text-slate-900 dark:text-slate-50">{contact.name}</p>
                  {contact.phone && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">{contact.phone}</p>
                  )}
                  {contact.email && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">{contact.email}</p>
                  )}
                  {contact.address && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">{contact.address}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setImportPreview([])}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : `Import ${importPreview.length} Contact${importPreview.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

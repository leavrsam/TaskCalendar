import { ContactCard } from '@/components/contacts/contact-card'
import { ShareWorkspaceCard } from '@/components/sharing/share-workspace-card'
import { useContactsQuery, groupContactsByStage } from '@/features/contacts/api'

export function ContactsRoute() {
  const { data, isLoading } = useContactsQuery()

  const columns = groupContactsByStage(data ?? [])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Slice 3</p>
        <h1 className="text-2xl font-semibold text-slate-900">Contacts & Teaching Pool</h1>
        <p className="text-sm text-slate-600">
          Organize households by stage, track lessons, and keep trusted partners in sync.
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {isLoading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Loading contacts…
            </div>
          )}
          {!isLoading && (
            <div className="grid gap-4 md:grid-cols-2">
              {columns.map((column) => (
                <div key={column.stage} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {column.stage}
                    </p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {column.contacts.length}
                    </span>
                  </div>
                  {column.contacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                  {column.contacts.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No contacts in this column yet.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <ShareWorkspaceCard />
      </section>
    </div>
  )
}

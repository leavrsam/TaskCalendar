import { ContactCard } from '@/components/contacts/contact-card'
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

function ShareWorkspaceCard() {
  return (
    <div className="flex h-fit flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Sharing</p>
        <h2 className="text-lg font-semibold text-slate-900">Workspace access</h2>
        <p className="text-sm text-slate-600">
          Every contact, note, and task belongs to your account. Add collaborators when you want
          someone else to view or edit your planner.
        </p>
      </div>
      <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">Avery North</p>
            <p className="text-xs text-slate-500">Editor • invited via email</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Active
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">Luis Ortega</p>
            <p className="text-xs text-slate-500">Viewer • shared calendar</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
            Pending
          </span>
        </div>
      </div>
      <button
        type="button"
        className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300"
      >
        Copy invite link (coming soon)
      </button>
    </div>
  )
}


import { format } from 'date-fns'

import type { Contact } from '@taskcalendar/core'

import { CollaboratorStack } from '@/components/collaborators/collaborator-stack'

type ContactCardProps = {
  contact: Contact
}

export function ContactCard({ contact }: ContactCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
          {contact.phone && <p className="text-xs text-slate-500">{contact.phone}</p>}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
          {contact.stage}
        </span>
      </div>
      {contact.notes && <p className="mt-2 text-sm text-slate-600">{contact.notes}</p>}
      {contact.sharedWith && contact.sharedWith.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <CollaboratorStack uids={contact.sharedWith} />
          <p className="text-xs font-semibold text-slate-500">
            {contact.sharedWith.length} collaborator{contact.sharedWith.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
        {contact.lastContactedAt && (
          <div>
            <p className="font-semibold text-slate-700">Last visit</p>
            <p>{format(new Date(contact.lastContactedAt), 'MMM d')}</p>
          </div>
        )}
        {contact.nextVisitAt && (
          <div>
            <p className="font-semibold text-slate-700">Next visit</p>
            <p>{format(new Date(contact.nextVisitAt), 'MMM d, h:mm a')}</p>
          </div>
        )}
      </div>
      {contact.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-slate-500">
          {contact.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}


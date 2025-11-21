import { format } from 'date-fns'
import { MapPin, Phone, Mail, Edit2, Trash2 } from 'lucide-react'
import type { Contact } from '@taskcalendar/core'
import { CollaboratorStack } from '@/components/collaborators/collaborator-stack'

type ContactCardProps = {
  contact: Contact
  onEdit?: () => void
  onDelete?: () => void
}

export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${contact.name}?`)) {
      onDelete?.()
    }
  }

  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{contact.name}</h3>
          {contact.address && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{contact.address}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Edit contact"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              title="Delete contact"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {(contact.phone || contact.email) && (
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-1.5 hover:text-brand-600"
            >
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {contact.phone}
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1.5 hover:text-brand-600"
            >
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {contact.email}
            </a>
          )}
        </div>
      )}

      {contact.notes && <p className="text-sm text-slate-600">{contact.notes}</p>}

      {contact.sharedWith && contact.sharedWith.length > 0 && (
        <div className="flex items-center gap-2">
          <CollaboratorStack uids={contact.sharedWith} />
          <p className="text-xs font-semibold text-slate-500">
            {contact.sharedWith.length} collaborator{contact.sharedWith.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
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
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-slate-500">
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

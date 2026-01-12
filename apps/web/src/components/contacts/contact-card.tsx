import { useState, useEffect } from 'react'
import { format, differenceInDays } from 'date-fns'
import { MapPin, Phone, Mail, Edit2, Trash2, Star } from 'lucide-react'
import type { Contact } from '@taskcalendar/core'
import { CollaboratorStack } from '@/components/collaborators/collaborator-stack'

type ContactCardProps = {
  contact: Contact
  onEdit?: () => void
  onDelete?: () => void
  onToggleFavorite?: () => void
}

export function ContactCard({ contact, onEdit, onDelete, onToggleFavorite }: ContactCardProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    if (isConfirming) {
      timeout = setTimeout(() => {
        setIsConfirming(false)
      }, 3000)
    }
    return () => clearTimeout(timeout)
  }, [isConfirming])

  const handleDelete = () => {
    if (isConfirming) {
      onDelete?.()
      setIsConfirming(false)
    } else {
      setIsConfirming(true)
    }
  }

  // Recency Logic for Favorites
  let ringClass = ''
  if (contact.isFavorite) {
    const lastContact = contact.lastContactedAt ? new Date(contact.lastContactedAt) : null
    const daysSince = lastContact ? differenceInDays(new Date(), lastContact) : Infinity

    if (daysSince < 30) {
      ringClass = 'ring-2 ring-emerald-500/70 dark:ring-emerald-500/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
    } else if (daysSince < 90) {
      ringClass = 'ring-2 ring-amber-400/80 dark:ring-amber-400/80 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
    } else if (daysSince < 120) {
      ringClass = 'ring-2 ring-orange-500/80 dark:ring-orange-500/80 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
    } else {
      ringClass = 'ring-2 ring-rose-500/70 dark:ring-rose-500/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
    }
  }

  return (
    <div className={`group relative flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-neutral-900 p-4 shadow-sm transition-all hover:shadow-md ${ringClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              className={`rounded-full p-1 transition-colors ${contact.isFavorite
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-slate-300 hover:text-amber-400'
                }`}
              title={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`h-4 w-4 ${contact.isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-50">{contact.name}</h3>
            {contact.address && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{contact.address}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 transition-opacity group-hover:opacity-100">
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
              className={`flex items-center gap-1 rounded-full p-1.5 transition-all ${isConfirming
                ? 'bg-rose-600 text-white px-3 w-auto'
                : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                }`}
              title="Delete contact"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isConfirming && <span className="text-xs font-bold whitespace-nowrap">Really Delete?</span>}
            </button>
          )}
        </div>
      </div>

      {(contact.phone || contact.email) && (
        <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-1.5 hover:text-brand-600"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {contact.phone}
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1.5 hover:text-brand-600"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {contact.email}
            </a>
          )}
        </div>
      )}

      {contact.notes && <p className="text-sm text-slate-600 dark:text-slate-300">{contact.notes}</p>}

      {contact.sharedWith && contact.sharedWith.length > 0 && (
        <div className="flex items-center gap-2">
          <CollaboratorStack uids={contact.sharedWith} />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {contact.sharedWith.length} collaborator{contact.sharedWith.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
        {contact.lastContactedAt && (
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">Last visit</p>
            <p>{format(new Date(contact.lastContactedAt), 'MMM d')}</p>
          </div>
        )}
        {contact.nextVisitAt && (
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">Next visit</p>
            <p>{format(new Date(contact.nextVisitAt), 'MMM d, h:mm a')}</p>
          </div>
        )}
      </div>

      {contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {contact.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

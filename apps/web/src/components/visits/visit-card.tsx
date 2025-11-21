import { format } from 'date-fns'
import { Edit2, Trash2, MessageSquare, Heart, Hand, Coffee, Brain } from 'lucide-react'
import type { Lesson } from '@taskcalendar/core'
import { VISIT_TYPE_LABELS } from '@taskcalendar/core'

import { CollaboratorStack } from '@/components/collaborators/collaborator-stack'

type VisitCardProps = {
    visit: Lesson
    contactName: string
    onEdit?: () => void
    onDelete?: () => void
}

const TYPE_ICONS: Record<Lesson['type'], React.ElementType> = {
    social: Coffee,
    spiritual: Heart,
    service: Hand,
    casual: MessageSquare,
    deep: Brain,
}

const TYPE_COLORS: Record<Lesson['type'], string> = {
    social: 'text-amber-600 bg-amber-50',
    spiritual: 'text-violet-600 bg-violet-50',
    service: 'text-emerald-600 bg-emerald-50',
    casual: 'text-sky-600 bg-sky-50',
    deep: 'text-rose-600 bg-rose-50',
}

export function VisitCard({ visit, contactName, onEdit, onDelete }: VisitCardProps) {
    const Icon = TYPE_ICONS[visit.type]
    const colorClass = TYPE_COLORS[visit.type]

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this visit record?')) {
            onDelete?.()
        }
    }

    return (
        <div className="group relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Visit with {contactName}</h3>
                        <p className="text-xs text-slate-500">
                            {format(new Date(visit.taughtAt), 'MMM d, yyyy • h:mm a')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            title="Edit visit"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={handleDelete}
                            className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete visit"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="ml-13 pl-1">
                <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}>
                    {VISIT_TYPE_LABELS[visit.type]}
                </span>

                {visit.notes && <p className="mt-2 text-sm text-slate-600">{visit.notes}</p>}

                {visit.commitments && visit.commitments.length > 0 && (
                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Next Steps</p>
                        <ul className="space-y-1">
                            {visit.commitments.map((commitment, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-400" />
                                    {commitment}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {visit.sharedWith && visit.sharedWith.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                        <CollaboratorStack uids={visit.sharedWith} />
                        <p className="text-xs font-semibold text-slate-500">
                            {visit.sharedWith.length} collaborator{visit.sharedWith.length > 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

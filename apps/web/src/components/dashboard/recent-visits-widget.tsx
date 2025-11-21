import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, Coffee, Heart, Hand, MessageSquare, Brain } from 'lucide-react'
import type { Lesson } from '@taskcalendar/core'
import { VISIT_TYPE_LABELS } from '@taskcalendar/core'

type RecentVisitsWidgetProps = {
    visits: Lesson[]
    contacts: { id: string; name: string }[]
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

export function RecentVisitsWidget({ visits, contacts }: RecentVisitsWidgetProps) {
    const getContactName = (id: string) =>
        contacts.find((c) => c.id === id)?.name ?? 'Unknown Person'

    const recentVisits = [...visits]
        .sort((a, b) => new Date(b.taughtAt).getTime() - new Date(a.taughtAt).getTime())
        .slice(0, 3)

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-500">Recent Visits</p>
                <a href="/lessons" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                    View all <ArrowRight className="h-3 w-3" />
                </a>
            </div>

            <div className="mt-4 space-y-4">
                {recentVisits.length === 0 ? (
                    <p className="text-sm text-slate-500">No visits logged yet.</p>
                ) : (
                    recentVisits.map((visit) => {
                        const Icon = TYPE_ICONS[visit.type]
                        const colorClass = TYPE_COLORS[visit.type]

                        return (
                            <div key={visit.id} className="flex gap-3">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="truncate text-sm font-medium text-slate-900">
                                            {getContactName(visit.contactId)}
                                        </p>
                                        <span className="text-xs text-slate-500">
                                            {formatDistanceToNow(new Date(visit.taughtAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {VISIT_TYPE_LABELS[visit.type]}
                                        {visit.notes && ` • ${visit.notes}`}
                                    </p>
                                    {visit.commitments && visit.commitments.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            {visit.commitments.map((step, i) => (
                                                <span key={i} className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                                    {step}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

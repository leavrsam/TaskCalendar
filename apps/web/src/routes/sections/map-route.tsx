import { GlobalMap } from '@/components/map/global-map'
import { useContactsQuery } from '@/features/contacts/api'
import { useTasksQuery } from '@/features/tasks/api'

export function MapRoute() {
    const contactsQuery = useContactsQuery()
    const tasksQuery = useTasksQuery()

    const contacts = contactsQuery.data ?? []
    const tasks = tasksQuery.data ?? []

    return (
        <div className="space-y-6">
            <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Slice 7</p>
                <h1 className="text-2xl font-semibold text-slate-900">Global Map</h1>
                <p className="text-sm text-slate-600">
                    Visualize your area. See where your contacts live and what tasks are nearby.
                </p>
            </header>

            <GlobalMap contacts={contacts} tasks={tasks} />
        </div>
    )
}

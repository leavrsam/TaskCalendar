import { GlobalMap } from '@/components/map/global-map'
import { useContactsQuery } from '@/features/contacts/api'
import { useTasksQuery } from '@/features/tasks/api'

export function MapRoute() {
    const contactsQuery = useContactsQuery()
    const tasksQuery = useTasksQuery()

    const contacts = contactsQuery.data ?? []
    const tasks = tasksQuery.data ?? []

    return (
        <div className="h-full w-full">
            <GlobalMap contacts={contacts} tasks={tasks} />
        </div>
    )
}

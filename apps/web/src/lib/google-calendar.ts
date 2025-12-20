import type { TaskEvent } from '@/features/tasks/api'
import type { Task } from '@taskcalendar/core'

const GCAL_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export async function fetchGoogleEvents(accessToken: string, timeMin: string, timeMax: string): Promise<TaskEvent[]> {
    const url = new URL(GCAL_API_BASE)
    url.searchParams.append('timeMin', timeMin)
    url.searchParams.append('timeMax', timeMax)
    url.searchParams.append('singleEvents', 'true')
    url.searchParams.append('orderBy', 'startTime')

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Unauthorized: Token expired')
        }
        throw new Error('Failed to fetch Google Calendar events')
    }

    const data = await response.json()

    return (data.items || []).map((item: any) => {
        const start = item.start.dateTime ? new Date(item.start.dateTime) : new Date(item.start.date) // Handle all-day
        const end = item.end.dateTime ? new Date(item.end.dateTime) : new Date(item.end.date)
        const isAllDay = !item.start.dateTime

        // Map to TaskEvent compatible structure
        // We create a "Virtual" Task for display
        const mockTask: Task = {
            id: `gcal-${item.id}`,
            ownerUid: 'google',
            title: item.summary || '(No Title)',
            status: 'todo', // GCal doesn't have status same way, maybe use transparent/confirmed?
            priority: 'medium',
            createdAt: item.created,
            updatedAt: item.updated,
            scheduledStart: start.toISOString(),
            scheduledEnd: end.toISOString(),
            isAllDay,
            location: item.location ? { lat: 0, lng: 0 } : undefined,
            address: item.location,
            notes: item.description,
            recurrence: null, // Expanded by singleEvents=true
            sharedWith: [],
            isBackup: true,
            contactIds: [],
            dueAt: null,
            assignedTo: [],
            isRecurringInstance: false,
            isModified: false,
        }

        return {
            id: mockTask.id,
            title: mockTask.title,
            start,
            end,
            resource: mockTask,
            allDay: isAllDay,
        }
    })
}

export async function createGoogleEvent(accessToken: string, event: Partial<Task>) {
    const resource = {
        summary: event.title,
        description: event.notes,
        location: event.address,
        start: {
            dateTime: event.scheduledStart, // ISO string
            // For all day: date: 'YYYY-MM-DD'
        },
        end: {
            dateTime: event.scheduledEnd,
        },
    }

    // Handle All Day logic if passed
    if (event.isAllDay && event.scheduledStart) {
        // substring(0, 10) for YYYY-MM-DD
        // @ts-ignore
        resource.start = { date: event.scheduledStart.substring(0, 10) }
        // @ts-ignore
        resource.end = { date: event.scheduledEnd ? event.scheduledEnd.substring(0, 10) : event.scheduledStart.substring(0, 10) }
    }

    const response = await fetch(GCAL_API_BASE, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(resource),
    })

    if (!response.ok) {
        throw new Error('Failed to create event in Google Calendar')
    }

    return await response.json()
}

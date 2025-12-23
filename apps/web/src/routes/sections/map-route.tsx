import { useState } from 'react'
import { GlobalMap } from '@/components/map/global-map'
import { useContactsQuery, useCreateContact, useDeleteContact } from '@/features/contacts/api'
import { useTasksQuery, useCreateTask, type TaskEvent } from '@/features/tasks/api'
import { CreationModal } from '@/components/calendar/creation-modal'
import { EventActionSheet } from '@/routes/sections/event-action-sheet'
import { LocationNameModal } from '@/components/map/location-name-modal'
import type { Task } from '@taskcalendar/core'

export function MapRoute() {
    const contactsQuery = useContactsQuery()
    const tasksQuery = useTasksQuery()
    const createTask = useCreateTask()
    const createContact = useCreateContact()
    const deleteContact = useDeleteContact()

    // Creation Modal State
    const [isCreationModalOpen, setIsCreationModalOpen] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | undefined>(undefined)

    // Edit Event State
    const [editEvent, setEditEvent] = useState<TaskEvent | null>(null)

    // Location Creation State
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
    const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null)

    // Map Draft State (Lifted from GlobalMap)
    const [draftPosition, setDraftPosition] = useState<{ lat: number; lng: number } | null>(null)

    const contacts = contactsQuery.data ?? []
    const tasks = tasksQuery.data ?? []

    const handleCreateEvent = (lat: number, lng: number) => {
        setSelectedLocation({ lat, lng })
        setIsCreationModalOpen(true)
    }

    const handleCreateLocation = (lat: number, lng: number) => {
        setPendingLocation({ lat, lng })
        setIsLocationModalOpen(true)
    }

    const handleSaveEvent = async (data: any) => {
        await createTask.mutateAsync({
            ...data,
            scheduledStart: data.scheduledStart,
            scheduledEnd: data.scheduledEnd,
        })
        setIsCreationModalOpen(false)
        setSelectedLocation(undefined)
        setDraftPosition(null) // Clear draft pin
    }

    const handleSaveLocation = async (name: string) => {
        if (pendingLocation) {
            await createContact.mutateAsync({
                name,
                stage: 'new',
                location: pendingLocation,
                address: `${pendingLocation.lat.toFixed(4)}, ${pendingLocation.lng.toFixed(4)}`,
                tags: ['pinned-location'], // Tag as location pin
                goals: [],
                sharedWith: [],
                lastContactedAt: new Date().toISOString(),
                nextVisitAt: null, // Pins don't need next visit
                notes: '',
                isFavorite: false,
            })
            setIsLocationModalOpen(false)
            setPendingLocation(null)
            setDraftPosition(null) // Clear draft pin
        }
    }

    const handleDeleteLocation = async (id: string) => {
        await deleteContact.mutateAsync(id)
    }

    // Helper to wrap raw Task into TaskEvent for the sheet
    const handleEditEvent = (task: Task) => {
        const taskEvent: TaskEvent = {
            id: task.id,
            title: task.title,
            start: new Date(task.scheduledStart || new Date()),
            end: new Date(task.scheduledEnd || new Date()),
            resource: task
        }
        setEditEvent(taskEvent)
    }

    return (
        <div className="h-full w-full relative">
            <GlobalMap
                contacts={contacts}
                tasks={tasks}
                draftPosition={draftPosition}
                onDraftLocationChange={setDraftPosition}
                onCreateEvent={handleCreateEvent}
                onCreateLocation={handleCreateLocation}
                onDeleteLocation={handleDeleteLocation}
                onEditEvent={handleEditEvent}
            />

            {isCreationModalOpen && (
                <CreationModal
                    onClose={() => {
                        setIsCreationModalOpen(false)
                        setSelectedLocation(undefined)
                    }}
                    onSave={handleSaveEvent}
                    defaultLocation={selectedLocation}
                />
            )}

            {editEvent && (
                <EventActionSheet
                    event={editEvent}
                    onClose={() => setEditEvent(null)}
                />
            )}

            {isLocationModalOpen && (
                <LocationNameModal
                    onClose={() => {
                        setIsLocationModalOpen(false)
                        setPendingLocation(null)
                    }}
                    onSave={handleSaveLocation}
                />
            )}
        </div>
    )
}

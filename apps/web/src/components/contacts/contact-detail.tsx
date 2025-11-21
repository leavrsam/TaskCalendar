import { useState } from 'react'
import { format } from 'date-fns'
import { User, Calendar, CheckCircle2, Clock, Plus, CalendarPlus } from 'lucide-react'
import type { Contact } from '@taskcalendar/core'

import { useTasksQuery, useCreateTask } from '@/features/tasks/api'
import { useLessonsQuery, useCreateVisit } from '@/features/lessons/api'
import { TaskCard } from '@/components/tasks/task-card'
import { CreationModal } from '@/components/calendar/creation-modal'
import { VisitForm } from '@/components/visits/visit-form'
import { useToast } from '@/hooks/use-toast'

type ContactDetailProps = {
    contact: Contact
    onClose: () => void
}

export function ContactDetail({ contact, onClose }: ContactDetailProps) {
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false)

    const tasksQuery = useTasksQuery()
    const lessonsQuery = useLessonsQuery()
    const createTask = useCreateTask()
    const createVisit = useCreateVisit()
    const { success: showSuccessToast } = useToast()

    const tasks = tasksQuery.data ?? []
    const lessons = lessonsQuery.data ?? []

    // Filter tasks related to this contact
    const contactTasks = tasks.filter((task) => task.contactId === contact.id)

    // Filter lessons related to this contact
    const contactLessons = lessons.filter((lesson) => lesson.contactId === contact.id)

    // Combine and sort by date
    const timeline = [
        ...contactTasks.map((task) => ({
            type: 'task' as const,
            date: task.scheduledStart || task.dueAt || task.createdAt,
            data: task,
        })),
        ...contactLessons.map((lesson) => ({
            type: 'lesson' as const,
            date: lesson.taughtAt,
            data: lesson,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const handleCreateTask = async (values: any) => {
        await createTask.mutateAsync({
            ...values,
            scheduledStart: new Date().toISOString(),
            scheduledEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        showSuccessToast({ title: 'Task created', description: 'Added to your schedule.' })
        setIsTaskModalOpen(false)
    }

    const handleCreateVisit = async (data: any) => {
        await createVisit.mutateAsync(data)
        showSuccessToast({ title: 'Visit logged', description: 'Added to timeline.' })
        setIsVisitModalOpen(false)
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 py-6 md:items-center"
            onClick={onClose}
        >
            <div
                className="flex h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900">{contact.name}</h2>
                            <p className="text-sm text-slate-500 capitalize">{contact.stage}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsVisitModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                        >
                            <CalendarPlus className="h-4 w-4 text-slate-500" />
                            Log Visit
                        </button>
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
                        >
                            <Plus className="h-4 w-4" />
                            Add Task
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="ml-2 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="border-b border-slate-200 p-6">
                    <div className="grid gap-3 text-sm">
                        {contact.phone && (
                            <div>
                                <span className="font-semibold text-slate-700">Phone:</span>{' '}
                                <a href={`tel:${contact.phone}`} className="text-brand-600 hover:underline">
                                    {contact.phone}
                                </a>
                            </div>
                        )}
                        {contact.email && (
                            <div>
                                <span className="font-semibold text-slate-700">Email:</span>{' '}
                                <a href={`mailto:${contact.email}`} className="text-brand-600 hover:underline">
                                    {contact.email}
                                </a>
                            </div>
                        )}
                        {contact.address && (
                            <div>
                                <span className="font-semibold text-slate-700">Address:</span>{' '}
                                <span className="text-slate-600">{contact.address}</span>
                            </div>
                        )}
                        {contact.notes && (
                            <div>
                                <span className="font-semibold text-slate-700">Notes:</span>{' '}
                                <p className="mt-1 text-slate-600">{contact.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">Activity Timeline</h3>

                    {timeline.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                            <Calendar className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="mt-2 text-sm text-slate-500">
                                No activities yet. Create a task or lesson to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {timeline.map((item, index) => (
                                <div key={index} className="border-l-2 border-slate-200 pl-4">
                                    {item.type === 'task' ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>Task</span>
                                                {item.date && (
                                                    <span>• {format(new Date(item.date), 'MMM d, yyyy h:mm a')}</span>
                                                )}
                                            </div>
                                            <TaskCard task={item.data} />
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Clock className="h-4 w-4" />
                                                <span>Visit</span>
                                                <span>• {format(new Date(item.date), 'MMM d, yyyy h:mm a')}</span>
                                            </div>
                                            <p className="mt-2 text-sm font-semibold text-slate-900 capitalize">
                                                {item.data.type} visit
                                            </p>
                                            {item.data.notes && (
                                                <p className="mt-1 text-sm text-slate-600">{item.data.notes}</p>
                                            )}
                                            {item.data.commitments && item.data.commitments.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-semibold text-slate-700">Commitments:</p>
                                                    <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                                                        {item.data.commitments.map((commitment, i) => (
                                                            <li key={i}>{commitment}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isTaskModalOpen && (
                <CreationModal
                    defaultContactId={contact.id}
                    onClose={() => setIsTaskModalOpen(false)}
                    onSave={handleCreateTask}
                />
            )}

            {isVisitModalOpen && (
                <VisitForm
                    title="Log Visit"
                    contacts={[contact]}
                    onClose={() => setIsVisitModalOpen(false)}
                    onSubmit={handleCreateVisit}
                />
            )}
        </div>
    )
}

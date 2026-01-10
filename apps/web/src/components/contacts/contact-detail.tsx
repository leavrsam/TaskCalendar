import { useState } from 'react'
import { format } from 'date-fns'
import { User, Calendar, CheckCircle2, Clock, Plus, CalendarPlus, Target, Check, MessageSquare, Send, Trash2 } from 'lucide-react'
import type { Contact } from '@taskcalendar/core'

import { useTasksQuery } from '@/features/tasks/api'
import { useVisitsQuery, useCreateVisit } from '@/features/visits/api'
import { useContactNotesQuery, useCreateContactNote, useDeleteContactNote } from '@/features/contact-notes/api'
import { TaskCard } from '@/components/tasks/task-card'
import { EventModal } from '@/components/calendar/event-modal'
import { VisitForm } from '@/components/visits/visit-form'
import { GoalProgressPopup } from '@/components/contacts/goal-progress-popup'
import { useToast } from '@/hooks/use-toast'

type ContactDetailProps = {
    contact: Contact
    onClose: () => void
}

export function ContactDetail({ contact, onClose }: ContactDetailProps) {
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false)
    const [showGoalsPopup, setShowGoalsPopup] = useState(false)
    const [newNote, setNewNote] = useState('')
    const [isAddingNote, setIsAddingNote] = useState(false)

    const tasksQuery = useTasksQuery()
    const visitsQuery = useVisitsQuery()
    const notesQuery = useContactNotesQuery(contact.id)
    // const createTask = useCreateTask() // Removed, handled by EventModal
    const createVisit = useCreateVisit()
    const createNote = useCreateContactNote()
    const deleteNote = useDeleteContactNote()
    const { success: showSuccessToast } = useToast()

    const tasks = tasksQuery.data ?? []
    const visits = visitsQuery.data ?? []
    const notes = notesQuery.data ?? []

    // Filter tasks related to this contact (check both legacy contactId and contactIds array)
    const contactTasks = tasks.filter((task) =>
        task.contactId === contact.id ||
        (task.contactIds && task.contactIds.includes(contact.id))
    )

    // Filter visits related to this contact
    const contactVisits = visits.filter((visit) => visit.contactId === contact.id)

    // Combine and sort by date (tasks, visits, and notes)
    const timeline = [
        ...contactTasks.map((task) => ({
            type: 'task' as const,
            date: task.scheduledStart || task.dueAt || task.createdAt,
            data: task,
        })),
        ...contactVisits.map((visit) => ({
            type: 'visit' as const,
            date: visit.visitedAt,
            data: visit,
        })),
        ...notes.map((note) => ({
            type: 'note' as const,
            date: note.createdAt,
            data: note,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const handleAddNote = async () => {
        if (!newNote.trim()) return
        setIsAddingNote(true)
        try {
            await createNote.mutateAsync({ contactId: contact.id, content: newNote.trim() })
            setNewNote('')
            showSuccessToast({ title: 'Note added', description: 'Added to timeline.' })
        } finally {
            setIsAddingNote(false)
        }
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
                className="flex h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{contact.name}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                                {contact.tags && contact.tags.length > 0
                                    ? contact.tags.join(', ')
                                    : contact.stage}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsVisitModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
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
                <div className="border-b border-slate-200 dark:border-slate-800 p-6">
                    <div className="grid gap-3 text-sm">
                        {contact.phone && (
                            <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Phone:</span>{' '}
                                <a href={`tel:${contact.phone}`} className="text-brand-600 hover:underline">
                                    {contact.phone}
                                </a>
                            </div>
                        )}
                        {contact.email && (
                            <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Email:</span>{' '}
                                <a href={`mailto:${contact.email}`} className="text-brand-600 hover:underline">
                                    {contact.email}
                                </a>
                            </div>
                        )}
                        {contact.address && (
                            <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Address:</span>{' '}
                                <span className="text-slate-600 dark:text-slate-400">{contact.address}</span>
                            </div>
                        )}
                        {contact.birthday && (
                            <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Birthday:</span>{' '}
                                <span className="text-slate-600 dark:text-slate-400">
                                    {new Date(contact.birthday + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                        )}
                        {contact.notes && (
                            <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Notes:</span>{' '}
                                <p className="mt-1 text-slate-600 dark:text-slate-400">{contact.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Goals Section */}
                <div className="border-b border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                            <Target className="h-4 w-4 text-brand-500" />
                            Goals
                        </h3>
                        <button
                            onClick={() => setShowGoalsPopup(true)}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                            View All
                        </button>
                    </div>
                    {contact.goals && contact.goals.length > 0 ? (
                        <div className="space-y-2">
                            {contact.goals.slice(0, 3).map((goal) => (
                                <div key={goal.id} className="flex items-center gap-2 text-sm">
                                    <div className={`flex-shrink-0 h-4 w-4 rounded-full border flex items-center justify-center ${goal.isCompleted
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                        {goal.isCompleted && <Check className="h-2.5 w-2.5" />}
                                    </div>
                                    <span className={goal.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}>
                                        {goal.title}
                                    </span>
                                    {goal.subGoals.length > 0 && (
                                        <span className="text-xs text-slate-400">
                                            ({goal.subGoals.filter(sg => sg.isCompleted).length}/{goal.subGoals.length})
                                        </span>
                                    )}
                                </div>
                            ))}
                            {contact.goals.length > 3 && (
                                <p className="text-xs text-slate-400">+{contact.goals.length - 3} more goals</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400">No goals set. Click "View All" to add some!</p>
                    )}
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">Activity Timeline</h3>

                    {/* Add Note Form */}
                    <div className="mb-4 flex gap-2">
                        <input
                            type="text"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                            placeholder="Add a note..."
                            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                        <button
                            onClick={handleAddNote}
                            disabled={isAddingNote || !newNote.trim()}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>

                    {timeline.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                            <Calendar className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="mt-2 text-sm text-slate-500">
                                No activities yet. Create a task or visit to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {timeline.map((item, index) => (
                                <div key={index} className="border-l-2 border-slate-200 dark:border-slate-800 pl-4">
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
                                    ) : item.type === 'visit' ? (
                                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
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
                                    ) : (
                                        <div className="group rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <MessageSquare className="h-4 w-4" />
                                                    <span>Note</span>
                                                    <span>• {format(new Date(item.date), 'MMM d, yyyy h:mm a')}</span>
                                                </div>
                                                <button
                                                    onClick={() => deleteNote.mutate({ noteId: item.data.id, contactId: contact.id })}
                                                    className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                    title="Delete note"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <p className="mt-2 text-sm text-slate-900 dark:text-slate-50">{item.data.content}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isTaskModalOpen && (
                <EventModal
                    isOpen={true}
                    defaultContactId={contact.id}
                    onClose={() => setIsTaskModalOpen(false)}
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

            {showGoalsPopup && (
                <GoalProgressPopup
                    contact={contact}
                    onClose={() => setShowGoalsPopup(false)}
                />
            )}
        </div>
    )
}

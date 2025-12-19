import React, { useState, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { Trash2, Save, X, Target, ChevronDown } from 'lucide-react'
import { AnimatedSheet } from '@/components/ui/animated-sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
    useUpdateTask,
    useDeleteTask,
    useUpdateRecurringInstance,
    useUpdateRecurringSeriesAll,
    useUpdateRecurringSeriesFuture,
    type TaskEvent
} from '@/features/tasks/api'
import { useContactsQuery } from '@/features/contacts/api'
import type { Task } from '@taskcalendar/core'
import { RecurrenceSelector } from '@/components/calendar/recurrence-selector'
import { EditRecurringEventModal, type EditScope } from '@/components/calendar/edit-recurring-event-modal'
import { ColorPicker } from '@/components/ui/color-picker'
import { LocationPicker } from '@/components/map/location-picker'
import { GoalProgressPopup } from '@/components/contacts/goal-progress-popup'

type EventActionSheetProps = {
    event: TaskEvent | null
    onClose: () => void
}

export function EventActionSheet({ event, onClose }: EventActionSheetProps) {
    const isDesktop = useMediaQuery('(min-width: 768px)')
    const updateTask = useUpdateTask()
    const deleteTask = useDeleteTask()
    const updateRecurringInstance = useUpdateRecurringInstance()
    const updateRecurringSeriesAll = useUpdateRecurringSeriesAll()
    const updateRecurringSeriesFuture = useUpdateRecurringSeriesFuture()
    const contactsQuery = useContactsQuery()

    const [localTask, setLocalTask] = useState<Task | null>(null)
    const [isDirty, setIsDirty] = useState(false)
    const [showScopeModal, setShowScopeModal] = useState(false)
    const [scopeAction, setScopeAction] = useState<'edit' | 'delete'>('edit')
    const [showGoalsPopup, setShowGoalsPopup] = useState(false)
    const [goalsContactId, setGoalsContactId] = useState<string | null>(null)
    const [showContactsDropdown, setShowContactsDropdown] = useState(false)

    const contacts = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data])

    useEffect(() => {
        if (event) {
            setLocalTask(event.resource)
            setIsDirty(false)
        }
    }, [event])

    if (!event || !localTask) return null

    const task = localTask
    const isRecurring = !!(task.recurrence || task.recurringEventId)
    const taskContactIds = task.contactIds || (task.contactId ? [task.contactId] : [])
    const selectedContacts = contacts.filter(c => taskContactIds.includes(c.id))

    // Format dates for input (YYYY-MM-DDThh:mm or YYYY-MM-DD)
    const formatDateForInput = (dateStr: string | null | undefined, isDateOnly: boolean) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        if (isDateOnly) {
            return date.toISOString().slice(0, 10)
        }
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
    }

    const handleUpdate = (updates: Partial<Task>) => {
        const updatedTask = { ...task, ...updates }
        setLocalTask(updatedTask)

        if (isRecurring) {
            setIsDirty(true)
        } else {
            updateTask.mutate({
                id: task.id,
                data: updates,
            })
        }
    }

    const handleStatusChange = (e: React.MouseEvent, status: Task['status']) => {
        e.stopPropagation()
        handleUpdate({ status })
    }

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isRecurring) {
            setScopeAction('delete')
            setShowScopeModal(true)
        } else {
            deleteTask.mutate(task.id)
            onClose()
        }
    }

    const handleTimeChange = (field: 'scheduledStart' | 'scheduledEnd', value: string) => {
        let dateStr = value
        if (task.isAllDay) {
            // If all day, append time to ensure correct date is saved
            // Start of day for start, end of day for end
            if (field === 'scheduledStart') dateStr = `${value}T00:00:00.000Z`
            if (field === 'scheduledEnd') dateStr = `${value}T23:59:59.999Z`
        } else {
            const date = new Date(value)
            dateStr = date.toISOString()
        }

        handleUpdate({ [field]: dateStr })
    }

    const handleColorChange = (color: string) => {
        handleUpdate({ color })
    }

    const toggleAllDay = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation()
        handleUpdate({ isAllDay: e.target.checked })
    }

    const handleScopeConfirm = (scope: EditScope) => {
        setShowScopeModal(false)

        if (scopeAction === 'delete') {
            // Handle delete logic
            if (scope === 'this') {
                if (!task.id.includes('-')) {
                    deleteTask.mutate(task.id)
                }
            } else if (scope === 'following') {
                // Not implemented
            } else if (scope === 'all') {
                // Delete parent
                const parentId = task.recurringEventId || task.id
                deleteTask.mutate(parentId)
            }
            onClose()
            return
        }

        // Handle edit logic
        const data = {
            title: task.title,
            status: task.status,
            priority: task.priority,
            notes: task.notes,
            scheduledStart: task.scheduledStart,
            scheduledEnd: task.scheduledEnd,
            isAllDay: task.isAllDay,
            isBackup: task.isBackup,
            color: task.color,
            address: task.address,
            location: task.location,
            recurrence: task.recurrence,
        }

        if (scope === 'this') {
            updateRecurringInstance.mutate({
                id: task.id,
                data,
                originalTask: event.resource
            })
        } else if (scope === 'following') {
            updateRecurringSeriesFuture.mutate({
                id: task.id,
                data,
                originalTask: event.resource,
                date: new Date(task.scheduledStart!)
            })
        } else if (scope === 'all') {
            updateRecurringSeriesAll.mutate({
                id: task.id,
                data,
                recurringEventId: task.recurringEventId
            })
        }

        setIsDirty(false)
    }

    return (
        <AnimatedSheet
            isOpen={!!event}
            onClose={onClose}
            side={isDesktop ? 'right' : 'bottom'}
            className={clsx(
                "flex flex-col overflow-hidden",
                isDesktop ? "h-full" : "max-h-[96vh]"
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-6 dark:border-slate-800">
                <div className="w-full pr-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Event Details</p>
                    <input
                        value={task.title}
                        onChange={(e) => handleUpdate({ title: e.target.value })}
                        className="mt-1 w-full bg-transparent text-xl font-semibold text-slate-900 focus:outline-none focus:ring-0 dark:text-slate-50"
                        placeholder="Event title"
                    />
                </div>
                <div className="flex items-center gap-1">
                    {isDirty && (
                        <button
                            type="button"
                            onClick={() => {
                                setScopeAction('edit')
                                setShowScopeModal(true)
                            }}
                            className="flex items-center gap-1 rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 mr-2"
                        >
                            <Save className="h-3 w-3" />
                            Save
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Time Controls */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-200">Date & Time</h4>
                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <input
                                type="checkbox"
                                checked={task.isAllDay}
                                onChange={toggleAllDay}
                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            All day
                        </label>
                    </div>

                    <div className="grid gap-4">
                        {/* Start */}
                        <div className="grid grid-cols-[1fr,auto] gap-3">
                            <div>
                                <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500">Start</label>
                                <input
                                    type="date"
                                    value={formatDateForInput(task.scheduledStart, true)}
                                    onChange={(e) => {
                                        const newDate = e.target.value
                                        const current = new Date(task.scheduledStart as string)
                                        const timePart = current.toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5)
                                        handleTimeChange('scheduledStart', `${newDate}T${timePart} `)
                                    }}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                                />
                            </div>
                            {!task.isAllDay && (
                                <div className="w-24">
                                    <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500">&nbsp;</label>
                                    <input
                                        type="time"
                                        value={task.scheduledStart ? new Date(task.scheduledStart as string).toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5) : ''}
                                        onChange={(e) => {
                                            const newTime = e.target.value
                                            const datePart = formatDateForInput(task.scheduledStart, true)
                                            handleTimeChange('scheduledStart', `${datePart}T${newTime} `)
                                        }}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                                    />
                                </div>
                            )}
                        </div>

                        {/* End */}
                        <div className="grid grid-cols-[1fr,auto] gap-3">
                            <div>
                                <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500">End</label>
                                <input
                                    type="date"
                                    value={formatDateForInput(task.scheduledEnd, true)}
                                    onChange={(e) => {
                                        const newDate = e.target.value
                                        const current = new Date(task.scheduledEnd as string)
                                        const timePart = current.toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5)
                                        handleTimeChange('scheduledEnd', `${newDate}T${timePart} `)
                                    }}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                                />
                            </div>
                            {!task.isAllDay && (
                                <div className="w-24">
                                    <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500">&nbsp;</label>
                                    <input
                                        type="time"
                                        value={task.scheduledEnd ? new Date(task.scheduledEnd as string).toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5) : ''}
                                        onChange={(e) => {
                                            const newTime = e.target.value
                                            const datePart = formatDateForInput(task.scheduledEnd, true)
                                            handleTimeChange('scheduledEnd', `${datePart}T${newTime} `)
                                        }}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <RecurrenceSelector
                        scheduledStart={task.scheduledStart}
                        recurrence={task.recurrence}
                        onChange={(recurrence) => handleUpdate({ recurrence })}
                    />
                </div>

                {/* Status & Priority Grid */}
                <div className="grid grid-cols-2 gap-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Status</p>
                        <div className="flex flex-col gap-2">
                            {(['todo', 'inProgress', 'done'] as Task['status'][]).map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={(e) => handleStatusChange(e, status)}
                                    className={clsx(
                                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                                        task.status === status
                                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 font-medium'
                                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                                    )}
                                >
                                    <span className="capitalize">{status === 'inProgress' ? 'In Progress' : status}</span>
                                    {task.status === status && <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Color</p>
                        <ColorPicker value={task.color} onChange={handleColorChange} />
                    </div>
                </div>

                {/* Contact */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <label className="mb-2 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Contacts</label>
                    <div className="space-y-2">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowContactsDropdown(!showContactsDropdown)}
                                className="w-full flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-50"
                            >
                                <span className={taskContactIds.length === 0 ? 'text-slate-400' : ''}>
                                    {taskContactIds.length === 0 ? 'Select contacts...' : `${taskContactIds.length} selected`}
                                </span>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>
                            {showContactsDropdown && (
                                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                                    {contacts.length === 0 ? (
                                        <p className="px-4 py-3 text-sm text-slate-400">No contacts available</p>
                                    ) : (
                                        contacts.map((contact) => (
                                            <label
                                                key={contact.id}
                                                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={taskContactIds.includes(contact.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            handleUpdate({ contactIds: [...taskContactIds, contact.id] })
                                                        } else {
                                                            handleUpdate({ contactIds: taskContactIds.filter(id => id !== contact.id) })
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                />
                                                <span className="text-sm text-slate-900 dark:text-slate-50">{contact.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        {selectedContacts.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedContacts.map(contact => (
                                    <span
                                        key={contact.id}
                                        className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm"
                                    >
                                        <span className="whitespace-nowrap">{contact.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setGoalsContactId(contact.id)
                                                setShowGoalsPopup(true)
                                            }}
                                            className="p-1 rounded-full hover:bg-brand-200 dark:hover:bg-brand-800 transition-colors flex-shrink-0"
                                            title="View Goals"
                                        >
                                            <Target className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdate({ contactIds: taskContactIds.filter(id => id !== contact.id) })}
                                            className="p-1 rounded-full hover:bg-brand-200 dark:hover:bg-brand-800 transition-colors flex-shrink-0"
                                            title="Remove"
                                        >
                                            <span className="text-base leading-none">×</span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Location */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <label className="mb-2 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Location</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={task.address || ''}
                            onChange={(e) => handleUpdate({ address: e.target.value })}
                            placeholder="Add address or location..."
                            className="flex-1 rounded-xl border-none bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-brand-500/20"
                        />
                        <LocationPicker
                            value={task.location || null}
                            address={task.address}
                            onChange={(loc, addr) => {
                                handleUpdate({
                                    location: loc,
                                    address: addr !== undefined ? addr : task.address
                                })
                            }}
                        />
                    </div>
                </div>

                {/* Notes */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <label className="mb-2 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Notes</label>
                    <textarea
                        value={task.notes || ''}
                        onChange={(e) => {
                            handleUpdate({ notes: e.target.value })
                        }}
                        className="w-full rounded-xl border-none bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-brand-500/20 min-h-[100px] resize-none"
                        placeholder="Add notes about this event..."
                    />
                </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 p-4 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0 z-10 relative">
                <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors min-h-[48px]"
                >
                    <Trash2 className="h-5 w-5" />
                    Delete
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-all min-h-[48px]"
                >
                    Save
                </button>
            </div>

            {showScopeModal && (
                <EditRecurringEventModal
                    action={scopeAction}
                    onConfirm={handleScopeConfirm}
                    onCancel={() => setShowScopeModal(false)}
                />
            )}
            {showGoalsPopup && goalsContactId && (() => {
                const goalContact = contacts.find(c => c.id === goalsContactId)
                return goalContact ? (
                    <GoalProgressPopup
                        contact={goalContact}
                        onClose={() => {
                            setShowGoalsPopup(false)
                            setGoalsContactId(null)
                        }}
                    />
                ) : null
            })()}
        </AnimatedSheet>
    )
}

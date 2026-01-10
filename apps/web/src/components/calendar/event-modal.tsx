import { useState, useEffect, useRef } from 'react'

import { useCalendarStore } from '@/stores/calendar-store'
import type { Task } from '@taskcalendar/core'
import {
    useCreateTask,
    useUpdateTask,
    useDeleteTask,
    useUpdateRecurringInstance,
    useUpdateRecurringSeriesAll,
    useUpdateRecurringSeriesFuture,
    type TaskEvent
} from '@/features/tasks/api'
import { useContactsQuery } from '@/features/contacts/api'
import { RecurrenceSelector } from '@/components/calendar/recurrence-selector'
import { EditRecurringEventModal, type EditScope } from '@/components/calendar/edit-recurring-event-modal'
import { AnimatedModal } from '@/components/ui/animated-modal'
import { ColorPicker } from '@/components/ui/color-picker'
import { DatePicker } from '@/components/ui/date-picker'
import { CustomSelect } from '@/components/ui/custom-select'
import { TimeSelect } from '@/components/ui/time-select'

import { LocationPicker } from '@/components/map/location-picker'
import { GoalProgressPopup } from '@/components/contacts/goal-progress-popup'
import clsx from 'clsx'
import { ChevronDown, Trash2, Target } from 'lucide-react'
import { createGoogleEvent } from '@/lib/google-calendar'


type EventModalProps = {
    // Edit Mode
    event?: TaskEvent | null
    // Create Mode
    slot?: { start: Date; end: Date } | null
    defaultContactId?: string
    defaultLocation?: { lat: number; lng: number }

    isOpen: boolean
    onClose: () => void
}

export function EventModal({
    event,
    slot,
    defaultContactId,
    defaultLocation,
    isOpen,
    onClose
}: EventModalProps) {
    const contactsQuery = useContactsQuery()
    const googleAccessToken = useCalendarStore((state) => state.googleAccessToken)

    // Mutations
    const createTask = useCreateTask()
    const updateTask = useUpdateTask()
    const deleteTask = useDeleteTask()
    const updateRecurringInstance = useUpdateRecurringInstance()
    const updateRecurringSeriesAll = useUpdateRecurringSeriesAll()
    const updateRecurringSeriesFuture = useUpdateRecurringSeriesFuture()

    // Helper
    const toTimeValue = (d: Date) => {
        const h = d.getHours().toString().padStart(2, '0')
        const m = d.getMinutes().toString().padStart(2, '0')
        return `${h}:${m}`
    }

    // Default values
    const defaultStart = new Date()
    defaultStart.setMinutes(Math.ceil(defaultStart.getMinutes() / 15) * 15, 0, 0)
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000)

    const contacts = contactsQuery.data ?? []

    // State
    const [title, setTitle] = useState('')
    const [status, setStatus] = useState<Task['status']>('todo')
    const [priority, setPriority] = useState<Task['priority']>('medium')
    const [notes, setNotes] = useState('')
    const [color, setColor] = useState<string>('#039be5')
    const [contactIds, setContactIds] = useState<string[]>([])
    const [recurrence, setRecurrence] = useState<Task['recurrence']>(null)
    const [isAllDay, setIsAllDay] = useState(false)
    const [isBackup, setIsBackup] = useState(false)
    const [isTask, setIsTask] = useState(false)
    const [address, setAddress] = useState('')
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [reminders, setReminders] = useState<number[]>([]) // Minutes
    const [showContactDropdown, setShowContactDropdown] = useState(false)

    // Extra state for Edit Mode
    const [showScopeModal, setShowScopeModal] = useState(false)
    const [scopeAction, setScopeAction] = useState<'edit' | 'delete'>('edit')
    const [showGoalsPopup, setShowGoalsPopup] = useState(false)
    const [goalsContactId, setGoalsContactId] = useState<string | null>(null)

    const contactsWrapperRef = useRef<HTMLDivElement>(null)

    // Date/Time State
    const [startDate, setStartDate] = useState(defaultStart)
    const [endDate, setEndDate] = useState(defaultEnd)
    const [startTimeValue, setStartTimeValue] = useState("")
    const [endTimeValue, setEndTimeValue] = useState("")

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isEditMode = !!event

    // Initialization Effect
    useEffect(() => {
        if (event) {
            // Edit Mode
            const t = event.resource
            setTitle(t.title)
            setStatus(t.status)
            setPriority(t.priority)
            setNotes(t.notes || '')
            setColor(t.color || '#039be5')
            setContactIds(t.contactIds || (t.contactId ? [t.contactId] : []))
            setRecurrence(t.recurrence || null)
            setIsAllDay(t.isAllDay)
            setIsBackup(t.isBackup || false)
            setIsTask(t.isTask || false)
            setAddress(t.address || '')
            setLocation(t.location || null)
            setReminders(t.reminders || [])

            if (t.scheduledStart) {
                const s = new Date(t.scheduledStart)
                setStartDate(s)
                setStartTimeValue(toTimeValue(s))
            }
            if (t.scheduledEnd) {
                const e = new Date(t.scheduledEnd)
                setEndDate(e)
                setEndTimeValue(toTimeValue(e))
            }
        } else if (slot) {
            // Create Mode (from slot)
            setTitle('')
            setStatus('todo')
            setPriority('medium')
            setNotes('')
            setColor('#039be5')
            setContactIds(defaultContactId ? [defaultContactId] : [])
            setRecurrence(null)
            setIsAllDay(false) // Default to false unless slot assumes otherwise?
            setIsBackup(false)
            setIsTask(false)
            setAddress('')
            setLocation(defaultLocation ?? null)
            setReminders([])

            setStartDate(slot.start)
            setEndDate(slot.end)
            setStartTimeValue(toTimeValue(slot.start))
            setEndTimeValue(toTimeValue(slot.end))
        }
    }, [event, slot, defaultContactId, defaultLocation, isOpen])

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (contactsWrapperRef.current && !contactsWrapperRef.current.contains(event.target as Node)) {
                setShowContactDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside, true)
        document.addEventListener("touchstart", handleClickOutside, true)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside, true)
            document.removeEventListener("touchstart", handleClickOutside, true)
        }
    }, [])

    const handleStartTimeChange = (newTimeStr: string) => {
        setStartTimeValue(newTimeStr)
        if (!newTimeStr) return

        const [hours, minutes] = newTimeStr.split(':').map(Number)
        // Validation for manual entry
        if (isNaN(hours) || isNaN(minutes)) return

        const newStart = new Date(startDate)
        newStart.setHours(hours, minutes)
        setStartDate(newStart)

        // Ensure end time is at least equal or after
        if (newStart >= endDate) {
            const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000)
            setEndDate(newEnd)
            setEndTimeValue(toTimeValue(newEnd))
        }
    }

    const handleEndTimeChange = (newTimeStr: string) => {
        setEndTimeValue(newTimeStr)
        if (!newTimeStr) return

        const [hours, minutes] = newTimeStr.split(':').map(Number)
        // Validation for manual entry
        if (isNaN(hours) || isNaN(minutes)) return

        const newEnd = new Date(endDate)
        newEnd.setHours(hours, minutes)

        setEndDate(newEnd)
    }

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        try {
            // Prepare Data
            let finalStart = startDate
            let finalEnd = endDate
            if (isAllDay) {
                finalStart = new Date(startDate)
                finalStart.setHours(0, 0, 0, 0)
                finalEnd = new Date(endDate)
                finalEnd.setHours(23, 59, 59, 999)
            }

            const data = {
                title: title || '(No Title)',
                status,
                notes,
                priority,
                color,
                contactIds: contactIds, // Send array, let API handle it (or Firestore accepts empty array)
                recurrence,
                scheduledStart: finalStart.toISOString(),
                scheduledEnd: finalEnd.toISOString(),
                isAllDay,
                isBackup,
                isTask,
                address: address || '',
                location,
                reminders,
            }

            if (isEditMode && event) {
                // Edit Logic
                const task = event.resource
                const isRecurring = !!(task.recurrence || task.recurringEventId)

                if (isRecurring) {
                    setScopeAction('edit')
                    setShowScopeModal(true)
                    setSaving(false) // Defer saving until scope confirm
                    return
                }

                await updateTask.mutateAsync({
                    id: task.id,
                    data
                })
            } else {
                // Create Logic
                await createTask.mutateAsync({
                    ...data,
                    dueAt: data.scheduledEnd,
                })

                // Sync to Google
                if (googleAccessToken) {
                    try {
                        await createGoogleEvent(googleAccessToken, {
                            title: data.title,
                            notes: data.notes,
                            address: data.address,
                            scheduledStart: data.scheduledStart,
                            scheduledEnd: data.scheduledEnd,
                            isAllDay: data.isAllDay
                        })
                    } catch (err) {
                        console.error('Failed to sync to Google Calendar', err)
                    }
                }
            }
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error saving')
        } finally {
            if (!showScopeModal) setSaving(false)
        }
    }

    const handleDeleteClick = () => {
        if (!event) return
        const task = event.resource
        const isRecurring = !!(task.recurrence || task.recurringEventId)

        if (isRecurring) {
            setScopeAction('delete')
            setShowScopeModal(true)
        } else {
            // Native confirm can be flaky in some envs, and blocking.
            // For now, let's just delete (or we could add a custom confirm state later if needed)
            // But to be safe and fix the "nothing happens" issue:
            deleteTask.mutate(task.id)
            onClose()
        }
    }

    const handleScopeConfirm = (scope: EditScope) => {
        setShowScopeModal(false)
        if (!event) return

        const task = event.resource

        if (scopeAction === 'delete') {
            if (scope === 'this') {
                const isExpandedInstance = task.id.includes('-') && task.recurringEventId
                const targetId = isExpandedInstance ? task.recurringEventId! : task.id
                deleteTask.mutate(targetId)
            } else if (scope === 'following') {
                const parentId = task.recurringEventId || task.id
                deleteTask.mutate(parentId)
            } else if (scope === 'all') {
                const parentId = task.recurringEventId || task.id
                deleteTask.mutate(parentId)
            }
            onClose()
            return
        }

        // Edit Scope
        // Prepare Data again (duplicate from handleSave, maybe refactor)
        let finalStart = startDate
        let finalEnd = endDate
        if (isAllDay) {
            finalStart = new Date(startDate)
            finalStart.setHours(0, 0, 0, 0)
            finalEnd = new Date(endDate)
            finalEnd.setHours(23, 59, 59, 999)
        }

        const data = {
            title: title || '(No Title)',
            status,
            priority,
            notes,
            scheduledStart: finalStart.toISOString(),
            scheduledEnd: finalEnd.toISOString(),
            isAllDay,
            isBackup,
            isTask,
            color,
            address: address || undefined,
            location,
            recurrence,
            reminders,
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
                date: new Date(startDate)
            })
        } else if (scope === 'all') {
            updateRecurringSeriesAll.mutate({
                id: task.id,
                data,
                recurringEventId: task.recurringEventId
            })
        }

        setSaving(false)
        onClose()
    }



    return (
        <AnimatedModal
            isOpen={isOpen}
            onClose={onClose}
            layoutId={slot ? `slot-${slot.start.toISOString()}` : event ? `event-${event.id}` : undefined}
            className="w-full max-w-md rounded-t-2xl md:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[85vh] p-0"
        >
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Title Input */}
                <div>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-transparent text-2xl font-bold text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none"
                        placeholder="Add title"
                        autoFocus={!isEditMode}
                    />
                    {event?.resource.calendarEmail && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            <span>Connected to: {event.resource.calendarEmail}</span>
                        </div>
                    )}
                </div>

                {/* Date & Time Row */}
                <div className="flex flex-col gap-3">
                    {/* Toggles Row */}
                    <div className="flex items-center gap-6">
                        {/* All Day Toggle */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAllDay(!isAllDay)}
                                className={clsx(
                                    "relative flex h-6 w-11 items-center rounded-full transition-colors",
                                    isAllDay ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-700"
                                )}
                            >
                                <span
                                    className={clsx(
                                        "h-5 w-5 rounded-full bg-white shadow transition-transform",
                                        isAllDay ? "translate-x-5" : "translate-x-0.5"
                                    )}
                                />
                            </button>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">All day</span>
                        </div>

                        {/* Backup Toggle */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsBackup(!isBackup)}
                                className={clsx(
                                    "relative flex h-6 w-11 items-center rounded-full transition-colors",
                                    isBackup ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"
                                )}
                            >
                                <span
                                    className={clsx(
                                        "h-5 w-5 rounded-full bg-white shadow transition-transform",
                                        isBackup ? "translate-x-5" : "translate-x-0.5"
                                    )}
                                />
                            </button>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Backup</span>
                        </div>

                        {/* Task Toggle */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsTask(!isTask)}
                                className={clsx(
                                    "relative flex h-6 w-11 items-center rounded-full transition-colors",
                                    isTask ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"
                                )}
                            >
                                <span
                                    className={clsx(
                                        "h-5 w-5 rounded-full bg-white shadow transition-transform",
                                        isTask ? "translate-x-5" : "translate-x-0.5"
                                    )}
                                />
                            </button>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Task</span>
                        </div>
                    </div>

                    {/* Date Pickers Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Start Date Picker */}
                        <div className="flex-1">
                            <DatePicker
                                value={startDate}
                                onChange={(date) => {
                                    // Preserve time, update date
                                    const newStart = new Date(startDate)
                                    newStart.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())

                                    setStartDate(newStart)

                                    if (isAllDay && newStart > endDate) {
                                        setEndDate(new Date(newStart))
                                    } else if (!isAllDay) {
                                        const newEnd = new Date(endDate)
                                        newEnd.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
                                        setEndDate(newEnd)
                                    }
                                }}
                            />
                        </div>

                        {/* Time Dropdowns (hidden if all-day) */}
                        {!isAllDay && (
                            <div className="flex items-center gap-2 flex-1">
                                <div className="flex-1">
                                    <TimeSelect
                                        value={startTimeValue}
                                        onChange={handleStartTimeChange}
                                        placeholder="Start"
                                    />
                                </div>
                                <span className="text-slate-400 font-medium">-</span>
                                <div className="flex-1">
                                    <TimeSelect
                                        value={endTimeValue}
                                        onChange={handleEndTimeChange}
                                        placeholder="End"
                                    />
                                </div>
                            </div>
                        )}

                        {/* End Date Picker (shown if all-day for multi-day events) */}
                        {isAllDay && (
                            <>
                                <span className="text-slate-400 font-medium self-center">to</span>
                                <div className="flex-1">
                                    <DatePicker
                                        value={endDate}
                                        onChange={(date) => {
                                            const newEnd = new Date(date)
                                            if (newEnd < startDate) {
                                                setEndDate(new Date(startDate))
                                            } else {
                                                setEndDate(newEnd)
                                            }
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Status - Only show if Task */}
                    {isTask && (
                        <div className="flex w-full rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                            {(['todo', 'inProgress', 'done'] as const).map((s) => (
                                <div key={s} className="flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setStatus(s)}
                                        className={clsx(
                                            "w-full rounded-lg py-1.5 text-xs font-medium capitalize transition-all",
                                            status === s
                                                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                                        )}
                                    >
                                        {s === 'inProgress' ? 'In Progress' : s}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Priority Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
                        {(['low', 'medium', 'high'] as const).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPriority(p)}
                                className={clsx(
                                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
                                    priority === p
                                        ? "bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/30 dark:border-brand-800 dark:text-brand-300"
                                        : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400"
                                )}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)} Priority
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <RecurrenceSelector
                                    scheduledStart={startDate.toISOString()}
                                    recurrence={recurrence}
                                    onChange={setRecurrence}
                                />
                            </div>
                            <div className="w-32">
                                <CustomSelect
                                    value={reminders.length > 0 ? reminders[0].toString() : 'none'}
                                    onChange={(val: string) => {
                                        if (val === 'none') setReminders([])
                                        else setReminders([parseInt(val)])
                                    }}
                                    options={[
                                        { label: 'No reminder', value: 'none' },
                                        { label: 'At start', value: '0' },
                                        { label: '5 min before', value: '5' },
                                        { label: '15 min before', value: '15' },
                                        { label: '30 min before', value: '30' },
                                        { label: '1 hour before', value: '60' },
                                        { label: '2 hours before', value: '120' },
                                    ]}
                                    placeholder="Reminder"
                                />
                            </div>
                        </div>

                        {/* Contact Multi-Select */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                Contacts
                            </label>
                            <div className="relative" ref={contactsWrapperRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowContactDropdown(!showContactDropdown)}
                                    className="w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                                >
                                    <span className={contactIds.length === 0 ? 'text-slate-400' : ''}>
                                        {contactIds.length === 0 ? 'Select contacts...' : `${contactIds.length} selected`}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                </button>
                                {showContactDropdown && (
                                    <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                                        {contacts.length === 0 ? (
                                            <p className="px-3 py-2 text-sm text-slate-400">No contacts available</p>
                                        ) : (
                                            contacts.map((contact) => (
                                                <label
                                                    key={contact.id}
                                                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={contactIds.includes(contact.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setContactIds([...contactIds, contact.id])
                                                            } else {
                                                                setContactIds(contactIds.filter(id => id !== contact.id))
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
                            {contactIds.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {contactIds.map(id => {
                                        const contact = contacts.find(c => c.id === id)
                                        return contact ? (
                                            <span
                                                key={id}
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
                                                    onClick={() => setContactIds(contactIds.filter(cid => cid !== id))}
                                                    className="p-1 rounded-full hover:bg-brand-200 dark:hover:bg-brand-800 text-brand-600 dark:text-brand-400 transition-colors flex-shrink-0"
                                                    title="Remove"
                                                >
                                                    <span className="text-base leading-none">×</span>
                                                </button>
                                            </span>
                                        ) : null
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 flex-shrink-0">
                            Location
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Add address or location..."
                            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400"
                        />
                        <LocationPicker
                            value={location}
                            address={address}
                            onChange={(loc, addr) => {
                                setLocation(loc)
                                if (addr !== undefined) setAddress(addr)
                            }}
                        />
                    </div>

                    {/* Notes */}
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Add notes..."
                        className="w-full rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 border-none focus:ring-0 placeholder:text-sm"
                    />

                    <div>
                        <ColorPicker value={color} onChange={setColor} />
                    </div>
                </div>
            </div>

            <div className="p-6 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
                {isEditMode ? (
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        className="flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors"
                    >
                        <Trash2 className="h-5 w-5" />
                        Delete
                    </button>
                ) : (
                    <button
                        type="button"
                        className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                )}

                <button
                    type="button"
                    className="rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-brand-500/30 disabled:opacity-60 hover:bg-brand-700 active:scale-95 transition-all min-h-[48px]"
                    disabled={saving}
                    onClick={handleSave}
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
                {error && (
                    <p className="absolute bottom-16 left-0 w-full text-center text-xs font-semibold text-rose-600 pointer-events-none">{error}</p>
                )}
            </div>

            {
                showScopeModal && (
                    <EditRecurringEventModal
                        action={scopeAction}
                        onConfirm={handleScopeConfirm}
                        onCancel={() => setShowScopeModal(false)}
                    />
                )
            }
            {
                showGoalsPopup && goalsContactId && (() => {
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
                })()
            }
        </AnimatedModal >
    )
}

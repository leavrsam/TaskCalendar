import { useState, useMemo, useEffect } from 'react'
import type { Task } from '@taskcalendar/core'
import { useContactsQuery } from '@/features/contacts/api'
import { RecurrenceSelector } from '@/components/calendar/recurrence-selector'
import { AnimatedModal } from '@/components/ui/animated-modal'
import { ColorPicker } from '@/components/ui/color-picker'
import { DatePicker } from '@/components/ui/date-picker'
import { CustomSelect } from '@/components/ui/custom-select'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'

type CreationModalProps = {
    slot?: { start: Date; end: Date } | null
    defaultContactId?: string
    onClose: () => void
    onSave: (values: {
        title: string
        status: Task['status']
        notes?: string
        contactId?: string
        priority: Task['priority']
        color?: string | null
        recurrence?: Task['recurrence']
        scheduledStart?: string
        scheduledEnd?: string
    }) => Promise<void>
}

// Generate time slots (15 min intervals)
const TIME_SLOTS = Array.from({ length: 4 * 24 }).map((_, i) => {
    const hours = Math.floor(i / 4)
    const minutes = (i % 4) * 15
    const date = new Date()
    date.setHours(hours, minutes)
    // Format: "2:15 PM"
    const label = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    // Value: "14:15" (for easy parsing)
    const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    return { label, value }
})

export function CreationModal({ slot, defaultContactId, onClose, onSave }: CreationModalProps) {
    const contactsQuery = useContactsQuery()
    // Helper
    const toTimeValue = (d: Date) => {
        const h = d.getHours().toString().padStart(2, '0')
        const m = d.getMinutes().toString().padStart(2, '0')
        return `${h}:${m}`
    }

    // Default slot if none provided
    const defaultStart = new Date()
    defaultStart.setMinutes(Math.ceil(defaultStart.getMinutes() / 15) * 15, 0, 0) // Round up to next 15 min
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000)

    const contacts = contactsQuery.data ?? []

    // State
    const [title, setTitle] = useState('')
    const [status] = useState<Task['status']>('todo')
    const [priority, setPriority] = useState<Task['priority']>('medium')
    const [notes, setNotes] = useState('')
    const [color, setColor] = useState<string>('#3b82f6')
    const [contactId, setContactId] = useState<string>(defaultContactId || '')
    const [recurrence, setRecurrence] = useState<Task['recurrence']>(null)

    // Date/Time State
    const [startDate, setStartDate] = useState(slot?.start ?? defaultStart)
    const [endDate, setEndDate] = useState(slot?.end ?? defaultEnd)

    // Time Strings (Empty if not drag-created, otherwise from slot)
    const [startTimeValue, setStartTimeValue] = useState(slot ? toTimeValue(slot.start) : "")
    const [endTimeValue, setEndTimeValue] = useState(slot ? toTimeValue(slot.end) : "")

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Sync state when slot changes (re-opening with different slot)
    useEffect(() => {
        if (slot) {
            setStartDate(slot.start)
            setEndDate(slot.end)
            setStartTimeValue(toTimeValue(slot.start))
            setEndTimeValue(toTimeValue(slot.end))
        }
    }, [slot])

    // Helper to format date for display "Dec 17, 2025"
    const formattedDate = useMemo(() => {
        return startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }, [startDate])

    const handleStartTimeChange = (newTimeStr: string) => {
        setStartTimeValue(newTimeStr)
        if (!newTimeStr) return

        const [hours, minutes] = newTimeStr.split(':').map(Number)
        const newStart = new Date(startDate)
        newStart.setHours(hours, minutes)
        setStartDate(newStart)

        // Ensure end time is at least equal or after
        if (newStart >= endDate) {
            const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000)
            setEndDate(newEnd)
            // Update end time string too if we shifted it
            setEndTimeValue(toTimeValue(newEnd))
        }
    }

    const handleEndTimeChange = (newTimeStr: string) => {
        setEndTimeValue(newTimeStr)
        if (!newTimeStr) return

        const [hours, minutes] = newTimeStr.split(':').map(Number)
        const newEnd = new Date(endDate)
        newEnd.setHours(hours, minutes)

        setEndDate(newEnd)
    }

    return (
        <AnimatedModal
            isOpen={true}
            onClose={onClose}
            layoutId={slot ? `slot-${slot.start.toISOString()}` : undefined}
            className="w-full max-w-md rounded-t-2xl md:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl"
        >
            <div className="space-y-6">
                {/* Title Input (Moved to Top) */}
                <div>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-transparent text-2xl font-bold text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none"
                        placeholder="Add title"
                        autoFocus
                    />
                </div>

                {/* Date & Time Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Date Picker */}
                    <div className="flex-1">
                        <DatePicker
                            value={startDate}
                            onChange={(date) => {
                                // Preserve time, update date
                                const newStart = new Date(startDate)
                                newStart.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())

                                const newEnd = new Date(endDate)
                                newEnd.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())

                                setStartDate(newStart)
                                setEndDate(newEnd)
                            }}
                        />
                    </div>

                    {/* Time Dropdowns */}
                    <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1">
                            <CustomSelect
                                value={startTimeValue}
                                onChange={handleStartTimeChange}
                                options={TIME_SLOTS}
                                placeholder="Start"
                            />
                        </div>
                        <span className="text-slate-400 font-medium">-</span>
                        <div className="flex-1">
                            <CustomSelect
                                value={endTimeValue}
                                onChange={handleEndTimeChange}
                                options={TIME_SLOTS}
                                placeholder="End"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
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
                        <RecurrenceSelector
                            scheduledStart={startDate.toISOString()}
                            recurrence={recurrence}
                            onChange={setRecurrence}
                        />

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 flex-shrink-0">
                                Contact
                            </label>
                            <div className="relative flex-1">
                                <select
                                    value={contactId}
                                    onChange={(e) => setContactId(e.target.value)}
                                    className="w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 pl-3 pr-8 py-1.5 text-sm text-slate-900 dark:text-slate-50"
                                >
                                    <option value="">None</option>
                                    {contacts.map((contact) => (
                                        <option key={contact.id} value={contact.id}>
                                            {contact.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

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

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                    type="button"
                    className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={onClose}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="rounded-full bg-brand-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 disabled:opacity-60 hover:bg-brand-700 active:scale-95 transition-all"
                    disabled={saving}
                    onClick={async () => {
                        setSaving(true)
                        setError(null)
                        try {
                            await onSave({
                                title: title || '(No Title)',
                                status,
                                notes,
                                priority,
                                color,
                                contactId: contactId || undefined,
                                recurrence,
                                scheduledStart: startDate.toISOString(),
                                scheduledEnd: endDate.toISOString(),
                            })
                        } catch (err) {
                            setError(err instanceof Error ? err.message : 'Error saving')
                        } finally {
                            setSaving(false)
                        }
                    }}
                >
                    {saving ? 'Saving' : 'Save Event'}
                </button>
            </div>
            {error && (
                <p className="mt-2 text-center text-xs font-semibold text-rose-600">{error}</p>
            )}
        </AnimatedModal>
    )
}

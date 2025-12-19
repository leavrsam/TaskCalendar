import { useState, useEffect } from 'react'
import type { Task } from '@taskcalendar/core'
import { useContactsQuery } from '@/features/contacts/api'
import { RecurrenceSelector } from '@/components/calendar/recurrence-selector'
import { AnimatedModal } from '@/components/ui/animated-modal'
import { ColorPicker } from '@/components/ui/color-picker'
import { DatePicker } from '@/components/ui/date-picker'
import { CustomSelect } from '@/components/ui/custom-select'
import { LocationPicker } from '@/components/map/location-picker'
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
        contactIds?: string[]
        priority: Task['priority']
        color?: string | null
        recurrence?: Task['recurrence']
        scheduledStart?: string
        scheduledEnd?: string
        isAllDay?: boolean
        address?: string
        location?: { lat: number; lng: number } | null
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
    const [contactIds, setContactIds] = useState<string[]>(defaultContactId ? [defaultContactId] : [])
    const [recurrence, setRecurrence] = useState<Task['recurrence']>(null)
    const [isAllDay, setIsAllDay] = useState(false)
    const [address, setAddress] = useState('')
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [showContactDropdown, setShowContactDropdown] = useState(false)

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
                <div className="flex flex-col gap-3">
                    {/* All Day Toggle + Date Row */}
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

                                    // If all-day, also update end date if it's before start
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
                                            // Ensure end is not before start
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

                        {/* Contact Multi-Select */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                Contacts
                            </label>
                            <div className="relative">
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
                    className="rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-brand-500/30 disabled:opacity-60 hover:bg-brand-700 active:scale-95 transition-all min-h-[48px]"
                    disabled={saving}
                    onClick={async () => {
                        setSaving(true)
                        setError(null)
                        try {
                            // For all-day events, set proper day boundaries
                            let finalStart = startDate
                            let finalEnd = endDate
                            if (isAllDay) {
                                finalStart = new Date(startDate)
                                finalStart.setHours(0, 0, 0, 0)
                                finalEnd = new Date(endDate)
                                finalEnd.setHours(23, 59, 59, 999)
                            }
                            await onSave({
                                title: title || '(No Title)',
                                status,
                                notes,
                                priority,
                                color,
                                contactIds: contactIds.length > 0 ? contactIds : undefined,
                                recurrence,
                                scheduledStart: finalStart.toISOString(),
                                scheduledEnd: finalEnd.toISOString(),
                                isAllDay,
                                address: address || undefined,
                                location,
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

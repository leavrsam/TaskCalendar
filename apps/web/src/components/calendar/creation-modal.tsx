import { useState } from 'react'
import type { Task } from '@taskcalendar/core'
import { useContactsQuery } from '@/features/contacts/api'

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
    }) => Promise<void>
}

const PRESET_COLORS = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Indigo', value: '#6366f1' },
]

export function CreationModal({ slot, defaultContactId, onClose, onSave }: CreationModalProps) {
    const contactsQuery = useContactsQuery()
    const [title, setTitle] = useState('')
    const [status, setStatus] = useState<Task['status']>('todo')
    const [priority, setPriority] = useState<Task['priority']>('medium')
    const [notes, setNotes] = useState('')
    const [color, setColor] = useState<string>('#3b82f6')
    const [contactId, setContactId] = useState<string>(defaultContactId || '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const contacts = contactsQuery.data ?? []

    // Use provided slot or default to next hour
    const displaySlot = slot || {
        start: new Date(),
        end: new Date(Date.now() + 60 * 60 * 1000)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">New calendar block</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {displaySlot.start.toLocaleString()} → {displaySlot.end.toLocaleString()}
                </p>
                <div className="mt-4 space-y-3">
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                            Title
                        </label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                            Related Contact (Optional)
                        </label>
                        <select
                            value={contactId}
                            onChange={(e) => setContactId(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                        >
                            <option value="">None</option>
                            {contacts.map((contact) => (
                                <option key={contact.id} value={contact.id}>
                                    {contact.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as Task['status'])}
                                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                            >
                                <option value="todo">To-do</option>
                                <option value="inProgress">In progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                Priority
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                            Block Color
                        </label>
                        <div className="mt-2 grid grid-cols-5 gap-2">
                            {PRESET_COLORS.map((presetColor) => (
                                <button
                                    key={presetColor.value}
                                    type="button"
                                    onClick={() => setColor(presetColor.value)}
                                    className="group relative h-10 w-full rounded-lg transition-all hover:scale-110"
                                    style={{ backgroundColor: presetColor.value }}
                                    title={presetColor.name}
                                >
                                    {color === presetColor.value && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="h-3 w-3 rounded-full border-2 border-white bg-white dark:bg-slate-900/30" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                        />
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        disabled={saving}
                        onClick={async () => {
                            setSaving(true)
                            setError(null)
                            try {
                                await onSave({
                                    title,
                                    status,
                                    notes,
                                    priority,
                                    color,
                                    contactId: contactId || undefined,
                                })
                            } catch (err) {
                                setError(
                                    err instanceof Error
                                        ? err.message
                                        : 'Unable to save calendar block',
                                )
                            } finally {
                                setSaving(false)
                            }
                        }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
                {error && (
                    <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>
                )}
            </div>
        </div>
    )
}

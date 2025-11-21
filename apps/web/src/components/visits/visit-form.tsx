import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { formatISO } from 'date-fns'
import type { Lesson } from '@taskcalendar/core'
import { VISIT_TYPE_LABELS } from '@taskcalendar/core'

type VisitFormProps = {
    initialData?: Lesson
    contacts: { id: string; name: string }[]
    onSubmit: (data: Omit<Lesson, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => Promise<void>
    onClose: () => void
    title: string
}

export function VisitForm({ initialData, contacts, onSubmit, onClose, title }: VisitFormProps) {
    const [form, setForm] = useState({
        contactId: '',
        taughtAt: formatISO(new Date()).slice(0, 16), // YYYY-MM-DDTHH:mm
        type: 'social' as Lesson['type'],
        notes: '',
        commitments: [] as string[],
    })
    const [newCommitment, setNewCommitment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (initialData) {
            setForm({
                contactId: initialData.contactId,
                taughtAt: initialData.taughtAt.slice(0, 16),
                type: initialData.type,
                notes: initialData.notes || '',
                commitments: initialData.commitments || [],
            })
        } else if (contacts.length > 0) {
            setForm((prev) => ({ ...prev, contactId: contacts[0].id }))
        }
    }, [initialData, contacts])

    const handleAddCommitment = () => {
        if (newCommitment.trim()) {
            setForm((prev) => ({
                ...prev,
                commitments: [...prev.commitments, newCommitment.trim()],
            }))
            setNewCommitment('')
        }
    }

    const handleRemoveCommitment = (index: number) => {
        setForm((prev) => ({
            ...prev,
            commitments: prev.commitments.filter((_, i) => i !== index),
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await onSubmit({
                ...form,
                taughtAt: new Date(form.taughtAt).toISOString(),
                taughtBy: initialData?.taughtBy || [],
                followUpAt: initialData?.followUpAt || null,
                sharedWith: initialData?.sharedWith || [],
            })
            onClose()
        } catch (error) {
            console.error('Failed to save visit', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500">Person</label>
                        <select
                            required
                            value={form.contactId}
                            onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="" disabled>Select a person</option>
                            {contacts.map((contact) => (
                                <option key={contact.id} value={contact.id}>
                                    {contact.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500">Date & Time</label>
                            <input
                                type="datetime-local"
                                required
                                value={form.taughtAt}
                                onChange={(e) => setForm({ ...form, taughtAt: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500">Type</label>
                            <select
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value as Lesson['type'] })}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            >
                                {Object.entries(VISIT_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500">Notes</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            rows={3}
                            placeholder="What did you talk about?"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500">Next Steps</label>
                        <div className="mt-1 flex gap-2">
                            <input
                                value={newCommitment}
                                onChange={(e) => setNewCommitment(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCommitment())}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                placeholder="Add a follow-up item..."
                            />
                            <button
                                type="button"
                                onClick={handleAddCommitment}
                                className="rounded-lg bg-slate-100 px-3 text-slate-600 hover:bg-slate-200"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                        {form.commitments.length > 0 && (
                            <ul className="mt-2 space-y-1">
                                {form.commitments.map((commitment, index) => (
                                    <li key={index} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
                                        <span>{commitment}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCommitment(index)}
                                            className="text-slate-400 hover:text-rose-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Visit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

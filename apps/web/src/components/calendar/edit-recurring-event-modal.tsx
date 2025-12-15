import { useState } from 'react'

type EditScope = 'this' | 'following' | 'all'

type EditRecurringEventModalProps = {
    onConfirm: (scope: EditScope) => void
    onCancel: () => void
    action: 'edit' | 'delete'
}

export function EditRecurringEventModal({ onConfirm, onCancel, action }: EditRecurringEventModalProps) {
    const [selectedScope, setSelectedScope] = useState<EditScope>('this')

    const title = action === 'edit' ? 'Edit recurring event' : 'Delete recurring event'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 p-6 shadow-2xl">
                <h3 className="text-xl font-semibold text-slate-50 mb-6">{title}</h3>

                <div className="space-y-3 mb-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="radio"
                            name="scope"
                            value="this"
                            checked={selectedScope === 'this'}
                            onChange={(e) => setSelectedScope(e.target.value as EditScope)}
                            className="h-5 w-5 text-blue-500"
                        />
                        <span className="text-slate-50">This event</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="radio"
                            name="scope"
                            value="following"
                            checked={selectedScope === 'following'}
                            onChange={(e) => setSelectedScope(e.target.value as EditScope)}
                            className="h-5 w-5 text-blue-500"
                        />
                        <span className="text-slate-50">This and following events</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="radio"
                            name="scope"
                            value="all"
                            checked={selectedScope === 'all'}
                            onChange={(e) => setSelectedScope(e.target.value as EditScope)}
                            className="h-5 w-5 text-blue-500"
                        />
                        <span className="text-slate-50">All events</span>
                    </label>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(selectedScope)}
                        className="rounded-lg bg-blue-500 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    )
}

export type { EditScope }

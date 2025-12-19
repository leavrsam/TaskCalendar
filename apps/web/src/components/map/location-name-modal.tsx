import { useState } from 'react'
import { AnimatedModal } from '@/components/ui/animated-modal'

type LocationNameModalProps = {
    onClose: () => void
    onSave: (name: string) => void
}

export function LocationNameModal({ onClose, onSave }: LocationNameModalProps) {
    const [name, setName] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (name.trim()) {
            onSave(name.trim())
        }
    }

    return (
        <AnimatedModal
            isOpen={true}
            onClose={onClose}
            className="p-6 max-w-sm w-full mx-4"
        >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">
                Name this Location
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <input
                        autoFocus
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Hiking Trail Start, My Cave"
                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Location
                    </button>
                </div>
            </form>
        </AnimatedModal>
    )
}

import { Plus } from 'lucide-react'

interface TaskFABProps {
    onClick: () => void
}

export function TaskFAB({ onClick }: TaskFABProps) {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/40 hover:shadow-brand-500/60 transition-all hover:scale-110 active:scale-95 border border-white/20 glass"
            aria-label="Create event"
        >
            <Plus className="h-8 w-8" />
        </button>
    )
}

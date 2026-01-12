import { Plus } from 'lucide-react'

interface TaskFABProps {
    onClick: () => void
}

export function TaskFAB({ onClick }: TaskFABProps) {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 dark:bg-neutral-900 text-brand-500 shadow-lg transition-all hover:scale-110 active:scale-95 border border-neutral-700"
            aria-label="Create event"
        >
            <Plus className="h-8 w-8" />
        </button>
    )
}

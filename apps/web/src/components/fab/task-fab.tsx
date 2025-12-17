import { ListTodo } from 'lucide-react'

interface TaskFABProps {
    taskCount: number
    onClick: () => void
}

export function TaskFAB({ taskCount, onClick }: TaskFABProps) {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/40 hover:shadow-brand-500/60 transition-all hover:scale-110 active:scale-95 border border-white/20 glass"
            aria-label="Open tasks"
        >
            <ListTodo className="h-6 w-6" />
            {taskCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
                    {taskCount}
                </span>
            )}
        </button>
    )
}

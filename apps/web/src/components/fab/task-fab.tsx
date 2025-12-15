import { ListTodo } from 'lucide-react'

interface TaskFABProps {
    taskCount: number
    onClick: () => void
}

export function TaskFAB({ taskCount, onClick }: TaskFABProps) {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-all hover:scale-110 active:scale-95"
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

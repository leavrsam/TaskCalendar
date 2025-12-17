import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Task } from '@taskcalendar/core'

interface TaskBottomSheetProps {
    isOpen: boolean
    onClose: () => void
    tasks: Task[]
    filter: Task['status'] | 'all'
    onFilterChange: (filter: Task['status'] | 'all') => void
    loading: boolean
    onDragTaskChange: (taskId: string | null) => void
}

export function TaskBottomSheet({
    isOpen,
    onClose,
    tasks,
    filter,
    onFilterChange,
    loading,
    onDragTaskChange,
}: TaskBottomSheetProps) {
    const [height, setHeight] = useState<'half' | 'full'>('half')
    const [startY, setStartY] = useState<number | null>(null)

    // Close on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        setStartY(clientY)
    }

    const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (startY === null) return
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        const diff = clientY - startY

        // Swipe down to close or reduce height
        if (diff > 100) {
            if (height === 'full') {
                setHeight('half')
                setStartY(null)
            } else {
                onClose()
            }
        }
        // Swipe up to expand
        else if (diff < -100 && height === 'half') {
            setHeight('full')
            setStartY(null)
        }
    }

    const handleDragEnd = () => {
        setStartY(null)
    }

    if (!isOpen) return null

    const sheetHeight = height === 'full' ? 'h-[90vh]' : 'h-[50vh]'

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 animate-in fade-in"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl glass-dock shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom ${sheetHeight}`}
            >
                {/* Drag Handle */}
                <div
                    className="flex flex-col items-center py-3 cursor-grab active:cursor-grabbing"
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                >
                    <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mb-2" />
                    <div className="flex items-center justify-between w-full px-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            Tasks
                        </h2>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Close tasks"
                        >
                            <X className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Task Content */}
                <div className="h-[calc(100%-4rem)] overflow-auto px-4 pb-4">
                    {/* Filter Pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {(['all', 'todo', 'inProgress', 'done'] as const).map((status) => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => onFilterChange(status as Task['status'] | 'all')}
                                className={status === filter
                                    ? 'px-3 py-1 text-xs font-semibold rounded-full bg-brand-600/90 text-white shadow-sm'
                                    : 'px-3 py-1 text-xs font-semibold rounded-full bg-white/50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-white/20'
                                }
                            >
                                {status === 'inProgress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Task List */}
                    {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading tasks…</p>}
                    {!loading && tasks.length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                            No tasks to show
                        </p>
                    )}
                    <div className="space-y-2">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className="p-3 rounded-xl border border-white/20 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm"
                                draggable
                                onDragStart={() => onDragTaskChange(task.id)}
                                onDragEnd={() => onDragTaskChange(null)}
                            >
                                <p className="font-semibold text-sm text-slate-900 dark:text-slate-50">{task.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${task.status === 'done'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                        : task.status === 'inProgress'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        }`}>
                                        {task.status === 'inProgress' ? 'In Progress' : task.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}

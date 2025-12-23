import { useEffect, useState, useRef, useCallback } from 'react'
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

// Snap points as percentages of viewport height
const SNAP_POINTS = {
    closed: 0,
    peek: 25,
    half: 50,
    full: 85,
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
    const [heightPercent, setHeightPercent] = useState(SNAP_POINTS.half)
    const [isDragging, setIsDragging] = useState(false)
    const startYRef = useRef<number | null>(null)
    const startHeightRef = useRef<number>(SNAP_POINTS.half)
    const sheetRef = useRef<HTMLDivElement>(null)

    // Reset height when opened
    useEffect(() => {
        if (isOpen) {
            setHeightPercent(SNAP_POINTS.half)
        }
    }, [isOpen])

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

    const handleDragStart = useCallback((clientY: number) => {
        setIsDragging(true)
        startYRef.current = clientY
        startHeightRef.current = heightPercent
    }, [heightPercent])

    const handleDragMove = useCallback((clientY: number) => {
        if (startYRef.current === null) return

        const vh = window.innerHeight
        const deltaY = startYRef.current - clientY // Positive = dragging up
        const deltaPercent = (deltaY / vh) * 100
        const newHeight = Math.min(Math.max(startHeightRef.current + deltaPercent, SNAP_POINTS.peek), SNAP_POINTS.full)

        setHeightPercent(newHeight)
    }, [])

    const handleDragEnd = useCallback(() => {
        setIsDragging(false)
        startYRef.current = null

        // Snap to nearest point
        const snapPoints = [SNAP_POINTS.peek, SNAP_POINTS.half, SNAP_POINTS.full]
        let closestSnap = SNAP_POINTS.half
        let minDistance = Infinity

        for (const snap of snapPoints) {
            const distance = Math.abs(heightPercent - snap)
            if (distance < minDistance) {
                minDistance = distance
                closestSnap = snap
            }
        }

        // If dragged below peek threshold, close
        if (heightPercent < SNAP_POINTS.peek - 5) {
            onClose()
        } else {
            setHeightPercent(closestSnap)
        }
    }, [heightPercent, onClose])

    // Touch handlers
    const onTouchStart = (e: React.TouchEvent) => {
        handleDragStart(e.touches[0].clientY)
    }
    const onTouchMove = (e: React.TouchEvent) => {
        handleDragMove(e.touches[0].clientY)
    }
    const onTouchEnd = () => {
        handleDragEnd()
    }

    // Mouse handlers (for desktop)
    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        handleDragStart(e.clientY)
    }

    useEffect(() => {
        if (!isDragging) return

        const onMouseMove = (e: MouseEvent) => {
            handleDragMove(e.clientY)
        }
        const onMouseUp = () => {
            handleDragEnd()
        }

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        return () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
    }, [isDragging, handleDragMove, handleDragEnd])

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 animate-in fade-in"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl glass-dock shadow-2xl ${isDragging ? '' : 'transition-[height] duration-300 ease-out'
                    }`}
                style={{ height: `${heightPercent}vh` }}
            >
                {/* Drag Handle */}
                <div
                    className="flex flex-col items-center py-3 cursor-grab active:cursor-grabbing touch-none select-none"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onMouseDown={onMouseDown}
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

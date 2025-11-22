import React from 'react'
import clsx from 'clsx'
import { Trash2 } from 'lucide-react'
import type { Task } from '@taskcalendar/core'
import { useUpdateTask, useDeleteTask, type TaskEvent } from '@/features/tasks/api'

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

type EventActionSheetProps = {
    event: TaskEvent | null
    onClose: () => void
}

export function EventActionSheet({ event, onClose }: EventActionSheetProps) {
    const updateTask = useUpdateTask()
    const deleteTask = useDeleteTask()

    if (!event) return null

    const task = event.resource

    // Format dates for input (YYYY-MM-DDThh:mm or YYYY-MM-DD)
    const formatDateForInput = (dateStr: string | null | undefined, isDateOnly: boolean) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        if (isDateOnly) {
            return date.toISOString().slice(0, 10)
        }
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
    }

    const handleStatusChange = (e: React.MouseEvent, status: Task['status']) => {
        e.stopPropagation()
        updateTask.mutate({
            id: task.id,
            data: { status },
        })
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await deleteTask.mutateAsync(task.id)
        onClose()
    }

    const handleTimeChange = (field: 'scheduledStart' | 'scheduledEnd', value: string) => {
        let dateStr = value
        if (task.isAllDay) {
            // If all day, append time to ensure correct date is saved
            // Start of day for start, end of day for end
            if (field === 'scheduledStart') dateStr = `${value}T00:00:00.000Z`
            if (field === 'scheduledEnd') dateStr = `${value}T23:59:59.999Z`
        } else {
            const date = new Date(value)
            dateStr = date.toISOString()
        }

        updateTask.mutate({
            id: task.id,
            data: { [field]: dateStr },
        })
    }

    const handleColorChange = (color: string) => {
        updateTask.mutate({
            id: task.id,
            data: { color },
        })
    }

    const toggleAllDay = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation()
        updateTask.mutate({
            id: task.id,
            data: { isAllDay: e.target.checked },
        })
    }

    const toggleBackup = () => {
        updateTask.mutate({
            id: task.id,
            data: { isBackup: !task.isBackup },
        })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 py-6 md:items-center"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between">
                    <div className="w-full pr-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Event</p>
                        <input
                            value={task.title}
                            onChange={(e) => updateTask.mutate({ id: task.id, data: { title: e.target.value } })}
                            className="w-full bg-transparent text-lg font-semibold text-slate-900 focus:outline-none focus:ring-0 dark:text-slate-50"
                            placeholder="Event title"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="rounded-full p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            title="Delete event"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className="mt-4 space-y-4">
                    {/* Time Controls */}
                    <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                Time
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={task.isAllDay}
                                    onChange={toggleAllDay}
                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                />
                                All day
                            </label>
                        </div>
                        <div className="grid gap-4">
                            {/* Start */}
                            <div className="grid grid-cols-[1fr,auto] gap-2">
                                <div>
                                    <label className="text-[10px] text-slate-400">Start Date</label>
                                    <input
                                        type="date"
                                        value={formatDateForInput(task.scheduledStart, true)}
                                        onChange={(e) => {
                                            const newDate = e.target.value
                                            const current = new Date(task.scheduledStart as string)
                                            // Keep time, update date
                                            const timePart = current.toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5)
                                            handleTimeChange('scheduledStart', `${newDate}T${timePart}`)
                                        }}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-slate-50 dark:[color-scheme:dark]"
                                    />
                                </div>
                                {!task.isAllDay && (
                                    <div>
                                        <label className="text-[10px] text-slate-400">Time</label>
                                        <input
                                            type="time"
                                            value={task.scheduledStart ? new Date(task.scheduledStart as string).toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5) : ''}
                                            onChange={(e) => {
                                                const newTime = e.target.value
                                                const datePart = formatDateForInput(task.scheduledStart, true)
                                                handleTimeChange('scheduledStart', `${datePart}T${newTime}`)
                                            }}
                                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-slate-50 dark:[color-scheme:dark]"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* End */}
                            <div className="grid grid-cols-[1fr,auto] gap-2">
                                <div>
                                    <label className="text-[10px] text-slate-400">End Date</label>
                                    <input
                                        type="date"
                                        value={formatDateForInput(task.scheduledEnd, true)}
                                        onChange={(e) => {
                                            const newDate = e.target.value
                                            const current = new Date(task.scheduledEnd as string)
                                            const timePart = current.toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5)
                                            handleTimeChange('scheduledEnd', `${newDate}T${timePart}`)
                                        }}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-slate-50 dark:[color-scheme:dark]"
                                    />
                                </div>
                                {!task.isAllDay && (
                                    <div>
                                        <label className="text-[10px] text-slate-400">Time</label>
                                        <input
                                            type="time"
                                            value={task.scheduledEnd ? new Date(task.scheduledEnd as string).toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5) : ''}
                                            onChange={(e) => {
                                                const newTime = e.target.value
                                                const datePart = formatDateForInput(task.scheduledEnd, true)
                                                handleTimeChange('scheduledEnd', `${datePart}T${newTime}`)
                                            }}
                                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-slate-50 dark:[color-scheme:dark]"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Controls */}
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Status</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(['todo', 'inProgress', 'done'] as Task['status'][]).map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={(e) => handleStatusChange(e, status)}
                                    className={clsx(
                                        'rounded-full px-3 py-1 text-sm font-semibold transition-colors',
                                        task.status === status
                                            ? 'bg-brand-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Controls */}
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Color</p>
                        <div className="mt-2 grid grid-cols-5 gap-2">
                            {PRESET_COLORS.map((presetColor) => (
                                <button
                                    key={presetColor.value}
                                    type="button"
                                    onClick={() => handleColorChange(presetColor.value)}
                                    className="group relative h-8 w-full rounded-lg transition-all hover:scale-110"
                                    style={{ backgroundColor: presetColor.value }}
                                    title={presetColor.name}
                                >
                                    {(task.color === presetColor.value || (!task.color && presetColor.value === '#3b82f6')) && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="h-2 w-2 rounded-full border-2 border-white bg-white dark:bg-slate-900/30" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Backup Toggle */}
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Backup</p>
                        <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Backup block
                            </span>
                            <input
                                type="checkbox"
                                checked={task.isBackup || false}
                                onChange={toggleBackup}
                                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Notes</label>
                        <textarea
                            value={task.notes || ''}
                            onChange={(e) => {
                                updateTask.mutate({
                                    id: task.id,
                                    data: { notes: e.target.value },
                                })
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            rows={3}
                            placeholder="Add notes..."
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

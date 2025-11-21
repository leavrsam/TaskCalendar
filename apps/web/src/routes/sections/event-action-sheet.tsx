type EventActionSheetProps = {
    event: TaskEvent | null
    onClose: () => void
}

function EventActionSheet({ event, onClose }: EventActionSheetProps) {
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
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Event</p>
                        <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="rounded-full p-2 text-rose-500 hover:bg-rose-50"
                            title="Delete event"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-slate-300"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className="mt-4 space-y-4">
                    {/* Time Controls */}
                    <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase text-slate-500">
                                Time
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={task.isAllDay}
                                    onChange={toggleAllDay}
                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                />
                                All day
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-slate-400">Start</label>
                                <input
                                    type={task.isAllDay ? 'date' : 'datetime-local'}
                                    value={formatDateForInput(task.scheduledStart, task.isAllDay)}
                                    onChange={(e) => handleTimeChange('scheduledStart', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400">End</label>
                                <input
                                    type={task.isAllDay ? 'date' : 'datetime-local'}
                                    value={formatDateForInput(task.scheduledEnd, task.isAllDay)}
                                    onChange={(e) => handleTimeChange('scheduledEnd', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Controls */}
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
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
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Controls */}
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Color</p>
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
                                            <div className="h-2 w-2 rounded-full border-2 border-white bg-white/30" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Backup Toggle */}
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Backup</p>
                        <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                            <span className="text-sm font-medium text-slate-700">
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
                        <label className="text-xs font-semibold uppercase text-slate-500">Notes</label>
                        <textarea
                            value={task.notes || ''}
                            onChange={(e) => {
                                updateTask.mutate({
                                    id: task.id,
                                    data: { notes: e.target.value },
                                })
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            rows={3}
                            placeholder="Add notes..."
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

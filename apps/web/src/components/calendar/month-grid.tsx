import { format, startOfMonth, startOfWeek, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import clsx from 'clsx'
import type { TaskEvent } from '@/features/tasks/api'

interface MonthGridProps {
    currentMonth: Date
    events: TaskEvent[]
    onDateSelect: (date: Date) => void
    onDateDoubleClick?: (date: Date) => void
}

export function MonthGrid({ currentMonth, events, onDateSelect, onDateDoubleClick }: MonthGridProps) {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    const days = eachDayOfInterval({ start, end })

    return (
        <div className="w-full">
            <div className="flex items-center justify-center mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {format(currentMonth, 'MMMM yyyy')}
                </h3>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={`${day}-${i}`} className="text-slate-500 font-medium h-7 flex items-center justify-center">
                        {day}
                    </div>
                ))}
                {days.map(day => {
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isTodayDate = isToday(day)
                    // Simple dot if has events
                    const hasEvents = events.some(e => isSameDay(e.start as Date, day))

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => onDateSelect(day)}
                            onDoubleClick={(e) => {
                                e.stopPropagation()
                                onDateDoubleClick?.(day)
                            }}
                            className={clsx(
                                "h-7 w-7 flex items-center justify-center rounded-full mx-auto relative cursor-pointer transition-colors",
                                !isCurrentMonth && "text-slate-300 dark:text-slate-600",
                                isCurrentMonth && "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                                isTodayDate && "bg-brand-600 text-white hover:bg-brand-700 font-semibold"
                            )}
                        >
                            {format(day, 'd')}
                            {hasEvents && !isTodayDate && (
                                <div className="absolute bottom-1 h-0.5 w-0.5 rounded-full bg-brand-500" />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

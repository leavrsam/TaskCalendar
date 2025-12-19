import { useState } from 'react'
import { format, addMonths, subMonths, startOfMonth, startOfWeek, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useTaskEvents } from '@/features/tasks/api'

export function MiniCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const { events } = useTaskEvents()

    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))

    const days = eachDayOfInterval({ start, end })

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <div className="flex gap-1">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                    <div key={day} className="text-slate-500 font-medium">
                        {day}
                    </div>
                ))}
                {days.map(day => {
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isTodayDate = isToday(day)
                    // Simple dot if has events
                    const hasEvents = events.some(e => isSameDay(e.start, day))

                    return (
                        <Link
                            key={day.toISOString()}
                            to={`/schedule?date=${day.toISOString()}`} // Note: Ideally pass state via context or URL params
                            className={clsx(
                                "h-7 w-7 flex items-center justify-center rounded-full mx-auto relative",
                                !isCurrentMonth && "text-slate-300 dark:text-slate-600",
                                isCurrentMonth && "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                                isTodayDate && "bg-brand-600 text-white hover:bg-brand-700 font-semibold"
                            )}
                        >
                            {format(day, 'd')}
                            {hasEvents && !isTodayDate && (
                                <div className="absolute bottom-1 h-0.5 w-0.5 rounded-full bg-brand-500" />
                            )}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

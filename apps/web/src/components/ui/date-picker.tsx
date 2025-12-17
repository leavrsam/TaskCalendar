import { useState, useRef, useEffect } from 'react'
import { format, addMonths, subMonths, startOfMonth, startOfWeek, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

type DatePickerProps = {
    value: Date
    onChange: (date: Date) => void
    className?: string
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [viewDate, setViewDate] = useState(value) // Date currently being viewed in calendar
    const containerRef = useRef<HTMLDivElement>(null)

    // Sync viewDate when reopening or value changes externally
    useEffect(() => {
        if (isOpen) {
            setViewDate(value)
        }
    }, [isOpen, value])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const start = startOfWeek(startOfMonth(viewDate))
    const end = endOfWeek(endOfMonth(viewDate))
    const days = eachDayOfInterval({ start, end })

    const formattedDate = format(value, 'MMM d, yyyy')

    return (
        <div className={clsx("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20",
                    isOpen
                        ? "border-brand-500 ring-2 ring-brand-500/20"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-brand-500 dark:hover:border-brand-500"
                )}
            >
                <CalendarIcon className="h-4 w-4 text-slate-500" />
                <span className="text-slate-900 dark:text-slate-200">
                    {formattedDate}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-50 mt-1 w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                {format(viewDate, 'MMMM yyyy')}
                            </h3>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setViewDate(subMonths(viewDate, 1))}
                                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewDate(addMonths(viewDate, 1))}
                                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Formatting */}
                        <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                                <div key={day} className="text-slate-500 font-medium">
                                    {day}
                                </div>
                            ))}
                            {days.map(day => {
                                const isCurrentMonth = isSameMonth(day, viewDate)
                                const isSelected = isSameDay(day, value)
                                const isTodayDate = isToday(day)

                                return (
                                    <button
                                        key={day.toISOString()}
                                        type="button"
                                        onClick={() => {
                                            onChange(day)
                                            setIsOpen(false)
                                        }}
                                        className={clsx(
                                            "h-7 w-7 flex items-center justify-center rounded-full mx-auto transition-colors",
                                            !isCurrentMonth && "text-slate-300 dark:text-slate-600",
                                            isCurrentMonth && !isSelected && "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                                            isSelected && "bg-brand-600 text-white font-semibold shadow-md shadow-brand-500/30",
                                            isTodayDate && !isSelected && "text-brand-600 font-semibold bg-brand-50 dark:bg-brand-900/20"
                                        )}
                                    >
                                        {format(day, 'd')}
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

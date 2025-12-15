import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Task } from '@taskcalendar/core'
import { getQuickRecurrenceOptions, getRecurrenceDescription, type RecurrenceRule } from '@/lib/recurrence'

type RecurrenceSelectorProps = {
    scheduledStart?: string | null
    recurrence: Task['recurrence']
    onChange: (recurrence: Task['recurrence']) => void
}

export function RecurrenceSelector({ scheduledStart, recurrence, onChange }: RecurrenceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)

    const options = getQuickRecurrenceOptions(scheduledStart)

    const handleSelect = (value: RecurrenceRule | null) => {
        onChange(value)
        setIsOpen(false)
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-3 md:py-2 text-sm text-slate-900 dark:text-slate-50 hover:border-brand-500 min-h-[48px] md:min-h-0"
            >
                <span>{getRecurrenceDescription(recurrence, scheduledStart)}</span>
                <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
                        {options.map((option, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className="w-full px-4 py-3 md:py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[48px] md:min-h-0"
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

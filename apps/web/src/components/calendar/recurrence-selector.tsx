import { useState, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { Task } from '@taskcalendar/core'
import { getRecurrenceDescription, type RecurrenceRule } from '@/lib/recurrence'
import { AnimatedModal } from '@/components/ui/animated-modal'
import clsx from 'clsx'

type RecurrenceSelectorProps = {
    scheduledStart?: string | null
    recurrence: Task['recurrence']
    onChange: (recurrence: Task['recurrence']) => void
}

const FREQUENCIES = [
    { label: 'Day', value: 'daily' },
    { label: 'Week', value: 'weekly' },
    { label: 'Month', value: 'monthly' },
    { label: 'Year', value: 'annually' },
] as const

const DAYS = [
    { label: 'M', value: 1 }, // date-fns getDay: 0=Sun, 1=Mon
    { label: 'T', value: 2 },
    { label: 'W', value: 3 },
    { label: 'T', value: 4 },
    { label: 'F', value: 5 },
    { label: 'S', value: 6 },
    { label: 'S', value: 0 },
] as const

export function RecurrenceSelector({ scheduledStart, recurrence, onChange }: RecurrenceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [tempRule, setTempRule] = useState<RecurrenceRule>(
        recurrence || { frequency: 'weekly', interval: 1 }
    )

    // Sync when opening
    useEffect(() => {
        if (isOpen) {
            setTempRule(recurrence || { frequency: 'weekly', interval: 1 })
        }
    }, [isOpen, recurrence])

    const handleSave = () => {
        onChange(tempRule)
        setIsOpen(false)
    }

    const updateRule = (updates: Partial<RecurrenceRule>) => {
        setTempRule(prev => ({ ...prev, ...updates }))
    }

    const toggleDay = (day: number) => {
        const currentDays = tempRule.byDay || []
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day]
        updateRule({ byDay: newDays.length ? newDays : undefined })
    }

    return (
        <div className="relative">
            <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Repeats
            </label>
            <div className="mt-2 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className={clsx(
                        "flex-1 flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                        recurrence
                            ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
                            : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-50 dark:hover:border-slate-700"
                    )}
                >
                    <span className="truncate">
                        {getRecurrenceDescription(recurrence, scheduledStart) || 'Does not repeat'}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
            </div>

            <AnimatedModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                className="max-w-sm p-0 overflow-hidden"
            >
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50">Custom Recurrence</h3>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-500">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Sentence Builder */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span>Repeats every</span>
                        <input
                            type="number"
                            min={1}
                            max={99}
                            value={tempRule.interval || 1}
                            onChange={(e) => updateRule({ interval: parseInt(e.target.value) || 1 })}
                            className="w-12 rounded border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-center font-medium focus:ring-brand-500"
                        />
                        <select
                            value={tempRule.frequency}
                            onChange={(e) => updateRule({ frequency: e.target.value as any })}
                            className="rounded border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-medium focus:ring-brand-500"
                        >
                            {FREQUENCIES.map(f => (
                                <option key={f.value} value={f.value}>{f.label.toLowerCase()}{tempRule.interval && tempRule.interval > 1 ? 's' : ''}</option>
                            ))}
                        </select>
                    </div>

                    {/* Weekly Days Selector */}
                    {tempRule.frequency === 'weekly' && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">On these days</label>
                            <div className="flex justify-between gap-1">
                                {DAYS.map(day => {
                                    const isSelected = tempRule.byDay?.includes(day.value)
                                    return (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleDay(day.value)}
                                            className={clsx(
                                                "h-8 w-8 rounded-full text-xs font-semibold transition-all",
                                                isSelected
                                                    ? "bg-brand-600 text-white shadow-brand-500/30 shadow-md scale-110"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                                            )}
                                        >
                                            {day.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* End Date */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Ends</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <input
                                    type="radio"
                                    name="endDate"
                                    checked={!tempRule.endDate}
                                    onChange={() => updateRule({ endDate: undefined })}
                                    className="text-brand-600 focus:ring-brand-500"
                                />
                                Never
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <input
                                    type="radio"
                                    name="endDate"
                                    checked={!!tempRule.endDate}
                                    onChange={() => updateRule({ endDate: new Date().toISOString() })}
                                    className="text-brand-600 focus:ring-brand-500"
                                />
                                <span>On</span>
                                <input
                                    type="date"
                                    disabled={!tempRule.endDate}
                                    value={tempRule.endDate ? new Date(tempRule.endDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => updateRule({ endDate: new Date(e.target.value).toISOString() })}
                                    className="rounded border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm disabled:opacity-50"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                    >
                        Done
                    </button>
                </div>
            </AnimatedModal>
        </div>
    )
}

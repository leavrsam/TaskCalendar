import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, isSameDay, getDay, getDate, getMonth } from 'date-fns'
import type { Task, RecurrenceFrequency } from '@taskcalendar/core'

export type RecurrenceRule = NonNullable<Task['recurrence']>

/**
 * Generate recurring event instances within a date range
 */
export function expandRecurringEvents(
    events: Task[],
    viewStart: Date,
    viewEnd: Date
): Task[] {
    const expanded: Task[] = []

    // Collect all exception instances (modified instances from the database)
    const exceptions = new Map<string, Set<string>>()
    for (const event of events) {
        if (event.isRecurringInstance && event.isModified && event.recurringEventId && event.originalStart) {
            if (!exceptions.has(event.recurringEventId)) {
                exceptions.set(event.recurringEventId, new Set())
            }
            exceptions.get(event.recurringEventId)!.add(event.originalStart)
        }
    }

    for (const event of events) {
        // Non-recurring events pass through as-is
        if (!event.recurrence || event.recurrence.frequency === 'none') {
            expanded.push(event)
            continue
        }

        // Don't expand recurring instances (they're already expanded)
        if (event.isRecurringInstance) {
            expanded.push(event)
            continue
        }

        // Generate instances for recurring events
        const instances = generateOccurrences(event, viewStart, viewEnd)

        // Filter out instances that have exceptions in the database
        const exceptionDates = exceptions.get(event.id) || new Set()
        const filteredInstances = instances.filter(instance => {
            return !exceptionDates.has(instance.originalStart!)
        })

        expanded.push(...filteredInstances)
    }

    return expanded
}

/**
 * Generate all occurrences of a recurring event within a date range
 */
export function generateOccurrences(
    baseEvent: Task,
    viewStart: Date,
    viewEnd: Date
): Task[] {
    if (!baseEvent.recurrence || !baseEvent.scheduledStart || !baseEvent.scheduledEnd) {
        return [baseEvent]
    }

    const { frequency, interval = 1, endDate, count } = baseEvent.recurrence
    const instances: Task[] = []

    const eventStart = new Date(baseEvent.scheduledStart)
    const eventEnd = new Date(baseEvent.scheduledEnd)
    const duration = eventEnd.getTime() - eventStart.getTime()

    let current = new Date(eventStart)
    let occurrenceCount = 0
    const maxCount = count || 1000 // Safety limit

    const recurrenceEnd = endDate ? new Date(endDate) : addYears(viewEnd, 2)

    while (
        (isBefore(current, recurrenceEnd) || isSameDay(current, recurrenceEnd)) &&
        occurrenceCount < maxCount &&
        isBefore(current, addDays(viewEnd, 1))
    ) {
        // Check if this occurrence falls within view range
        if (
            (isAfter(current, viewStart) || isSameDay(current, viewStart)) &&
            (isBefore(current, viewEnd) || isSameDay(current, viewEnd))
        ) {
            const instanceEnd = new Date(current.getTime() + duration)

            instances.push({
                ...baseEvent,
                id: `${baseEvent.id}-${current.toISOString()}`,
                scheduledStart: current.toISOString(),
                scheduledEnd: instanceEnd.toISOString(),
                isRecurringInstance: true,
                recurringEventId: baseEvent.id,
                originalStart: current.toISOString(),
                isModified: false,
            })
        }

        // Move to next occurrence
        current = getNextOccurrence(current, frequency, interval, baseEvent.recurrence)
        occurrenceCount++

        // Safety check: if we're not moving forward, break
        if (occurrenceCount > 0 && !isAfter(current, eventStart)) {
            break
        }
    }

    return instances
}

/**
 * Calculate the next occurrence date based on recurrence rule
 */
function getNextOccurrence(
    current: Date,
    frequency: RecurrenceFrequency,
    interval: number,
    recurrence: RecurrenceRule
): Date {
    switch (frequency) {
        case 'daily':
            return addDays(current, interval)

        case 'weekday': {
            let next = addDays(current, 1)
            while (getDay(next) === 0 || getDay(next) === 6) {
                next = addDays(next, 1)
            }
            return next
        }

        case 'weekly': {
            if (recurrence.byDay && recurrence.byDay.length > 0) {
                // Find next day in byDay array
                let next = addDays(current, 1)
                const maxAttempts = 7
                let attempts = 0

                while (attempts < maxAttempts) {
                    if (recurrence.byDay.includes(getDay(next))) {
                        return next
                    }
                    next = addDays(next, 1)
                    attempts++
                }
            }
            return addWeeks(current, interval)
        }

        case 'monthly': {
            if (recurrence.byMonthDay !== null && recurrence.byMonthDay !== undefined) {
                // Specific day of month
                let next = addMonths(current, interval)
                next.setDate(recurrence.byMonthDay)
                return next
            }
            return addMonths(current, interval)
        }

        case 'annually': {
            if (recurrence.byMonth !== null && recurrence.byMonth !== undefined && recurrence.byMonthDay !== null && recurrence.byMonthDay !== undefined) {
                let next = addYears(current, interval)
                next.setMonth(recurrence.byMonth)
                next.setDate(recurrence.byMonthDay)
                return next
            }
            return addYears(current, interval)
        }

        case 'custom':
            // Custom recurrence can use any of the above patterns
            return addDays(current, interval)

        default:
            return addDays(current, 1)
    }
}

/**
 * Generate user-friendly description of recurrence rule
 */
export function getRecurrenceDescription(
    recurrence: RecurrenceRule | null | undefined,
    scheduledStart?: string | null
): string {
    if (!recurrence || recurrence.frequency === 'none') {
        return 'Does not repeat'
    }

    const { frequency, interval = 1 } = recurrence

    const start = scheduledStart ? new Date(scheduledStart) : new Date()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    switch (frequency) {
        case 'daily':
            return interval === 1 ? 'Daily' : `Every ${interval} days`

        case 'weekday':
            return 'Every weekday (Monday to Friday)'

        case 'weekly': {
            const day = dayNames[getDay(start)]
            if (interval === 1) {
                return `Weekly on ${day}`
            }
            return `Every ${interval} weeks on ${day}`
        }

        case 'monthly': {
            const dayOfMonth = getDate(start)
            const weekNumber = Math.ceil(dayOfMonth / 7)
            const dayName = dayNames[getDay(start)]
            const ordinals = ['first', 'second', 'third', 'fourth', 'fifth']
            const ordinal = ordinals[weekNumber - 1] || `${weekNumber}th`

            return `Monthly on the ${ordinal} ${dayName}`
        }

        case 'annually': {
            const month = monthNames[getMonth(start)]
            const day = getDate(start)
            return `Annually on ${month} ${day}`
        }

        case 'custom':
            return 'Custom...'

        default:
            return 'Does not repeat'
    }
}

/**
 * Get quick recurrence options for dropdown
 */
export function getQuickRecurrenceOptions(scheduledStart?: string | null): Array<{
    label: string
    value: RecurrenceRule | null
}> {
    const start = scheduledStart ? new Date(scheduledStart) : new Date()
    const dayOfWeek = getDay(start)
    const dayOfMonth = getDate(start)
    const month = getMonth(start)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    const weekNumber = Math.ceil(dayOfMonth / 7)
    const ordinals = ['first', 'second', 'third', 'fourth', 'fifth']
    const ordinal = ordinals[weekNumber - 1] || `${weekNumber}th`

    return [
        {
            label: 'Does not repeat',
            value: null,
        },
        {
            label: 'Daily',
            value: {
                frequency: 'daily',
                interval: 1,
                endDate: null,
                count: null,
            },
        },
        {
            label: `Weekly on ${dayNames[dayOfWeek]}`,
            value: {
                frequency: 'weekly',
                interval: 1,
                endDate: null,
                count: null,
                byDay: [dayOfWeek],
            },
        },
        {
            label: `Monthly on the ${ordinal} ${dayNames[dayOfWeek]}`,
            value: {
                frequency: 'monthly',
                interval: 1,
                endDate: null,
                count: null,
                byMonthDay: dayOfMonth,
            },
        },
        {
            label: `Annually on ${monthNames[month]} ${dayOfMonth}`,
            value: {
                frequency: 'annually',
                interval: 1,
                endDate: null,
                count: null,
                byMonth: month,
                byMonthDay: dayOfMonth,
            },
        },
        {
            label: 'Every weekday (Monday to Friday)',
            value: {
                frequency: 'weekday',
                interval: 1,
                endDate: null,
                count: null,
            },
        },
        {
            label: 'Custom...',
            value: {
                frequency: 'custom',
                interval: 1,
                endDate: null,
                count: null,
            },
        },
    ]
}

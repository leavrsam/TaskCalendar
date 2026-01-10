import { useEffect, useRef } from 'react'
import { useTaskEvents } from '@/features/tasks/api'
import { useContactsQuery } from '@/features/contacts/api'
import type { Task, Contact } from '@taskcalendar/core'
import { differenceInDays } from 'date-fns'

const CHECK_INTERVAL_MS = 60 * 1000 // Check every minute

export function NotificationManager() {
    // We need access to events. 
    // Optimization: Depending on how many events loaded, this might be heavy.
    // Ideally we query specifically for "today/tomorrow" but using cached hooks for now.

    // We'll use a wide range to catch everything currently loaded in cache/query
    // Or simpler: just use what's in the store if available, or relying on the main query.
    // Since useTaskEvents depends on range, we might miss off-screen events if we rely on it and it's windowed.
    // However, for MVP, we assume the user has loaded the schedule. 
    // BETTER: Use a query that fetches "upcoming events" specifically? 
    // For now, let's use the standard hook and assume active usage covers it, 
    // or arguably we should just fetch "all active tasks" periodically if the list is small.
    // Given the previous "windowed" optimization, checking *only* the loaded window is risky.
    // But let's start with basic implementation.

    // Actually, `useTaskEvents` is tailored for the view. 
    // We might want a separate lighter query "useUpcomingTasks" but let's stick to simple logic first.
    // We will scan whatever is in the query cache for simplicity.
    const { data: events = [] } = useTaskEvents(new Date()) // Current month window
    const { data: contacts = [] } = useContactsQuery()

    // Track fired notifications to prevent duplicates
    const firedRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        // Load fired history from sessionStorage to persist across reloads (but reset on close)
        try {
            const stored = sessionStorage.getItem('fired_notifications')
            if (stored) {
                firedRef.current = new Set(JSON.parse(stored))
            }
        } catch (e) {
            console.error('Failed to load notification history', e)
        }

        const interval = setInterval(() => {
            checkReminders(events, contacts, firedRef.current)
        }, CHECK_INTERVAL_MS)

        // Initial check
        checkReminders(events, contacts, firedRef.current)

        return () => clearInterval(interval)
    }, [events, contacts])

    return null
}

function checkReminders(events: any[], contacts: Contact[], fired: Set<string>) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const now = new Date()

    // 1. Event Reminders
    events.forEach(eventWrapper => {
        const task = eventWrapper.resource as Task
        if (!task.reminders || task.reminders.length === 0) return

        const start = new Date(task.scheduledStart!)
        if (isNaN(start.getTime())) return

        task.reminders.forEach(minutes => {
            // Calculate when this reminder should fire
            const remindAt = new Date(start.getTime() - minutes * 60000)

            // Check if we are within the "firing window" (last 2 minutes to be safe against lag)
            const diff = now.getTime() - remindAt.getTime()

            // Allow firing if it was due within the last 2 minutes and hasn't fired yet
            if (diff >= 0 && diff < 2 * 60 * 1000) {
                const key = `event-${task.id}-${minutes}`
                if (!fired.has(key)) {
                    sendNotification(`Reminder: ${task.title}`, {
                        body: `Starts in ${minutes} minutes (${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                        icon: '/pwa-192x192.png',
                        tag: key // Prevent stacking
                    })
                    fired.add(key)
                    persistFired(fired)
                }
            }
        })
    })

    // 2. Contact Status Alerts
    // We only check these once a day effectively, or check if status CHANGED.
    // A simple way is to check if we are in a new status bracket and haven't notified for that bracket yet.
    contacts.forEach(contact => {
        if (!contact.isFavorite || !contact.lastContactedAt) return

        const lastContact = new Date(contact.lastContactedAt)
        const days = differenceInDays(now, lastContact)

        let status = 'green'
        let message = ''

        if (days >= 120) {
            status = 'red'
            message = `It's been over 4 months since you contacted ${contact.name}.`
        } else if (days >= 90) {
            status = 'orange'
            message = `It's been 3 months since you contacted ${contact.name}.`
        } else if (days >= 30) {
            status = 'yellow'
            message = `It's been a month since you contacted ${contact.name}.`
        } else {
            return // Green, no alert
        }


        // We also want to ensure we don't spam. Maybe only once per status transition.
        // Or simpler: persist this permanently in localStorage so we don't nag every reload.
        const storageKey = `notified_contact_${contact.id}_${status}`

        if (!localStorage.getItem(storageKey)) {
            sendNotification(`Reconnect with ${contact.name}`, {
                body: message,
                icon: '/pwa-192x192.png'
            })
            localStorage.setItem(storageKey, new Date().toISOString())
        }
    })
}

function sendNotification(title: string, options?: NotificationOptions) {
    try {
        new Notification(title, options)
    } catch (e) {
        console.error('Error showing notification', e)
    }
}

function persistFired(fired: Set<string>) {
    try {
        sessionStorage.setItem('fired_notifications', JSON.stringify(Array.from(fired)))
    } catch (e) {
        // ignore
    }
}

/**
 * IndexedDB caching layer for tasks using Dexie.js
 * 
 * This provides instant loading by showing cached data first,
 * then syncing with Firestore in the background.
 */

import Dexie, { type Table } from 'dexie'
import type { Task } from '@task-calendar/core'

// Define our database schema
class TaskCalendarDB extends Dexie {
    tasks!: Table<Task, string>
    metadata!: Table<{ key: string; value: string | number | Date }>

    constructor() {
        super('TaskCalendarDB')

        // Define schema - version 1
        this.version(1).stores({
            // Primary key is 'id', indexed fields for filtering
            tasks: 'id, status, scheduledStart, scheduledEnd, dueAt, updatedAt',
            // Metadata for sync tracking
            metadata: 'key'
        })
    }
}

// Singleton database instance
const db = new TaskCalendarDB()

/**
 * Get all cached tasks from IndexedDB
 */
export async function getCachedTasks(): Promise<Task[]> {
    try {
        return await db.tasks.toArray()
    } catch (error) {
        console.warn('Failed to get cached tasks:', error)
        return []
    }
}

/**
 * Cache tasks to IndexedDB (replaces all existing)
 */
export async function cacheTasks(tasks: Task[]): Promise<void> {
    try {
        await db.transaction('rw', db.tasks, db.metadata, async () => {
            // Clear existing tasks and add new ones
            await db.tasks.clear()
            await db.tasks.bulkAdd(tasks)

            // Update last synced timestamp
            await db.metadata.put({
                key: 'lastSynced',
                value: new Date().toISOString()
            })
        })
    } catch (error) {
        console.warn('Failed to cache tasks:', error)
    }
}

/**
 * Update or insert a single task in the cache
 */
export async function upsertCachedTask(task: Task): Promise<void> {
    try {
        await db.tasks.put(task)
    } catch (error) {
        console.warn('Failed to upsert cached task:', error)
    }
}

/**
 * Delete a task from the cache
 */
export async function deleteCachedTask(taskId: string): Promise<void> {
    try {
        await db.tasks.delete(taskId)
    } catch (error) {
        console.warn('Failed to delete cached task:', error)
    }
}

/**
 * Get the last sync timestamp
 */
export async function getLastSyncTime(): Promise<Date | null> {
    try {
        const record = await db.metadata.get('lastSynced')
        if (record?.value) {
            return new Date(record.value as string)
        }
        return null
    } catch (error) {
        console.warn('Failed to get last sync time:', error)
        return null
    }
}

/**
 * Clear all cached data (useful for logout)
 */
export async function clearCache(): Promise<void> {
    try {
        await db.transaction('rw', db.tasks, db.metadata, async () => {
            await db.tasks.clear()
            await db.metadata.clear()
        })
    } catch (error) {
        console.warn('Failed to clear cache:', error)
    }
}

export { db }

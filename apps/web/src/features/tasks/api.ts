import { useEffect, useMemo, useRef } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { taskSchema, type Task } from '@taskcalendar/core'

import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'
import { expandRecurringEvents } from '@/lib/recurrence'
import { getCachedTasks, cacheTasks } from '@/lib/task-cache'
import { startOfMonth, endOfMonth, addMonths } from 'date-fns'

const key = (uid: string | undefined) => ['firestore', 'tasks', uid ?? 'anon']

export type TaskEvent = {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource: Task
}

const tasksCollection = (uid: string) =>
  collection(getFirebaseFirestore(), 'users', uid, 'tasks')

const taskDoc = (uid: string, taskId: string) =>
  doc(getFirebaseFirestore(), 'users', uid, 'tasks', taskId)

const nowIso = () => new Date().toISOString()

const pruneUndefined = <T extends Record<string, unknown>>(input: T) =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T

/**
 * Tasks query with IndexedDB caching for instant loading.
 * 
 * Strategy:
 * 1. On mount, immediately load cached data from IndexedDB and set it as query data
 * 2. React Query then fetches fresh data from Firestore in the background
 * 3. Fresh data replaces cache; cache is updated for next time
 * 
 * This makes the calendar appear instantly with last-known data.
 */
export const useTasksQuery = (filter?: { status?: Task['status'] | 'all' }) => {
  const { user } = useAuth()
  const uid = user?.uid
  const queryClient = useQueryClient()
  const hasCachedRef = useRef(false)
  const queryKeyValue = [...key(uid), filter?.status ?? 'all']

  // Pre-populate from IndexedDB cache for instant display
  useEffect(() => {
    if (uid && !hasCachedRef.current) {
      hasCachedRef.current = true

      // Check if we already have data in React Query cache
      const existingData = queryClient.getQueryData(queryKeyValue)

      if (!existingData) {
        // Load from IndexedDB and set as initial data
        getCachedTasks().then((cached) => {
          if (cached.length > 0) {
            console.log(`[Cache] Instantly loaded ${cached.length} tasks from IndexedDB`)
            // Pre-populate React Query cache with IndexedDB data
            queryClient.setQueryData(queryKeyValue, cached)
          }
        }).catch(console.warn)
      }
    }
  }, [uid, queryClient, queryKeyValue])

  const result = useQuery({
    enabled: !!uid,
    queryKey: queryKeyValue,
    // Show stale data while revalidating (background sync)
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Task[]> => {
      if (!uid) return []
      const baseQuery =
        filter?.status && filter.status !== 'all'
          ? query(
            tasksCollection(uid),
            where('status', '==', filter.status),
          )
          : query(tasksCollection(uid))

      const snapshot = await getDocs(baseQuery)
      const tasks: Task[] = []
      for (const docSnap of snapshot.docs) {
        const rawData = docSnap.data()

        // Convert Firestore Timestamps to ISO strings for Zod validation
        const processedData = {
          ...rawData,
          createdAt: rawData.createdAt?.toDate?.()?.toISOString?.() ?? rawData.createdAt ?? new Date().toISOString(),
          updatedAt: rawData.updatedAt?.toDate?.()?.toISOString?.() ?? rawData.updatedAt ?? new Date().toISOString(),
        }

        const resultParse = taskSchema.safeParse({ id: docSnap.id, ...processedData })
        if (resultParse.success) {
          tasks.push(resultParse.data)
        } else {
          console.warn('Skipping invalid task document:', docSnap.id, resultParse.error.issues)
        }
      }

      // Sort client-side
      const sortedTasks = tasks.sort((a, b) => {
        const dateA = a.dueAt ?? a.scheduledEnd ?? '9999-12-31'
        const dateB = b.dueAt ?? b.scheduledEnd ?? '9999-12-31'
        return dateA > dateB ? 1 : -1
      })

      // Cache the fresh data for next time (don't await - fire and forget)
      cacheTasks(sortedTasks).catch(console.warn)
      console.log(`[Cache] Updated IndexedDB cache with ${sortedTasks.length} tasks from Firestore`)

      return sortedTasks
    },
  })

  return result
}

/**
 * Windowed event loading hook.
 * @param anchorDate - The center date for the view window (defaults to today)
 * 
 * Performance optimization: Only expands recurring events for a ±1 month window
 * around the anchor date, and filters out events outside that range.
 * This reduces the number of events from 5000+ to ~100-200.
 */
export const useTaskEvents = (anchorDate?: Date) => {
  const tasks = useTasksQuery()
  const anchor = anchorDate ?? new Date()

  // Window: 1 month before to 1 month after the anchor date
  // This keeps the data load manageable while ensuring smooth navigation
  const viewStart = startOfMonth(addMonths(anchor, -1))
  const viewEnd = endOfMonth(addMonths(anchor, 1))

  const allTasks = tasks.data ?? []

  // Filter tasks to only those that could appear in the view window
  // For recurring events, we check if the master event could produce instances in the window
  // For non-recurring events, we check if they fall within the window
  const tasksInWindow = useMemo(() => {
    return allTasks.filter((task) => {
      if (!task.scheduledStart || !task.scheduledEnd) return false

      const taskStart = new Date(task.scheduledStart)
      const taskEnd = new Date(task.scheduledEnd)

      // If it's a recurring event with no end date or end date after window start, include it
      if (task.recurrence) {
        const recurrenceEnd = task.recurrence.endDate ? new Date(task.recurrence.endDate) : null
        // Include if recurrence hasn't ended before our window starts
        // AND the original start is before our window ends (recurring events expand forward)
        if (recurrenceEnd && recurrenceEnd < viewStart) return false
        return true // Recurring events get filtered during expansion
      }

      // For non-recurring events, check if they overlap with the window
      return taskEnd >= viewStart && taskStart <= viewEnd
    })
  }, [allTasks, viewStart.getTime(), viewEnd.getTime()])

  // Expand recurring events only within the window
  const expandedTasks = useMemo(() => {
    return expandRecurringEvents(tasksInWindow, viewStart, viewEnd)
  }, [tasksInWindow, viewStart.getTime(), viewEnd.getTime()])

  const events: TaskEvent[] = useMemo(() => {
    return expandedTasks.map((task) => {
      const startStr = task.scheduledStart as string
      const endStr = task.scheduledEnd as string

      // Robust date parsing
      const isDateOnly = (str: string) => str.length === 10 && !str.includes('T') && !str.includes(':')

      let start: Date
      let end: Date

      if (task.isAllDay || (isDateOnly(startStr) && isDateOnly(endStr))) {
        // All-day event: start "2023-01-01", end "2023-01-02" (non-inclusive)
        // We want it to show on Jan 1st only.
        // Parse as local time to avoid UTC shift.
        start = new Date(startStr.split('T')[0] + 'T00:00:00')

        // Google's end date for all-day events is non-inclusive (the day AFTER).
        const endDateOnly = endStr.split('T')[0]
        if (endDateOnly === startStr.split('T')[0]) {
          // Same day case (though Google usually sends start+1 day)
          end = new Date(endDateOnly + 'T23:59:59')
        } else {
          // It's a multi-day event or standard GCal end (next day at midnight).
          // Subtract 1 second to keep it on the intended final day for UI.
          const endDateObj = new Date(endDateOnly + 'T00:00:00')
          endDateObj.setSeconds(endDateObj.getSeconds() - 1)
          end = endDateObj
        }
      } else {
        // Regular event: parse normally (handled correctly by JS Date for ISO strings)
        start = new Date(startStr)
        end = new Date(endStr)
      }

      // Safety check for Invalid Date
      if (isNaN(start.getTime())) start = new Date()
      if (isNaN(end.getTime())) end = new Date()

      return {
        id: task.id,
        title: task.title,
        start,
        end,
        allDay: task.isAllDay,
        resource: task,
      }
    })
  }, [expandedTasks])

  return { ...tasks, events }
}

type CreateTaskInput = {
  title: string
  status?: Task['status']
  dueAt?: string | null
  contactId?: string
  contactIds?: string[]
  notes?: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
  isAllDay?: boolean
  isBackup?: boolean
  isTask?: boolean
  color?: string | null
  sharedWith?: string[]
  address?: string
  location?: { lat: number; lng: number } | null
  recurrence?: Task['recurrence']
  recurringEventId?: string | null
  originalStart?: string | null
  isRecurringInstance?: boolean
  isModified?: boolean
  reminders?: number[]
  linkedGoals?: { contactId: string; goalId: string; subGoalId?: string }[]
}

export const useCreateTask = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTaskInput) => {
      if (!user) throw new Error('You must be signed in to create tasks')
      const now = nowIso()
      const docRef = await addDoc(
        tasksCollection(user.uid),
        pruneUndefined({
          ownerUid: user.uid,
          ...(payload.contactId ? { contactId: payload.contactId } : {}),
          title: payload.title,
          status: payload.status ?? 'todo',
          dueAt: payload.dueAt ?? payload.scheduledEnd ?? null,
          scheduledStart: payload.scheduledStart ?? null,
          scheduledEnd: payload.scheduledEnd ?? null,
          isAllDay: payload.isAllDay ?? false,
          isBackup: payload.isBackup ?? false,
          isTask: payload.isTask ?? false,
          color: payload.color ?? null,
          assignedTo: [user.uid],
          sharedWith: payload.sharedWith ?? [],
          address: payload.address,
          location: payload.location ?? null,
          notes: payload.notes,
          contactIds: payload.contactIds ?? [],
          recurrence: payload.recurrence ?? null,
          recurringEventId: payload.recurringEventId ?? null,
          originalStart: payload.originalStart ?? null,
          isRecurringInstance: payload.isRecurringInstance ?? false,
          isModified: payload.isModified ?? false,
          reminders: payload.reminders ?? [],
          linkedGoals: payload.linkedGoals ?? [],
          createdAt: now,
          updatedAt: now,
        }),
      )
      return docRef.id
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: key(user?.uid) })
      const previousTasks = queryClient.getQueriesData({
        queryKey: key(user?.uid),
      })

      const now = nowIso()
      const tempId = `temp-${Date.now()}`
      const optimisticTask: Task = {
        id: tempId,
        ownerUid: user?.uid ?? '',
        title: payload.title,
        status: payload.status ?? 'todo',
        dueAt: payload.dueAt ?? payload.scheduledEnd ?? null,
        scheduledStart: payload.scheduledStart ?? null,
        scheduledEnd: payload.scheduledEnd ?? null,
        isAllDay: payload.isAllDay ?? false,
        isBackup: payload.isBackup ?? false,
        isTask: payload.isTask ?? false,
        color: payload.color ?? null,
        assignedTo: [user?.uid ?? ''],
        sharedWith: payload.sharedWith ?? [],
        address: payload.address,
        location: payload.location ?? null,
        notes: payload.notes,
        contactIds: payload.contactIds ?? [],
        recurrence: payload.recurrence ?? null,
        recurringEventId: payload.recurringEventId ?? null,
        originalStart: payload.originalStart ?? null,
        isRecurringInstance: payload.isRecurringInstance ?? false,
        isModified: payload.isModified ?? false,
        reminders: payload.reminders ?? [],
        linkedGoals: payload.linkedGoals ?? [],
        createdAt: now,
        updatedAt: now,
      } as Task

      queryClient.setQueriesData(
        { queryKey: key(user?.uid) },
        (old: Task[] | undefined) => {
          return [...(old ?? []), optimisticTask]
        },
      )
      return { previousTasks }
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}

type UpdateTaskInput = {
  id: string
  data: Partial<
    Pick<
      Task,
      | 'title'
      | 'status'
      | 'dueAt'
      | 'scheduledStart'
      | 'scheduledEnd'
      | 'isAllDay'
      | 'isBackup'
      | 'isTask'
      | 'color'
      | 'notes'
      | 'sharedWith'
      | 'address'
      | 'location'
      | 'recurrence'
      | 'isModified'
      | 'contactId'
      | 'contactIds'
      | 'reminders'
      | 'linkedGoals'
    >
  >
}

export const useUpdateTask = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: UpdateTaskInput) => {
      if (!user) throw new Error('You must be signed in to update tasks')
      await updateDoc(taskDoc(user.uid, id), {
        ...data,
        updatedAt: nowIso(),
      })
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: key(user?.uid) })
      const previousTasks = queryClient.getQueriesData({
        queryKey: key(user?.uid),
      })
      queryClient.setQueriesData(
        { queryKey: key(user?.uid) },
        (old: Task[] | undefined) => {
          if (!old) return []
          return old.map((t) => (t.id === id ? { ...t, ...data } : t))
        },
      )
      return { previousTasks }
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}

export const useDeleteTask = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error('You must be signed in to delete tasks')
      await deleteDoc(taskDoc(user.uid, taskId))
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: key(user?.uid) })
      const previousTasks = queryClient.getQueriesData({
        queryKey: key(user?.uid),
      })
      queryClient.setQueriesData(
        { queryKey: key(user?.uid) },
        (old: Task[] | undefined) => {
          if (!old) return []
          return old.filter((t) => t.id !== taskId)
        },
      )
      return { previousTasks }
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}

export const useUpdateRecurringInstance = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  return useMutation({
    mutationFn: async ({ id, data, originalTask }: { id: string; data: UpdateTaskInput['data']; originalTask: Task }) => {
      if (!user) throw new Error('You must be signed in')

      // If it's a generated instance (not in DB yet), create it
      if (id.includes('-')) {
        // It's a virtual ID, create a new exception instance
        await createTask.mutateAsync({
          ...originalTask,
          ...data,
          recurringEventId: originalTask.recurringEventId || originalTask.id,
          originalStart: originalTask.scheduledStart,
          isRecurringInstance: true,
          isModified: true,
        })
      } else {
        // It's already an exception, just update it
        await updateTask.mutateAsync({
          id,
          data: {
            ...data,
            isModified: true,
          },
        })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}

export const useUpdateRecurringSeriesAll = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const updateTask = useUpdateTask()

  return useMutation({
    mutationFn: async ({ id, data, recurringEventId }: { id: string; data: UpdateTaskInput['data']; recurringEventId?: string | null }) => {
      if (!user) throw new Error('You must be signed in')

      const db = getFirebaseFirestore()
      const batch = writeBatch(db)

      // Update the parent event
      const parentId = recurringEventId || id

      // 1. Find all exception instances for this series
      const exceptionsQuery = query(
        tasksCollection(user.uid),
        where('recurringEventId', '==', parentId)
      )
      const exceptionsSnapshot = await getDocs(exceptionsQuery)

      // 2. Delete all exceptions so they don't override the new series data
      exceptionsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      // 3. Update the parent task with the new data
      const parentRef = taskDoc(user.uid, parentId)
      batch.update(parentRef, {
        ...data,
        updatedAt: nowIso(),
      })

      await batch.commit()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}

export const useUpdateRecurringSeriesFuture = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  return useMutation({
    mutationFn: async ({ data, originalTask, date }: { id: string; data: UpdateTaskInput['data']; originalTask: Task; date: Date }) => {
      if (!user) throw new Error('You must be signed in')

      const db = getFirebaseFirestore()
      const batch = writeBatch(db)

      const parentId = originalTask.recurringEventId || originalTask.id

      if (!parentId) throw new Error('Cannot split non-recurring task')

      console.log('[updateRecurringSeriesFuture] Starting split', { parentId, date, baseRecurrence })

      // 1. Find relevant exceptions (modifications) that fall AFTER the split date
      // We need to delete them because they belong to the "old" series logic but would
      // now technically fall under the "new" series time range, potentially causing duplicates or confusion.
      const exceptionsQuery = query(
        tasksCollection(user.uid),
        where('recurringEventId', '==', parentId)
      )
      const exceptionsSnapshot = await getDocs(exceptionsQuery)
      console.log('[updateRecurringSeriesFuture] Found exceptions', exceptionsSnapshot.size)

      // Filter and delete future exceptions
      exceptionsSnapshot.docs.forEach((doc) => {
        const exceptionData = doc.data()
        if (exceptionData.originalStart) {
          const exceptionDate = new Date(exceptionData.originalStart)
          // If exception is on or after the split date, delete it
          if (exceptionDate >= date) {
            console.log('[updateRecurringSeriesFuture] Deleting future exception', doc.id, exceptionData.originalStart)
            batch.delete(doc.ref)
          }
        }
      })

      // Get the recurrence rule.
      // CRITICAL FIX: Prefer data.recurrence (new rule) over originalTask.recurrence (old rule)
      // This allows users to change the recurrence pattern when splitting.
      const newRecurrence = data.recurrence || originalTask.recurrence

      if (!newRecurrence) {
        console.warn('No recurrence rule available for split')
        return
      }

      // 2. End the CURRENT series at the previous occurrence
      const prevEndDate = new Date(date)
      prevEndDate.setDate(prevEndDate.getDate() - 1)
      prevEndDate.setHours(23, 59, 59, 999)

      console.log('[updateRecurringSeriesFuture] Ending old series at', prevEndDate)

      // We only update the recurrence end date for the old parent
      // We DO NOT update other fields (title, etc) because that would change the PAST events too,
      // which we generally don't want when splitting "future" events.
      // However, if the user *expects* "this" event (the split point) to have new data,
      // that is handled by the NEW series starting at `date`.
      const parentRef = taskDoc(user.uid, parentId)
      batch.update(parentRef, {
        'recurrence.endDate': prevEndDate.toISOString(),
        updatedAt: nowIso(),
      })

      await batch.commit()
      console.log('[updateRecurringSeriesFuture] Batch committed')

      // 3. Create NEW series starting from this date
      // We calculate the duration to maintain the same event length
      const duration = new Date(originalTask.scheduledEnd!).getTime() - new Date(originalTask.scheduledStart!).getTime()
      const newStart = new Date(date)
      const newEnd = new Date(newStart.getTime() + duration)

      // Create the new parent task
      await createTask.mutateAsync({
        title: data.title ?? originalTask.title,
        status: data.status ?? originalTask.status,
        notes: data.notes ?? originalTask.notes,
        isAllDay: data.isAllDay ?? originalTask.isAllDay,
        isBackup: data.isBackup ?? originalTask.isBackup,
        isTask: data.isTask ?? originalTask.isTask,
        color: data.color ?? originalTask.color,
        contactId: originalTask.contactId, // Legacy
        contactIds: data.contactIds ?? originalTask.contactIds ?? [],
        linkedGoals: data.linkedGoals ?? originalTask.linkedGoals ?? [],
        reminders: data.reminders ?? originalTask.reminders ?? [],
        address: data.address ?? originalTask.address,
        location: data.location ?? originalTask.location,
        sharedWith: data.sharedWith ?? originalTask.sharedWith,

        scheduledStart: newStart.toISOString(),
        scheduledEnd: newEnd.toISOString(),
        dueAt: newEnd.toISOString(),
        recurrence: {
          frequency: newRecurrence.frequency,
          interval: newRecurrence.interval ?? 1,
          byDay: newRecurrence.byDay ?? undefined,
          byMonth: newRecurrence.byMonth ?? null,
          byMonthDay: newRecurrence.byMonthDay ?? null,
          endDate: newRecurrence.endDate || null,
          count: null,
        },
        recurringEventId: null, // New parent, no master ID
        isRecurringInstance: false,
        isModified: false,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}

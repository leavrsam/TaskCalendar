import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { taskSchema, type Task } from '@taskcalendar/core'

import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'
import { expandRecurringEvents } from '@/lib/recurrence'
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

export const useTasksQuery = (filter?: { status?: Task['status'] | 'all' }) => {
  const { user } = useAuth()
  const uid = user?.uid
  return useQuery({
    enabled: !!uid,
    queryKey: [...key(uid), filter?.status ?? 'all'],
    queryFn: async (): Promise<Task[]> => {
      if (!uid) return []
      const baseQuery =
        filter?.status && filter.status !== 'all'
          ? query(
            tasksCollection(uid),
            where('status', '==', filter.status),
            orderBy('dueAt', 'asc'),
          )
          : query(tasksCollection(uid), orderBy('dueAt', 'asc'))
      const snapshot = await getDocs(baseQuery)
      return snapshot.docs.map((docSnap) =>
        taskSchema.parse({ id: docSnap.id, ...docSnap.data() }),
      )
    },
  })
}

export const useTaskEvents = () => {
  const tasks = useTasksQuery()

  // Expand recurring events for current view +/- 2 months
  const viewStart = startOfMonth(addMonths(new Date(), -2))
  const viewEnd = endOfMonth(addMonths(new Date(), 2))

  const allTasks = tasks.data ?? []
  const tasksWithSchedule = allTasks.filter(
    (task) => task.scheduledStart && task.scheduledEnd,
  )

  // Expand recurring events
  const expandedTasks = expandRecurringEvents(tasksWithSchedule, viewStart, viewEnd)

  const events: TaskEvent[] = expandedTasks.map((task) => ({
    id: task.id,
    title: task.title,
    start: new Date(task.scheduledStart as string),
    end: new Date(task.scheduledEnd as string),
    allDay: task.isAllDay,
    resource: task,
  }))

  return { ...tasks, events }
}

type CreateTaskInput = {
  title: string
  status?: Task['status']
  priority?: Task['priority']
  dueAt?: string | null
  contactId?: string
  contactIds?: string[]
  notes?: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
  isAllDay?: boolean
  isBackup?: boolean
  color?: string | null
  sharedWith?: string[]
  address?: string
  location?: { lat: number; lng: number } | null
  recurrence?: Task['recurrence']
  recurringEventId?: string | null
  originalStart?: string | null
  isRecurringInstance?: boolean
  isModified?: boolean
}

export const useCreateTask = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTaskInput) => {
      if (!user) throw new Error('You must be signed in to create tasks')
      const now = nowIso()
      await addDoc(
        tasksCollection(user.uid),
        pruneUndefined({
          ownerUid: user.uid,
          ...(payload.contactId ? { contactId: payload.contactId } : {}),
          title: payload.title,
          status: payload.status ?? 'todo',
          priority: payload.priority ?? 'medium',
          dueAt: payload.dueAt ?? null,
          scheduledStart: payload.scheduledStart ?? null,
          scheduledEnd: payload.scheduledEnd ?? null,
          isAllDay: payload.isAllDay ?? false,
          isBackup: payload.isBackup ?? false,
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
          createdAt: now,
          updatedAt: now,
        }),
      )
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
      | 'priority'
      | 'dueAt'
      | 'scheduledStart'
      | 'scheduledEnd'
      | 'isAllDay'
      | 'isBackup'
      | 'color'
      | 'notes'
      | 'sharedWith'
      | 'address'
      | 'location'
      | 'recurrence'
      | 'isModified'
      | 'contactId'
      | 'contactIds'
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

      // Update the parent event
      const parentId = recurringEventId || id

      await updateTask.mutateAsync({
        id: parentId,
        data,
      })
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

      const parentId = originalTask.recurrence ? originalTask.id : originalTask.recurringEventId

      if (!parentId) throw new Error('Cannot split non-recurring task')

      // Get the recurrence rule - prefer from originalTask, fall back to data.recurrence
      const baseRecurrence = originalTask.recurrence || data.recurrence
      if (!baseRecurrence) {
        // If no recurrence available, we can't create a new series
        // Just update this instance instead
        console.warn('No recurrence rule available for split, updating instance only')
        await updateTask.mutateAsync({
          id: originalTask.id.includes('-') ? originalTask.id.split('-')[0] : originalTask.id,
          data,
        })
        return
      }

      // 1. End the current series at the previous occurrence
      const prevEndDate = new Date(date)
      prevEndDate.setDate(prevEndDate.getDate() - 1)
      prevEndDate.setHours(23, 59, 59, 999)

      // Update the parent to end the series
      await updateTask.mutateAsync({
        id: parentId,
        data: {
          recurrence: {
            ...baseRecurrence,
            endDate: prevEndDate.toISOString(),
          }
        }
      })

      // 2. Create new series starting from this date
      const duration = new Date(originalTask.scheduledEnd!).getTime() - new Date(originalTask.scheduledStart!).getTime()
      const newStart = new Date(date)
      const newEnd = new Date(newStart.getTime() + duration)

      await createTask.mutateAsync({
        title: data.title ?? originalTask.title,
        status: data.status ?? originalTask.status,
        priority: data.priority ?? originalTask.priority,
        notes: data.notes ?? originalTask.notes,
        isAllDay: data.isAllDay ?? originalTask.isAllDay,
        isBackup: data.isBackup ?? originalTask.isBackup,
        color: data.color ?? originalTask.color,
        contactId: originalTask.contactId ?? undefined,
        scheduledStart: newStart.toISOString(),
        scheduledEnd: newEnd.toISOString(),
        dueAt: newEnd.toISOString(),
        recurrence: {
          frequency: baseRecurrence.frequency,
          interval: baseRecurrence.interval ?? 1,
          byDay: baseRecurrence.byDay ?? null,
          byMonth: baseRecurrence.byMonth ?? null,
          byMonthDay: baseRecurrence.byMonthDay ?? null,
          endDate: baseRecurrence.endDate || null,
          count: null,
        },
        recurringEventId: null, // New parent
        isRecurringInstance: false,
        isModified: false,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}

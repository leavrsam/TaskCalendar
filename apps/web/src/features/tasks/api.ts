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

const key = (uid: string | undefined) => ['firestore', 'tasks', uid ?? 'anon']

export type TaskEvent = {
  id: string
  title: string
  start: Date
  end: Date
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
  const events: TaskEvent[] =
    tasks.data
      ?.filter(
        (task) => task.scheduledStart && task.scheduledEnd,
      )
      .map((task) => ({
        id: task.id,
        title: task.title,
        start: new Date(task.scheduledStart as string),
        end: new Date(task.scheduledEnd as string),
        resource: task,
      })) ?? []
  return { ...tasks, events }
}

type CreateTaskInput = {
  title: string
  status?: Task['status']
  priority?: Task['priority']
  dueAt?: string | null
  contactId?: string
  notes?: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
  sharedWith?: string[]
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
          assignedTo: [user.uid],
          sharedWith: payload.sharedWith ?? [],
          notes: payload.notes,
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
      | 'status'
      | 'priority'
      | 'dueAt'
      | 'scheduledStart'
      | 'scheduledEnd'
      | 'notes'
      | 'sharedWith'
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
    onSuccess: () => {
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}


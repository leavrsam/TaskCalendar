import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { goalSchema, type Goal } from '@taskcalendar/core'

import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'

const key = (uid: string | undefined) => ['firestore', 'goals', uid ?? 'anon']

const goalsCollection = (uid: string) =>
  collection(getFirebaseFirestore(), 'users', uid, 'goals')

const goalDoc = (uid: string, goalId: string) =>
  doc(getFirebaseFirestore(), 'users', uid, 'goals', goalId)

const nowIso = () => new Date().toISOString()

export const useGoalsQuery = () => {
  const { user } = useAuth()
  const uid = user?.uid
  return useQuery({
    enabled: !!uid,
    queryKey: key(uid),
    queryFn: async (): Promise<Goal[]> => {
      if (!uid) return []
      const snapshot = await getDocs(query(goalsCollection(uid), orderBy('periodEnd', 'asc')))
      return snapshot.docs.map((docSnap) =>
        goalSchema.parse({ id: docSnap.id, ...docSnap.data() }),
      )
    },
  })
}

type CreateGoalInput = {
  metric: Goal['metric']
  title: string
  target: number
  unit: string
  periodStart: string
  periodEnd: string
}

export const useCreateGoal = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateGoalInput) => {
      if (!user) throw new Error('You must be signed in to create goals')
      const now = nowIso()
      await addDoc(goalsCollection(user.uid), {
        ownerUid: user.uid,
        progress: 0,
        sharedWith: [],
        createdAt: now,
        updatedAt: now,
        ...payload,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => {})
    },
  })
}

type UpdateGoalInput = {
  id: string
  data: Partial<Pick<Goal, 'title' | 'target' | 'progress' | 'unit' | 'metric' | 'periodStart' | 'periodEnd'>>
}

export const useUpdateGoal = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: UpdateGoalInput) => {
      if (!user) throw new Error('You must be signed in to update goals')
      await updateDoc(goalDoc(user.uid, id), {
        ...data,
        updatedAt: nowIso(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => {})
    },
  })
}

export const useDeleteGoal = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (goalId: string) => {
      if (!user) throw new Error('You must be signed in to delete goals')
      await deleteDoc(goalDoc(user.uid, goalId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => {})
    },
  })
}


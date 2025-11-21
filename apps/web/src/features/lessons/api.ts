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

import { lessonSchema, type Lesson } from '@taskcalendar/core'

import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'

const key = (uid: string | undefined) => ['firestore', 'lessons', uid ?? 'anon']

const lessonsCollection = (uid: string) =>
  collection(getFirebaseFirestore(), 'users', uid, 'lessons')

export const useLessonsQuery = () => {
  const { user } = useAuth()
  const uid = user?.uid
  return useQuery({
    enabled: !!uid,
    queryKey: key(uid),
    queryFn: async (): Promise<Lesson[]> => {
      if (!uid) return []
      const snapshot = await getDocs(query(lessonsCollection(uid), orderBy('taughtAt', 'desc')))
      return snapshot.docs.map((docSnap) =>
        lessonSchema.parse({ id: docSnap.id, ...docSnap.data() }),
      )
    },
  })
}

const nowIso = () => new Date().toISOString()

const lessonDoc = (uid: string, lessonId: string) =>
  doc(getFirebaseFirestore(), 'users', uid, 'lessons', lessonId)

export const useCreateVisit = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<Lesson, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('You must be signed in to log visits')
      const now = nowIso()
      await addDoc(lessonsCollection(user.uid), {
        ownerUid: user.uid,
        createdAt: now,
        updatedAt: now,
        ...payload,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => { })
    },
  })
}

export const useUpdateVisit = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lesson> }) => {
      if (!user) throw new Error('You must be signed in to update visits')
      await updateDoc(lessonDoc(user.uid, id), {
        ...data,
        updatedAt: nowIso(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => { })
    },
  })
}

export const useDeleteVisit = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) throw new Error('You must be signed in to delete visits')
      await deleteDoc(lessonDoc(user.uid, lessonId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => { })
    },
  })
}


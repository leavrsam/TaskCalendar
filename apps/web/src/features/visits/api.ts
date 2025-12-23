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

import { getFirebaseFirestore } from '@/lib/firebase'
import { visitSchema, type Visit } from '@taskcalendar/core'
import { useAuth } from '@/hooks/use-auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const key = (uid: string | undefined) => ['firestore', 'visits', uid ?? 'anon']

const visitsCollection = (uid: string) =>
  collection(getFirebaseFirestore(), 'users', uid, 'lessons') // Keeping 'lessons' as the collection name

export const useVisitsQuery = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: key(user?.uid),
    enabled: !!user?.uid,
    queryFn: async (): Promise<Visit[]> => {
      const uid = user!.uid
      const snapshot = await getDocs(query(visitsCollection(uid), orderBy('visitedAt', 'desc')))
      return snapshot.docs.map((docSnap) =>
        visitSchema.parse({ id: docSnap.id, ...docSnap.data() }),
      )
    },
  })
}

const visitDoc = (uid: string, visitId: string) =>
  doc(getFirebaseFirestore(), 'users', uid, 'lessons', visitId)

export const useCreateVisit = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Visit, 'id' | 'createdAt' | 'updatedAt' | 'ownerUid'>) => {
      const now = new Date().toISOString()
      await addDoc(visitsCollection(user!.uid), {
        ...data,
        ownerUid: user!.uid,
        createdAt: now,
        updatedAt: now,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}

export const useUpdateVisit = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      visitId,
      data,
    }: {
      visitId: string
      data: Partial<Omit<Visit, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>>
    }) => {
      const uid = user!.uid
      await updateDoc(visitDoc(uid, visitId), {
        ...data,
        updatedAt: new Date().toISOString(),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}

export const useDeleteVisit = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (visitId: string) => {
      const uid = user!.uid
      await deleteDoc(visitDoc(uid, visitId))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
    },
  })
}

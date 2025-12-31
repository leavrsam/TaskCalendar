import {
    collection,
    doc,
    getDocs,
    query,
    orderBy,
    where,
    writeBatch
} from 'firebase/firestore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'

const key = (uid: string | undefined) => ['firestore', 'connected_calendars', uid ?? 'anon']

export type ConnectedCalendar = {
    id: string // email
    calendarEmail: string
    updatedAt: any
    // other internal fields (tokens etc), usually we don't need them in UI except email
}

const calendarsCollection = (uid: string) =>
    collection(getFirebaseFirestore(), 'users', uid, 'connected_calendars')

const calendarDoc = (uid: string, email: string) =>
    doc(getFirebaseFirestore(), 'users', uid, 'connected_calendars', email)

export const useConnectedCalendars = () => {
    const { user } = useAuth()
    const uid = user?.uid

    return useQuery({
        enabled: !!uid,
        queryKey: key(uid),
        queryFn: async (): Promise<ConnectedCalendar[]> => {
            if (!uid) return []
            const q = query(calendarsCollection(uid), orderBy('calendarEmail', 'asc')) // or updatedAt
            const snapshot = await getDocs(q)
            return snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data() as any
            }))
        },
    })
}


export const useDisconnectCalendar = () => {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (email: string) => {
            if (!user) throw new Error('Not authenticated')

            const db = getFirebaseFirestore()

            // 1. Delete all tasks associated with this calendar
            const tasksRef = collection(db, 'users', user.uid, 'tasks')
            const q = query(tasksRef, where('calendarEmail', '==', email))
            const snapshot = await getDocs(q)

            // Firestore batch limit is 500
            const CHUNK_SIZE = 400; // Safe margin
            let batch = writeBatch(db)
            let count = 0;

            for (const doc of snapshot.docs) {
                batch.delete(doc.ref)
                count++;
                if (count >= CHUNK_SIZE) {
                    await batch.commit()
                    batch = writeBatch(db)
                    count = 0
                }
            }

            // 2. Delete the connection doc (add to final batch)
            batch.delete(calendarDoc(user.uid, email))

            // Commit final remaining operations
            await batch.commit()
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
            void queryClient.invalidateQueries({ queryKey: ['firestore', 'tasks'] }) // Invalidate tasks too
        }
    })
}

export const useDeleteAllTasks = () => {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('Not authenticated')
            const db = getFirebaseFirestore()
            const tasksRef = collection(db, 'users', user.uid, 'tasks')
            const snapshot = await getDocs(tasksRef)

            const CHUNK_SIZE = 400
            let batch = writeBatch(db)
            let count = 0

            for (const doc of snapshot.docs) {
                batch.delete(doc.ref)
                count++
                if (count >= CHUNK_SIZE) {
                    await batch.commit()
                    batch = writeBatch(db)
                    count = 0
                }
            }
            await batch.commit()
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['firestore', 'tasks'] })
        }
    })
}

export const useSyncCalendars = () => {
    return useMutation({
        mutationFn: async () => {
            const { getFunctions, httpsCallable } = await import('firebase/functions')
            const { getApp } = await import('firebase/app')
            const functions = getFunctions(getApp())
            const triggerFullResync = httpsCallable(functions, 'triggerFullResync')
            const response = await triggerFullResync()
            return response.data as { success: boolean, message: string }
        }
    })
}

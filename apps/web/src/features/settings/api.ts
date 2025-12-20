import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
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
            // Optional: Logic to wipe events from this calendar?
            // For now, just remove the connection. The events remain as 'orphaned' or we can leave them.
            // User might want to keep them.
            await deleteDoc(calendarDoc(user.uid, email))
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: key(user?.uid) })
        }
    })
}

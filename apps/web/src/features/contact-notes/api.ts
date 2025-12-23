import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
} from 'firebase/firestore'

import { getFirebaseFirestore } from '@/lib/firebase'
import type { ContactNote } from '@taskcalendar/core'
import { useAuth } from '@/hooks/use-auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const COLLECTION = 'contactNotes'

const key = (uid: string | undefined, contactId: string) => ['firestore', 'contactNotes', uid ?? 'anon', contactId]

const notesCollection = (uid: string) =>
    collection(getFirebaseFirestore(), 'users', uid, COLLECTION)

const noteDoc = (uid: string, noteId: string) =>
    doc(getFirebaseFirestore(), 'users', uid, COLLECTION, noteId)

export const useContactNotesQuery = (contactId: string) => {
    const { user } = useAuth()
    return useQuery({
        queryKey: key(user?.uid, contactId),
        enabled: !!user?.uid && !!contactId,
        queryFn: async (): Promise<ContactNote[]> => {
            const uid = user!.uid
            const q = query(
                notesCollection(uid),
                where('contactId', '==', contactId)
            )
            const snapshot = await getDocs(q)
            const notes = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            } as ContactNote))
            // Sort client-side to avoid needing a composite Firestore index
            return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        },
    })
}

export const useCreateContactNote = () => {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: { contactId: string; content: string }) => {
            const uid = user!.uid
            const now = new Date().toISOString()
            const noteData = {
                ownerUid: uid,
                contactId: data.contactId,
                content: data.content,
                sharedWith: [],
                createdAt: now,
                updatedAt: now,
            }
            const docRef = await addDoc(notesCollection(uid), noteData)
            return { id: docRef.id, ...noteData }
        },
        onSuccess: (_, variables) => {
            void queryClient.invalidateQueries({ queryKey: key(user?.uid, variables.contactId) })
        },
    })
}

export const useDeleteContactNote = () => {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ noteId, contactId }: { noteId: string; contactId: string }) => {
            const uid = user!.uid
            await deleteDoc(noteDoc(uid, noteId))
            return { noteId, contactId }
        },
        onSuccess: (result) => {
            void queryClient.invalidateQueries({ queryKey: key(user?.uid, result.contactId) })
        },
    })
}

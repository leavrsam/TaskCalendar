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

import {
  contactSchema,
  CONTACT_STAGE_ORDER,
  type Contact,
  type ContactStage,
} from '@taskcalendar/core'

import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'

const key = (uid: string | undefined) => ['firestore', 'contacts', uid ?? 'anon']

const contactsCollection = (uid: string) =>
  collection(getFirebaseFirestore(), 'users', uid, 'contacts')

export const useContactsQuery = () => {
  const { user } = useAuth()
  const uid = user?.uid
  return useQuery({
    enabled: !!uid,
    queryKey: key(uid),
    queryFn: async (): Promise<Contact[]> => {
      if (!uid) return []
      const snapshot = await getDocs(query(contactsCollection(uid), orderBy('name', 'asc')))
      return snapshot.docs.map((docSnap) =>
        contactSchema.parse({ id: docSnap.id, ...docSnap.data() }),
      )
    },
  })
}

export const groupContactsByStage = (contacts: Contact[]) => {
  const stageMap: Record<ContactStage, Contact[]> = {
    new: [],
    teaching: [],
    progressing: [],
    member: [],
    dropped: [],
  }
  contacts.forEach((contact) => {
    stageMap[contact.stage].push(contact)
  })
  return CONTACT_STAGE_ORDER.map((stage) => ({
    stage,
    contacts: stageMap[stage],
  }))
}

const nowIso = () => new Date().toISOString()

const contactDoc = (uid: string, contactId: string) =>
  doc(getFirebaseFirestore(), 'users', uid, 'contacts', contactId)

const cleanPayload = <T extends Record<string, any>>(payload: T): T => {
  const clean = { ...payload }
  Object.keys(clean).forEach((key) => {
    if (clean[key] === undefined) {
      delete clean[key]
    }
  })
  return clean
}

export const useCreateContact = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<Contact, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('You must be signed in to create contacts')
      const now = nowIso()
      await addDoc(contactsCollection(user.uid), {
        ownerUid: user.uid,
        createdAt: now,
        updatedAt: now,
        ...cleanPayload(payload),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => { })
    },
  })
}

export const useUpdateContact = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      if (!user) throw new Error('You must be signed in to update contacts')
      await updateDoc(contactDoc(user.uid, id), {
        ...cleanPayload(data),
        updatedAt: nowIso(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => { })
    },
  })
}

export const useDeleteContact = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!user) throw new Error('You must be signed in to delete contacts')
      await deleteDoc(contactDoc(user.uid, contactId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => { })
    },
  })
}


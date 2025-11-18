import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { useQuery } from '@tanstack/react-query'

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


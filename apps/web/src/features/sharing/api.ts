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

import { inviteSchema, type WorkspaceInvite } from '@taskcalendar/core'

import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'

const key = (uid: string | undefined) => ['firestore', 'invites', uid ?? 'anon']

const invitesCollection = (uid: string) =>
  collection(getFirebaseFirestore(), 'users', uid, 'invites')

const inviteDoc = (uid: string, inviteId: string) =>
  doc(getFirebaseFirestore(), 'users', uid, 'invites', inviteId)

const nowIso = () => new Date().toISOString()

export const useInvitesQuery = () => {
  const { user } = useAuth()
  const uid = user?.uid
  return useQuery({
    enabled: !!uid,
    queryKey: key(uid),
    queryFn: async (): Promise<WorkspaceInvite[]> => {
      if (!uid) return []
      const snapshot = await getDocs(query(invitesCollection(uid), orderBy('createdAt', 'desc')))
      return snapshot.docs.map((docSnap) => inviteSchema.parse({ id: docSnap.id, ...docSnap.data() }))
    },
  })
}

type CreateInviteInput = {
  email: string
  role: WorkspaceInvite['role']
}

export const useCreateInvite = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, role }: CreateInviteInput) => {
      if (!user) throw new Error('You must be signed in to invite collaborators')
      const now = nowIso()
      await addDoc(invitesCollection(user.uid), {
        ownerUid: user.uid,
        email: email.trim().toLowerCase(),
        role,
        status: 'pending',
        createdAt: now,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => {})
    },
  })
}

export const useRevokeInvite = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!user) throw new Error('You must be signed in to manage invites')
      await deleteDoc(inviteDoc(user.uid, inviteId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => {})
    },
  })
}

export const useAcceptInvite = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!user) throw new Error('You must be signed in to accept invites')
      await updateDoc(inviteDoc(user.uid, inviteId), {
        status: 'accepted',
        respondedAt: nowIso(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(user?.uid) }).catch(() => {})
    },
  })
}


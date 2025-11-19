import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  inviteSchema,
  userProfileSchema,
  type WorkspaceInvite,
  type UserProfile,
} from '@taskcalendar/core'

import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'

const key = (uid: string | undefined) => ['firestore', 'invites', uid ?? 'anon']

const invitesCollection = (uid: string) =>
  collection(getFirebaseFirestore(), 'users', uid, 'invites')

const inviteDoc = (uid: string, inviteId: string) =>
  doc(getFirebaseFirestore(), 'users', uid, 'invites', inviteId)

const userProfileDoc = (uid: string) => doc(getFirebaseFirestore(), 'users', uid)

const workspaceCollections = ['contacts', 'lessons', 'tasks', 'contactNotes', 'goals'] as const

const nowIso = () => new Date().toISOString()

const shareWorkspaceCollections = async (ownerUid: string, collaboratorUid: string) => {
  const db = getFirebaseFirestore()
  await Promise.all(
    workspaceCollections.map(async (collectionName) => {
      const snapshot = await getDocs(collection(db, 'users', ownerUid, collectionName))
      await Promise.all(
        snapshot.docs.map((docSnap) =>
          updateDoc(docSnap.ref, {
            sharedWith: arrayUnion(collaboratorUid),
          }),
        ),
      )
    }),
  )
}

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

type AcceptInviteInput = {
  ownerUid: string
  inviteId: string
  collaboratorUid: string
}

export const useAcceptInvite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ownerUid, inviteId, collaboratorUid }: AcceptInviteInput) => {
      const ref = inviteDoc(ownerUid, inviteId)
      const snapshot = await getDoc(ref)
      if (!snapshot.exists()) throw new Error('Invite not found')
      const invite = inviteSchema.parse({ id: snapshot.id, ...snapshot.data() })
      if (invite.status !== 'pending') throw new Error('Invite already handled')
      await updateDoc(ref, {
        status: 'accepted',
        respondedAt: nowIso(),
        acceptedBy: collaboratorUid,
      })
      await shareWorkspaceCollections(ownerUid, collaboratorUid)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: key(variables.ownerUid) }).catch(() => {})
    },
  })
}

type DeclineInviteInput = {
  ownerUid: string
  inviteId: string
}

export const useDeclineInvite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ownerUid, inviteId }: DeclineInviteInput) => {
      const ref = inviteDoc(ownerUid, inviteId)
      const snapshot = await getDoc(ref)
      if (!snapshot.exists()) throw new Error('Invite not found')
      const invite = inviteSchema.parse({ id: snapshot.id, ...snapshot.data() })
      if (invite.status !== 'pending') throw new Error('Invite already handled')
      await updateDoc(ref, {
        status: 'declined',
        respondedAt: nowIso(),
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: key(variables.ownerUid) }).catch(() => {})
    },
  })
}

export const useInviteDetails = (ownerUid?: string | null, inviteId?: string | null) => {
  return useQuery({
    enabled: Boolean(ownerUid && inviteId),
    queryKey: ['firestore', 'invite', ownerUid, inviteId],
    queryFn: async (): Promise<WorkspaceInvite> => {
      if (!ownerUid || !inviteId) throw new Error('Missing invite data')
      const snapshot = await getDoc(inviteDoc(ownerUid, inviteId))
      if (!snapshot.exists()) {
        throw new Error('Invite not found')
      }
      return inviteSchema.parse({ id: snapshot.id, ...snapshot.data() })
    },
  })
}

export const useOwnerProfile = (ownerUid?: string | null) => {
  return useQuery({
    enabled: Boolean(ownerUid),
    queryKey: ['firestore', 'profile', ownerUid],
    queryFn: async (): Promise<UserProfile> => {
      if (!ownerUid) throw new Error('Missing owner id')
      const snapshot = await getDoc(userProfileDoc(ownerUid))
      if (!snapshot.exists()) {
        throw new Error('Workspace not found')
      }
      return userProfileSchema.parse(snapshot.data())
    },
  })
}


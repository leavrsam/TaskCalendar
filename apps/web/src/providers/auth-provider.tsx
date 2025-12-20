import type { PropsWithChildren } from 'react'
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
} from 'firebase/auth'

import { getFirebaseAuth, type AuthUser } from '@/lib/firebase'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  connectGoogleCalendar: () => Promise<string | undefined>
  createAccount: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const auth = getFirebaseAuth()
  const [user, setUser] = useState<AuthUser | null>(auth.currentUser)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next)
      setLoading(false)
    })
    return unsubscribe
  }, [auth])

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        await signInWithEmailAndPassword(auth, email, password)
      } finally {
        setLoading(false)
      }
    },
    [auth],
  )

  const signInWithGoogle = useCallback(async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } finally {
      setLoading(false)
    }
  }, [auth])

  const connectGoogleCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('https://www.googleapis.com/auth/calendar.events')

      let result
      if (auth.currentUser) {
        // If already logged in, try to link or re-auth
        try {
          result = await linkWithPopup(auth.currentUser, provider)
        } catch (error: any) {
          // If credential already exists or other error, fallback to re-auth popup which returns credentials
          // Note: This might switch account context if not careful, but usually safer for token retrieval
          if (error.code === 'auth/credential-already-in-use') {
            // The google account is already linked, so we just sign in with it to get fresh tokens
            result = await signInWithPopup(auth, provider)
          } else {
            throw error
          }
        }
      } else {
        result = await signInWithPopup(auth, provider)
      }

      const credential = GoogleAuthProvider.credentialFromResult(result)
      return credential?.accessToken
    } finally {
      setLoading(false)
    }
  }, [auth])

  const createAccount = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        await createUserWithEmailAndPassword(auth, email, password)
      } finally {
        setLoading(false)
      }
    },
    [auth],
  )

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [auth])

  const updateUserProfile = useCallback(
    async (data: { displayName?: string; photoURL?: string }) => {
      if (!auth.currentUser) throw new Error('No user logged in')
      setLoading(true)
      try {
        await updateProfile(auth.currentUser, data)
        // Force a user state update to reflect changes immediately
        setUser({ ...auth.currentUser, ...data })
      } finally {
        setLoading(false)
      }
    },
    [auth],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn,
      signInWithGoogle,
      connectGoogleCalendar, // Exposed
      createAccount,
      signOut,
      updateUserProfile,
    }),
    [user, loading, signIn, signInWithGoogle, connectGoogleCalendar, createAccount, signOut, updateUserProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


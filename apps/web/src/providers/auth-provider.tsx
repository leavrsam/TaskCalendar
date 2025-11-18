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
} from 'firebase/auth'

import { getFirebaseAuth, type AuthUser } from '@/lib/firebase'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  createAccount: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn,
      createAccount,
      signOut,
    }),
    [user, loading, signIn, createAccount, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


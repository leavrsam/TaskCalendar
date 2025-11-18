import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp | undefined
let auth: Auth | undefined
let firestore: Firestore | undefined

const useEmulators = import.meta.env.VITE_FIREBASE_EMULATORS === 'true'

export const getFirebaseApp = () => {
  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  return app
}

export const getFirebaseAuth = () => {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
    if (useEmulators) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9499', { disableWarnings: true })
    }
  }
  return auth
}

export const getFirebaseFirestore = () => {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp())
    if (useEmulators) {
      connectFirestoreEmulator(firestore, '127.0.0.1', 8499)
    }
  }
  return firestore
}

export type AuthUser = User


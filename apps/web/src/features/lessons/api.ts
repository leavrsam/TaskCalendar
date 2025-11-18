import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { useQuery } from '@tanstack/react-query'

import { lessonSchema, type Lesson } from '@taskcalendar/core'

import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'

const key = (uid: string | undefined) => ['firestore', 'lessons', uid ?? 'anon']

const lessonsCollection = (uid: string) =>
  collection(getFirebaseFirestore(), 'users', uid, 'lessons')

export const useLessonsQuery = () => {
  const { user } = useAuth()
  const uid = user?.uid
  return useQuery({
    enabled: !!uid,
    queryKey: key(uid),
    queryFn: async (): Promise<Lesson[]> => {
      if (!uid) return []
      const snapshot = await getDocs(query(lessonsCollection(uid), orderBy('taughtAt', 'desc')))
      return snapshot.docs.map((docSnap) =>
        lessonSchema.parse({ id: docSnap.id, ...docSnap.data() }),
      )
    },
  })
}


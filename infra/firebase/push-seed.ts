import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { previewSeed } from '@taskcalendar/core'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8499'
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_HOST

initializeApp({ projectId: 'preview' })
const db = getFirestore()

const seedPath = join(dirname(fileURLToPath(import.meta.url)), 'seed-data.json')
const raw = JSON.parse(readFileSync(seedPath, 'utf-8'))
const seed = previewSeed.parse(raw)

async function seedUser() {
  const users = await db.collection('users').listDocuments()
  await Promise.all(users.map((doc) => db.recursiveDelete(doc)))

  const userRef = db.collection('users').doc(seed.owner.id)
  await userRef.set({
    email: seed.owner.email,
    displayName: seed.owner.displayName,
    createdAt: seed.owner.createdAt,
  })

  const write = async (collection: string, data: Array<Record<string, unknown>>) => {
    await Promise.all(
      data.map((item) =>
        userRef.collection(collection).doc(item.id as string).set(item),
      ),
    )
  }

  await write('contacts', seed.contacts)
  await write('lessons', seed.lessons)
  await write('contactNotes', seed.contactNotes)
  await write('goals', seed.goals)
  await write('tasks', seed.tasks)
  await write('invites', seed.invites)

  console.log(`Seeded Firestore emulator at ${FIRESTORE_HOST}`)
}

seedUser().then(() => process.exit(0))



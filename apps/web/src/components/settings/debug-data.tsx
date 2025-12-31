
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs } from 'firebase/firestore'
import { getFirebaseFirestore } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { taskSchema } from '@taskcalendar/core'

export function DebugData() {
    const { user } = useAuth()
    const [showRaw, setShowRaw] = useState(false)

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['debug-data'],
        enabled: !!user,
        queryFn: async () => {
            if (!user) return []
            const db = getFirebaseFirestore()
            const snapshot = await getDocs(collection(db, 'users', user.uid, 'tasks'))

            const results = snapshot.docs.map(doc => {
                const raw = doc.data()

                // Convert Timestamps for validation
                const processed = {
                    ...raw,
                    createdAt: raw.createdAt?.toDate?.()?.toISOString?.() ?? raw.createdAt,
                    updatedAt: raw.updatedAt?.toDate?.()?.toISOString?.() ?? raw.updatedAt,
                }

                const validation = taskSchema.safeParse({ id: doc.id, ...processed })

                return {
                    id: doc.id,
                    raw,
                    isValid: validation.success,
                    errors: validation.success ? null : validation.error.issues,
                    recurrence: raw.recurrence
                }
            })
            return results
        }
    })

    if (!user) {
        return <div className="p-4 border rounded-lg bg-gray-100 dark:bg-gray-800 mt-4 text-xs">Debug: No User Found</div>
    }

    return (
        <div className="p-4 border rounded-lg bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 mt-4">
            <h3 className="font-bold text-orange-900 dark:text-orange-200">Debug Data Inspection</h3>
            <div className="mb-2">
                <button onClick={() => refetch()} className="text-sm underline mr-4 text-orange-800 dark:text-orange-300">Refresh</button>
                <button onClick={() => setShowRaw(!showRaw)} className="text-sm underline text-orange-800 dark:text-orange-300">Toggle Raw</button>
            </div>

            {isLoading && <div className="text-xs dark:text-gray-300">Loading...</div>}

            {data && (
                <div className="mt-2 space-y-2 text-xs font-mono dark:text-gray-300">
                    <div>Total Tasks Found: {data.length}</div>
                    <div className="text-green-700 dark:text-green-400">Valid: {data.filter(d => d.isValid).length}</div>
                    <div className="text-red-700 dark:text-red-400">Invalid: {data.filter(d => !d.isValid).length}</div>

                    <div className="mt-4">
                        <h4 className="font-bold">Invalid Items (First 5):</h4>
                        {data.filter(d => !d.isValid).slice(0, 5).map(item => (
                            <div key={item.id} className="border p-2 bg-white dark:bg-gray-800 dark:border-gray-700 rounded my-1">
                                <div>ID: {item.id}</div>
                                <div className="text-red-600 dark:text-red-400 font-bold">Errors:</div>
                                <pre className="whitespace-pre-wrap">{JSON.stringify(item.errors, null, 2)}</pre>
                                <div className="mt-1 font-bold">Raw Data:</div>
                                <pre className="whitespace-pre-wrap">{JSON.stringify(item.raw, null, 2)}</pre>
                            </div>
                        ))}
                    </div>

                    {showRaw && (
                        <div className="mt-4 border-t pt-2">
                            <h4 className="font-bold">All Recurring items:</h4>
                            {data.filter(d => d.recurrence).map(item => (
                                <div key={item.id} className="border-b py-1">
                                    <div>ID: {item.id}</div>
                                    <pre>{JSON.stringify(item.recurrence)}</pre>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

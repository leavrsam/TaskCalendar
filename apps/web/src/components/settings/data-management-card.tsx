import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useContactsQuery } from '@/features/contacts/api'
import { useLessonsQuery } from '@/features/lessons/api'
import { useTasksQuery } from '@/features/tasks/api'
import { useGoalsQuery } from '@/features/goals/api'

export function DataManagementCard() {
    const contactsQuery = useContactsQuery()
    const lessonsQuery = useLessonsQuery()
    const tasksQuery = useTasksQuery()
    const goalsQuery = useGoalsQuery()
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const data = {
                contacts: contactsQuery.data ?? [],
                lessons: lessonsQuery.data ?? [],
                tasks: tasksQuery.data ?? [],
                goals: goalsQuery.data ?? [],
                exportedAt: new Date().toISOString(),
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `natural-life-backup-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Export Data</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Download a copy of all your contacts, visits, tasks, and goals.
                </p>
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="mt-4 flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export JSON'}
                </button>
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
                <p className="mt-1 text-sm text-red-700">
                    Irreversible actions for your account and data.
                </p>
                <button
                    className="mt-4 flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50 ring-1 ring-inset ring-red-200"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                </button>
            </div>
        </div>
    )
}

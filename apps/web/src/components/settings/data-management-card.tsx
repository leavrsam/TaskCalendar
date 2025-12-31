import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DebugData } from './debug-data'

import { useContactsQuery } from '@/features/contacts/api'
import { useVisitsQuery } from '@/features/visits/api'
import { useTasksQuery } from '@/features/tasks/api'
import { useGoalsQuery } from '@/features/goals/api'
import { useDeleteAllTasks } from '@/features/settings/api'

export function DataManagementCard() {
    const contactsQuery = useContactsQuery()
    const visitsQuery = useVisitsQuery()
    const tasksQuery = useTasksQuery()
    const goalsQuery = useGoalsQuery()
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const data = {
                contacts: contactsQuery.data ?? [],
                visits: visitsQuery.data ?? [],
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
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Export Data</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Download a copy of all your contacts, visits, tasks, and goals.
                </p>
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="mt-4 flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export JSON'}
                </button>
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50 p-5">
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">Danger Zone</h2>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    Irreversible actions for your account and data.
                </p>
                <button
                    onClick={() => {
                        if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                            // TODO: Implement actual delete logic
                            alert('Account deletion is not yet implemented.')
                        }
                    }}
                    className="mt-4 flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 dark:border dark:border-red-900/50 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 ring-1 ring-inset ring-red-200 dark:ring-0"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                </button>
            </div>

            {/* Temporary Cleanup Tool */}
            <div className="rounded-2xl border border-orange-100 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900/50 p-5">
                <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-200">Cleanup Tools</h2>
                <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                    Use this if you have stuck events after disconnecting a calendar.
                </p>
                <ClearDataButton />
            </div>

            <DebugData />
        </div>
    )
}

import { AnimatedModal } from '../ui/animated-modal'

function ClearDataButton() {
    const { mutate: deleteAll, isPending } = useDeleteAllTasks()
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<1 | 2>(1)

    const handleOpen = () => {
        setStep(1)
        setIsOpen(true)
    }

    const handleDelete = () => {
        deleteAll()
        setIsOpen(false)
    }

    return (
        <>
            <button
                onClick={handleOpen}
                disabled={isPending}
                className="mt-4 flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 dark:border dark:border-orange-900/50 px-4 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 shadow-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 ring-1 ring-inset ring-orange-200 dark:ring-0 disabled:opacity-50"
            >
                <Trash2 className="h-4 w-4" />
                {isPending ? 'Deleting...' : 'Delete All Events'}
            </button>

            <AnimatedModal isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-orange-100 rounded-full dark:bg-orange-900/30">
                        <Trash2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>

                    <div className="mt-4 text-center">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {step === 1 ? 'Clear All Events?' : 'Are you absolutely sure?'}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {step === 1
                                ? 'This will remove all tasks and events from your local database and the connected Google Calendar. This action cannot be undone.'
                                : 'This is your final warning. All data will be permanently wiped.'
                            }
                        </p>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border rounded-lg border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => step === 1 ? setStep(2) : handleDelete()}
                            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500"
                        >
                            {step === 1 ? 'Yes, Continue' : 'Permanently Delete'}
                        </button>
                    </div>
                </div>
            </AnimatedModal>
        </>
    )
}

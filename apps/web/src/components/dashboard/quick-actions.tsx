import { Plus, UserPlus, CheckSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function QuickActions() {
    const navigate = useNavigate()

    return (
        <div className="grid grid-cols-3 gap-4">
            <button
                onClick={() => navigate('/lessons')}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:shadow-md"
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 transition-colors group-hover:bg-brand-200 dark:group-hover:bg-brand-900/50">
                    <Plus className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-brand-700 dark:group-hover:text-brand-400">Log Visit</span>
            </button>

            <button
                onClick={() => navigate('/contacts')}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:shadow-md"
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 transition-colors group-hover:bg-brand-200 dark:group-hover:bg-brand-900/50">
                    <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-brand-700 dark:group-hover:text-brand-400">Add Person</span>
            </button>

            <button
                onClick={() => navigate('/schedule')}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:shadow-md"
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 transition-colors group-hover:bg-brand-200 dark:group-hover:bg-brand-900/50">
                    <CheckSquare className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-brand-700 dark:group-hover:text-brand-400">Add Task</span>
            </button>
        </div>
    )
}

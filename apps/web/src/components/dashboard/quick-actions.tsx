import { Plus, UserPlus, CheckSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function QuickActions() {
    const navigate = useNavigate()

    return (
        <div className="grid grid-cols-3 gap-4">
            <button
                onClick={() => navigate('/lessons')}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50 hover:shadow-md"
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 transition-colors group-hover:bg-brand-200">
                    <Plus className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-brand-700">Log Visit</span>
            </button>

            <button
                onClick={() => navigate('/contacts')}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50 hover:shadow-md"
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 transition-colors group-hover:bg-violet-200">
                    <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-violet-700">Add Person</span>
            </button>

            <button
                onClick={() => navigate('/schedule')}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50 hover:shadow-md"
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-200">
                    <CheckSquare className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">Add Task</span>
            </button>
        </div>
    )
}

import { useNavigate } from 'react-router-dom'
import { Plus, Search, Calendar, User, MapPin } from 'lucide-react'
import {
  useVisitsQuery,
} from '@/features/visits/api'
import { VISIT_TYPE_LABELS } from '@taskcalendar/core'

export function VisitsRoute() {
  const navigate = useNavigate()
  const visitsQuery = useVisitsQuery()

  // For the UI, we'll call these Visits
  const visits = visitsQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Visits</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track and manage your interactions.</p>
        </div>
        <button
          onClick={() => navigate('/contacts')}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Log Visit
        </button>
      </div>

      <div className="grid gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search visits..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm transition focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50"
            />
          </div>
        </div>

        <div className="space-y-4">
          {visitsQuery.isLoading && (
            <div className="flex h-32 items-center justify-center text-slate-500">
              Loading visits...
            </div>
          )}

          {!visitsQuery.isLoading && visits.length === 0 && (
            <div className="flex h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <p className="text-slate-500">No visits logged yet.</p>
              <button
                onClick={() => navigate('/contacts')}
                className="mt-4 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Go to People to log a visit
              </button>
            </div>
          )}

          {!visitsQuery.isLoading &&
            visits.map((visit) => (
              <div
                key={visit.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-900"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                          {VISIT_TYPE_LABELS[visit.type]} Visit
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ID: {visit.contactId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {new Date(visit.visitedAt).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {visit.notes || 'No notes added'}
                      </div>
                    </div>

                    {visit.commitments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {visit.commitments.map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

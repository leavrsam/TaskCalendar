import { Link } from 'react-router-dom'

export function NotFoundRoute() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-400">404</p>
      <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-600">
        The view you’re looking for doesn’t exist yet. Pick another slice from the nav.
      </p>
      <Link
        to="/"
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Back to dashboard
      </Link>
    </div>
  )
}


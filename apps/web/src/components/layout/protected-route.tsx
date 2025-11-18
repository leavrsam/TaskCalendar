import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Checking credentials…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" replace state={{ from: location }} />
  }

  return <Outlet />
}


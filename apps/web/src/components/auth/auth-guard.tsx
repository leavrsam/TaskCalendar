import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'

type AuthGuardProps = {
    children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
                    Loading…
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/auth/sign-in" replace />
    }

    return <>{children}</>
}

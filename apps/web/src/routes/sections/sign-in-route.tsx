import { Link, Navigate } from 'react-router-dom'

import { AuthForm } from '@/components/auth/auth-form'
import { useAuth } from '@/hooks/use-auth'
import { AuthLayout } from '@/routes/sections/auth-route'

export function SignInRoute() {
  const { user, signIn, loading } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <AuthLayout
      title="Sign in to TaskCalendar"
      subtitle="Use your email and password to access your workspace."
      footer={
        <>
          Need an account?{' '}
          <Link to="/auth/create" className="font-semibold text-brand-600 hover:text-brand-700">
            Create one
          </Link>
        </>
      }
    >
      <AuthForm mode="signIn" loading={loading} onSubmit={(values) => signIn(values.email, values.password)} />
    </AuthLayout>
  )
}


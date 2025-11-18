import { Link, Navigate } from 'react-router-dom'

import { AuthForm } from '@/components/auth/auth-form'
import { useAuth } from '@/hooks/use-auth'
import { AuthLayout } from '@/routes/sections/auth-route'

export function CreateAccountRoute() {
  const { user, createAccount, loading } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <AuthLayout
      title="Create your TaskCalendar account"
      subtitle="Set up a personal workspace that you can share later."
      footer={
        <>
          Already registered?{' '}
          <Link to="/auth/sign-in" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm
        mode="create"
        loading={loading}
        onSubmit={(values) => createAccount(values.email, values.password)}
      />
    </AuthLayout>
  )
}

